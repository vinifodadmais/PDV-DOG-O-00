-- ============================================================================
-- FASE 3 — Baixa de estoque atômica (mesma transação da venda)
-- ============================================================================
-- Substitui a função `finalize_sale` (CREATE OR REPLACE — mesma
-- assinatura, mesmos parâmetros, mesmo retorno). Nenhuma tabela nova,
-- nenhuma coluna nova, nenhuma constraint nova nesta etapa.
--
-- MUDANÇA DE SEGURANÇA IMPORTANTE (explicada na conversa antes deste
-- SQL): a função passa a ser SECURITY DEFINER, porque dar UPDATE em
-- `products.stock_current` é bloqueado pelo RLS pra quem não é admin
-- (policy `products_write_admin`), e um operador comum PRECISA
-- conseguir finalizar uma venda com baixa de estoque. Pra não virar um
-- bypass genérico, a função:
--   1. Confere explicitamente `is_active_staff()` logo no início —
--      repõe manualmente a mesma trava que o RLS dava de graça em modo
--      INVOKER.
--   2. Só grava exatamente o que o próprio código da função decide
--      (user_id = auth.uid(), reason = 'venda', sale_id da venda que
--      acabou de criar) — o chamador nunca controla o que é gravado
--      além de product_id/quantity/note/pagamentos/desconto.
--   3. `grant execute` continua só para `authenticated`.
--
-- COMO EXECUTAR: SQL Editor do Supabase → colar este arquivo inteiro →
-- Run. Seguro rodar mais de uma vez.
-- ============================================================================

create or replace function public.finalize_sale(
  p_client_request_id uuid,
  p_consumption_type text,
  p_discount numeric,
  p_notes text,
  p_items jsonb,     -- [{product_id, quantity, note}]
  p_payments jsonb   -- [{payment_method, amount, change_amount}]
)
returns table (
  sale_id uuid,
  order_number integer,
  status text,
  created_at timestamptz,
  subtotal numeric,
  discount numeric,
  total numeric,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_order_number integer;
  v_status text;
  v_created_at timestamptz;
  v_item jsonb;
  v_payment jsonb;
  v_product record;
  v_quantity numeric;
  v_item_subtotal numeric;
  v_subtotal numeric := 0;
  v_discount numeric;
  v_total numeric;
  v_paid_total numeric := 0;
  v_amount numeric;
  v_change numeric;
  v_resolved_items jsonb := '[]'::jsonb;
  v_stock_updates jsonb := '[]'::jsonb;
  v_items_result jsonb;
  v_already_taken numeric;
  v_new_stock numeric;
begin
  -- Repõe a checagem que o RLS fazia de graça em modo INVOKER — só
  -- funcionário ativo (admin ou operator) pode executar esta função.
  if not public.is_active_staff() then
    raise exception 'Acesso negado: usuário não autenticado ou inativo.';
  end if;

  -- IDEMPOTÊNCIA: mesma requisição de novo -> devolve a venda já
  -- existente. Nada de estoque é tocado aqui — a baixa já aconteceu na
  -- primeira chamada, dentro da mesma transação que criou a venda.
  if p_client_request_id is not null then
    select s.id, s.order_number, s.status, s.created_at, s.subtotal, s.discount, s.total
      into v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total
      from public.sales s
      where s.client_request_id = p_client_request_id;

    if found then
      select coalesce(jsonb_agg(jsonb_build_object(
               'product_id', si.product_id,
               'product_name', si.product_name,
               'unit_price', si.unit_price,
               'quantity', si.quantity,
               'note', si.note,
               'subtotal', si.subtotal
             )), '[]'::jsonb)
        into v_items_result
        from public.sale_items si
        where si.sale_id = v_sale_id;

      return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total, v_items_result;
      return;
    end if;
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A venda precisa ter pelo menos um item.';
  end if;
  if p_payments is null or jsonb_array_length(p_payments) = 0 then
    raise exception 'A venda precisa ter pelo menos uma forma de pagamento.';
  end if;

  -- ITENS: preço oficial + validação de estoque, tudo ANTES de gravar
  -- qualquer coisa (se qualquer item falhar, nada foi escrito ainda).
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida para um dos itens.';
    end if;
    if v_quantity != trunc(v_quantity) then
      raise exception 'Quantidade deve ser um número inteiro.';
    end if;

    -- SELECT ... FOR UPDATE: tranca a linha do produto até o fim da
    -- transação. Impede que duas vendas concorrentes do mesmo produto
    -- leiam o mesmo saldo "antigo" e as duas achem que têm estoque
    -- suficiente (condição de corrida clássica de venda em dobro).
    select id, name, price, active, stock_current into v_product
      from public.products
      where id = (v_item->>'product_id')::uuid
      for update;

    if not found then
      raise exception 'Produto % não encontrado.', v_item->>'product_id';
    end if;
    if not v_product.active then
      raise exception 'Produto "%" está inativo e não pode ser vendido.', v_product.name;
    end if;

    -- Defensivo: soma qualquer quantidade do MESMO produto já
    -- processada nesta mesma chamada (ex: duas linhas pro mesmo
    -- produto), pra não validar cada linha contra o mesmo saldo sem
    -- descontar a outra.
    select coalesce(sum((su->>'quantity')::numeric), 0) into v_already_taken
      from jsonb_array_elements(v_stock_updates) as su
      where (su->>'product_id')::uuid = v_product.id;

    if v_product.stock_current < (v_quantity + v_already_taken) then
      raise exception 'Estoque insuficiente para "%": disponível %, solicitado %.',
        v_product.name, v_product.stock_current, (v_quantity + v_already_taken);
    end if;

    v_new_stock := v_product.stock_current - v_quantity - v_already_taken;
    v_item_subtotal := round(v_product.price * v_quantity, 2);
    v_subtotal := v_subtotal + v_item_subtotal;

    v_resolved_items := v_resolved_items || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'unit_price', v_product.price,
      'quantity', v_quantity,
      'note', v_item->>'note',
      'subtotal', v_item_subtotal
    );
    v_stock_updates := v_stock_updates || jsonb_build_object(
      'product_id', v_product.id,
      'quantity', v_quantity,
      'new_stock', v_new_stock
    );
  end loop;

  v_discount := round(greatest(0, least(coalesce(p_discount, 0), v_subtotal)), 2);
  v_total := round(v_subtotal - v_discount, 2);

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    v_amount := (v_payment->>'amount')::numeric;
    v_change := nullif(v_payment->>'change_amount', '')::numeric;

    if v_amount is null or v_amount < 0 then
      raise exception 'Valor de pagamento inválido.';
    end if;
    if v_change is not null and (v_change < 0 or v_change > v_amount) then
      raise exception 'Troco inválido para um dos pagamentos.';
    end if;

    v_paid_total := v_paid_total + (v_amount - coalesce(v_change, 0));
  end loop;

  if v_paid_total < v_total then
    raise exception 'Pagamento insuficiente: recebido %, total %.', v_paid_total, v_total;
  end if;

  -- A partir daqui, tudo já validado — só gravar. sales -> sale_items
  -- -> baixa de estoque + stock_movements -> payments, na mesma
  -- transação implícita da função (qualquer erro daqui pra frente
  -- desfaz TUDO, incluindo a venda que acabou de ser inserida).
  insert into public.sales (client_request_id, status, consumption_type, subtotal, discount, total, notes, user_id)
  values (p_client_request_id, 'recebido', p_consumption_type, v_subtotal, v_discount, v_total, p_notes, auth.uid())
  returning id, order_number, status, created_at into v_sale_id, v_order_number, v_status, v_created_at;

  insert into public.sale_items (sale_id, product_id, product_name, unit_price, quantity, note, subtotal)
  select
    v_sale_id,
    (elem->>'product_id')::uuid,
    elem->>'product_name',
    (elem->>'unit_price')::numeric,
    (elem->>'quantity')::numeric,
    elem->>'note',
    (elem->>'subtotal')::numeric
  from jsonb_array_elements(v_resolved_items) as elem;

  -- Baixa de estoque + stock_movements (uma linha por item), na MESMA
  -- transação da venda — nunca existe venda confirmada sem baixa.
  for v_item in select * from jsonb_array_elements(v_stock_updates) loop
    update public.products
      set stock_current = (v_item->>'new_stock')::numeric
      where id = (v_item->>'product_id')::uuid;

    insert into public.stock_movements (product_id, type, reason, quantity, sale_id, note)
    values (
      (v_item->>'product_id')::uuid,
      'saida',
      'venda',
      (v_item->>'quantity')::numeric,
      v_sale_id,
      null
    );
  end loop;

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    insert into public.payments (sale_id, payment_method, amount, change_amount)
    values (
      v_sale_id,
      v_payment->>'payment_method',
      (v_payment->>'amount')::numeric,
      nullif(v_payment->>'change_amount', '')::numeric
    );
  end loop;

  return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total, v_resolved_items;
end;
$$;

grant execute on function public.finalize_sale(uuid, text, numeric, text, jsonb, jsonb) to authenticated;
