-- ============================================================================
-- FASE 4 — PATCH: corrige "column reference is ambiguous"
-- ============================================================================
-- Este arquivo SUBSTITUI o `finalize_sale` da Fase 4 (mesmo
-- `CREATE OR REPLACE`, nenhuma tabela/coluna nova, nenhuma trava de
-- segurança removida). É só este arquivo que você precisa rodar agora
-- — não precisa reexecutar os SQLs anteriores.
--
-- CAUSA DO ERRO: a função tem `RETURNS TABLE (sale_id, order_number,
-- status, created_at, subtotal, discount, total, items)`. Cada um
-- desses nomes vira, internamente, uma variável de saída acessível em
-- qualquer lugar do corpo da função. Quando uma consulta SQL dentro da
-- função usa um desses MESMOS nomes sem qualificar com o alias da
-- tabela, o Postgres não sabe se você quer dizer "a coluna da tabela"
-- ou "a variável de saída da função" — e recusa com "ambiguous".
--
-- ONDE ISSO ACONTECIA:
--   1. `where status = 'aberta'` (cash_sessions) — o erro que você
--      encontrou de verdade, testando.
--   2. `returning id, order_number, status, created_at` (sales) — um
--      segundo caso, que ainda não tinha aparecido porque a execução
--      sempre parava antes, no primeiro erro. Corrigido preventivamente
--      agora, senão apareceria na tentativa seguinte.
--
-- Todo o resto da função já usava alias corretamente (`s.`, `si.`) e
-- não precisou de nenhuma mudança — revisei linha por linha contra os
-- 8 nomes do RETURNS TABLE (sale_id, order_number, status, created_at,
-- subtotal, discount, total, items) e não sobrou nenhuma outra colisão.
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
  v_cash_session_id uuid;
  v_net_amount numeric;
begin
  if not public.is_active_staff() then
    raise exception 'Acesso negado: usuário não autenticado ou inativo.';
  end if;

  -- IDEMPOTÊNCIA: mesma requisição de novo -> devolve a venda já
  -- existente. Nem estoque nem caixa são tocados de novo.
  -- (já usava alias "s." corretamente — sem mudança aqui)
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

  -- CAIXA: precisa haver exatamente uma sessão aberta. FOR UPDATE
  -- tranca essa linha até o fim da transação.
  -- >>> CORREÇÃO: alias "cs." explícito em cash_sessions (era a causa
  -- do erro "column reference status is ambiguous"). <<<
  select cs.id into v_cash_session_id
    from public.cash_sessions cs
    where cs.status = 'aberta'
    for update;

  if v_cash_session_id is null then
    raise exception 'Nenhum caixa aberto. Abra o caixa antes de finalizar uma venda.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'A venda precisa ter pelo menos um item.';
  end if;
  if p_payments is null or jsonb_array_length(p_payments) = 0 then
    raise exception 'A venda precisa ter pelo menos uma forma de pagamento.';
  end if;

  -- ITENS: preço oficial + validação de estoque (sem mudança).
  -- (products.id/name/price/active/stock_current não colidem com
  -- nenhum nome do RETURNS TABLE — revisado, não precisa de alias).
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida para um dos itens.';
    end if;
    if v_quantity != trunc(v_quantity) then
      raise exception 'Quantidade deve ser um número inteiro.';
    end if;

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

  -- PAGAMENTOS: valida (sem mudança).
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

  -- Tudo validado — grava. sales -> sale_items -> baixa de estoque +
  -- stock_movements -> CAIXA -> payments, na mesma transação.
  -- >>> CORREÇÃO: alias "sale" na tabela de destino do INSERT, pra
  -- poder qualificar "sale.id/order_number/status/created_at" no
  -- RETURNING (mesma classe do bug do cash_sessions, aqui na tabela
  -- sales — "status"/"created_at"/"order_number" também colidem com o
  -- RETURNS TABLE). <<<
  insert into public.sales as sale (client_request_id, status, consumption_type, subtotal, discount, total, notes, user_id)
  values (p_client_request_id, 'recebido', p_consumption_type, v_subtotal, v_discount, v_total, p_notes, auth.uid())
  returning sale.id, sale.order_number, sale.status, sale.created_at into v_sale_id, v_order_number, v_status, v_created_at;

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

  -- CAIXA: uma movimentação de entrada por forma de pagamento, com o
  -- valor LÍQUIDO (descontado o troco).
  for v_payment in select * from jsonb_array_elements(p_payments) loop
    v_amount := (v_payment->>'amount')::numeric;
    v_change := coalesce(nullif(v_payment->>'change_amount', '')::numeric, 0);
    v_net_amount := v_amount - v_change;

    insert into public.cash_movements (cash_session_id, type, origin, amount, payment_method, sale_id)
    values (
      v_cash_session_id,
      'entrada',
      'venda',
      v_net_amount,
      v_payment->>'payment_method',
      v_sale_id
    );

    insert into public.payments (sale_id, payment_method, amount, change_amount)
    values (
      v_sale_id,
      v_payment->>'payment_method',
      v_amount,
      nullif(v_payment->>'change_amount', '')::numeric
    );
  end loop;

  return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total, v_resolved_items;
end;
$$;

grant execute on function public.finalize_sale(uuid, text, numeric, text, jsonb, jsonb) to authenticated;
