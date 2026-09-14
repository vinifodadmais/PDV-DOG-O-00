-- ============================================================================
-- FASE 7 — Status de pagamento (Pago/Não pago) + opção de consumo local
-- (Comer aqui/Levar), independentes de `consumption_type` (balcão/viagem/
-- entrega), que não muda nesta fase.
-- ============================================================================
-- Aditivo: 2 colunas novas em `sales`, com default e NOT NULL — vendas
-- antigas (as 308 já existentes) recebem 'pago' + 'levar' automaticamente
-- via DEFAULT no ALTER TABLE (comportamento seguro do Postgres: o valor
-- default é aplicado a todas as linhas existentes na hora do ALTER),
-- nenhum dado histórico é apagado ou reinterpretado manualmente.
-- ============================================================================

alter table public.sales add column if not exists payment_status text not null default 'pago'
  check (payment_status in ('pago', 'nao_pago'));

alter table public.sales add column if not exists dining_option text not null default 'levar'
  check (dining_option in ('comer_aqui', 'levar'));

comment on column public.sales.payment_status is
  'Status de pagamento do pedido no momento da finalização: pago | nao_pago (fiado/pendente). Independente da tabela payments, que registra transações reais.';
comment on column public.sales.dining_option is
  'Onde o cliente vai consumir: comer_aqui | levar. Independente de consumption_type (balcão/viagem/entrega).';

-- A assinatura da função MUDA (2 parâmetros novos no final) — DROP
-- explícito antes do CREATE, mesmo padrão da fase 6, pra evitar overload
-- antigo de 8 parâmetros coexistindo com o novo de 10.
drop function if exists public.finalize_sale(uuid, text, numeric, text, jsonb, jsonb, text, numeric);

-- ============================================================================
-- finalize_sale — agora recebe também status de pagamento e opção de
-- consumo local.
--
-- p_payment_status (default 'pago'): quando 'nao_pago', a venda é
-- registrada normalmente (itens, baixa de estoque) MAS:
--   - não exige pagamento algum (pula a checagem de "pelo menos um
--     pagamento" e a de "pago >= total");
--   - IGNORA qualquer conteúdo de p_payments — nenhuma linha é gravada em
--     `payments` nem em `cash_movements` (nenhum dinheiro entrou de
--     verdade no caixa, então nenhum lançamento de caixa é criado).
-- Quando 'pago' (padrão, comportamento 100% igual ao de antes desta
-- fase), nada muda: pagamento continua obrigatório e suficiente.
--
-- p_dining_option (default 'levar'): só um dado descritivo — não afeta
-- nenhuma regra de estoque/caixa/preço.
-- ============================================================================
create or replace function public.finalize_sale(
  p_client_request_id uuid,
  p_consumption_type text,
  p_discount numeric,
  p_notes text,
  p_items jsonb,
  p_payments jsonb,
  p_customer_name text default null,
  p_delivery_fee numeric default 0,
  p_payment_status text default 'pago',
  p_dining_option text default 'levar'
)
returns table (
  sale_id uuid,
  order_number integer,
  status text,
  created_at timestamptz,
  subtotal numeric,
  discount numeric,
  total numeric,
  items jsonb,
  customer_name text,
  delivery_fee numeric,
  payment_status text,
  dining_option text
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
  v_adicional jsonb;
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
  v_resolved_adicionais jsonb;
  v_stock_updates jsonb := '[]'::jsonb;
  v_items_result jsonb;
  v_already_taken numeric;
  v_new_stock numeric;
  v_cash_session_id uuid;
  v_net_amount numeric;
  v_parent_sale_item_id uuid;
  v_produto_principal_id uuid;
  v_produto_principal_nome text;
  v_produto_principal_preco numeric;
  v_produto_principal_subtotal numeric;
  v_customer_name text;
  v_delivery_fee numeric;
  v_payment_status text;
  v_dining_option text;
begin
  if not public.is_active_staff() then
    raise exception 'Acesso negado: usuário não autenticado ou inativo.';
  end if;

  -- IDEMPOTÊNCIA: mesma requisição de novo -> devolve a venda já
  -- existente, agora incluindo payment_status/dining_option no retorno.
  if p_client_request_id is not null then
    select s.id, s.order_number, s.status, s.created_at, s.subtotal, s.discount, s.total,
           s.customer_name, s.delivery_fee, s.payment_status, s.dining_option
      into v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total,
           v_customer_name, v_delivery_fee, v_payment_status, v_dining_option
      from public.sales s
      where s.client_request_id = p_client_request_id;

    if found then
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', si.id,
               'product_id', si.product_id,
               'product_name', si.product_name,
               'unit_price', si.unit_price,
               'quantity', si.quantity,
               'note', si.note,
               'subtotal', si.subtotal,
               'parent_sale_item_id', si.parent_sale_item_id
             )), '[]'::jsonb)
        into v_items_result
        from public.sale_items si
        where si.sale_id = v_sale_id;

      return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount,
        v_total, v_items_result, v_customer_name, v_delivery_fee, v_payment_status, v_dining_option;
      return;
    end if;
  end if;

  -- Validação dos dois novos campos — falha alto e claro em vez de
  -- deixar um valor inesperado entrar silenciosamente no banco.
  v_payment_status := coalesce(p_payment_status, 'pago');
  if v_payment_status not in ('pago', 'nao_pago') then
    raise exception 'Status de pagamento inválido: %.', v_payment_status;
  end if;

  v_dining_option := coalesce(p_dining_option, 'levar');
  if v_dining_option not in ('comer_aqui', 'levar') then
    raise exception 'Opção de consumo inválida: %.', v_dining_option;
  end if;

  -- CAIXA (sem mudança de lógica — mesmo vendas "não pagas" precisam de
  -- caixa aberto, já que continuam sendo um pedido operacional normal).
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

  -- Pagamento só é exigido quando payment_status = 'pago' (comportamento
  -- idêntico ao de antes desta fase). Quando 'nao_pago', p_payments é
  -- ignorado por completo mais abaixo — nenhuma linha de payments/
  -- cash_movements é criada.
  if v_payment_status = 'pago' and (p_payments is null or jsonb_array_length(p_payments) = 0) then
    raise exception 'A venda precisa ter pelo menos uma forma de pagamento.';
  end if;

  -- Cliente: texto livre, opcional — string vazia vira NULL (mesmo
  -- tratamento de "campo não informado" usado em outros textos do sistema).
  v_customer_name := nullif(trim(p_customer_name), '');

  -- Taxa de entrega: nunca negativa, e só é cobrada de verdade se o
  -- pedido for realmente do tipo 'entrega' — protege contra o frontend
  -- mandar uma taxa "esquecida" numa venda de balcão/viagem.
  v_delivery_fee := coalesce(p_delivery_fee, 0);
  if v_delivery_fee < 0 then
    raise exception 'Taxa de entrega não pode ser negativa.';
  end if;
  if p_consumption_type is distinct from 'entrega' then
    v_delivery_fee := 0;
  end if;

  -- Validação de FORMATO dos pagamentos (valor/troco) — só roda quando o
  -- pagamento é exigido (payment_status = 'pago'). Numa venda 'nao_pago'
  -- não validamos nem usamos p_payments, mesmo que o frontend mande algo.
  if v_payment_status = 'pago' then
    for v_payment in select * from jsonb_array_elements(p_payments) loop
      v_amount := (v_payment->>'amount')::numeric;
      v_change := nullif(v_payment->>'change_amount', '')::numeric;
      if v_amount is null or v_amount < 0 then
        raise exception 'Valor de pagamento inválido.';
      end if;
      if v_change is not null and (v_change < 0 or v_change > v_amount) then
        raise exception 'Troco inválido para um dos pagamentos.';
      end if;
    end loop;
  end if;

  -- 1ª PASSADA: valida e resolve itens + adicionais (preço oficial,
  -- estoque, subtotal) — nada é gravado ainda. (sem mudança nesta parte;
  -- estoque baixa igual para vendas pagas e não pagas — o produto saiu
  -- fisicamente nos dois casos.)
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

    v_stock_updates := v_stock_updates || jsonb_build_object(
      'product_id', v_product.id, 'quantity', v_quantity, 'new_stock', v_new_stock
    );

    v_produto_principal_id := v_product.id;
    v_produto_principal_nome := v_product.name;
    v_produto_principal_preco := v_product.price;
    v_produto_principal_subtotal := v_item_subtotal;

    v_resolved_adicionais := '[]'::jsonb;
    for v_adicional in select * from jsonb_array_elements(coalesce(v_item->'adicionais', '[]'::jsonb)) loop
      v_quantity := (v_adicional->>'quantity')::numeric;
      if v_quantity is null or v_quantity <= 0 then
        raise exception 'Quantidade inválida para um dos adicionais.';
      end if;
      if v_quantity != trunc(v_quantity) then
        raise exception 'Quantidade de adicional deve ser um número inteiro.';
      end if;

      select id, name, price, active, stock_current into v_product
        from public.products
        where id = (v_adicional->>'product_id')::uuid
        for update;

      if not found then
        raise exception 'Adicional % não encontrado.', v_adicional->>'product_id';
      end if;
      if not v_product.active then
        raise exception 'Adicional "%" está inativo e não pode ser vendido.', v_product.name;
      end if;

      select coalesce(sum((su->>'quantity')::numeric), 0) into v_already_taken
        from jsonb_array_elements(v_stock_updates) as su
        where (su->>'product_id')::uuid = v_product.id;

      if v_product.stock_current < (v_quantity + v_already_taken) then
        raise exception 'Estoque insuficiente para o adicional "%": disponível %, solicitado %.',
          v_product.name, v_product.stock_current, (v_quantity + v_already_taken);
      end if;

      v_new_stock := v_product.stock_current - v_quantity - v_already_taken;
      v_item_subtotal := round(v_product.price * v_quantity, 2);
      v_subtotal := v_subtotal + v_item_subtotal;

      v_stock_updates := v_stock_updates || jsonb_build_object(
        'product_id', v_product.id, 'quantity', v_quantity, 'new_stock', v_new_stock
      );
      v_resolved_adicionais := v_resolved_adicionais || jsonb_build_object(
        'product_id', v_product.id,
        'product_name', v_product.name,
        'unit_price', v_product.price,
        'quantity', v_quantity,
        'subtotal', v_item_subtotal
      );
    end loop;

    v_resolved_items := v_resolved_items || jsonb_build_object(
      'product_id', v_produto_principal_id,
      'product_name', v_produto_principal_nome,
      'unit_price', v_produto_principal_preco,
      'quantity', (v_item->>'quantity')::numeric,
      'note', v_item->>'note',
      'subtotal', v_produto_principal_subtotal,
      'adicionais', v_resolved_adicionais
    );
  end loop;

  v_discount := round(greatest(0, least(coalesce(p_discount, 0), v_subtotal)), 2);
  v_total := round(v_subtotal - v_discount + v_delivery_fee, 2);

  -- Suficiência do pagamento: só é checada quando payment_status = 'pago'.
  if v_payment_status = 'pago' then
    for v_payment in select * from jsonb_array_elements(p_payments) loop
      v_amount := (v_payment->>'amount')::numeric;
      v_change := coalesce(nullif(v_payment->>'change_amount', '')::numeric, 0);
      v_paid_total := v_paid_total + (v_amount - v_change);
    end loop;

    if v_paid_total < v_total then
      raise exception 'Pagamento insuficiente: recebido %, total %.', v_paid_total, v_total;
    end if;
  end if;

  v_subtotal := coalesce(v_subtotal, 0);
  v_discount := coalesce(v_discount, 0);
  v_total := coalesce(v_total, 0);
  v_delivery_fee := coalesce(v_delivery_fee, 0);

  insert into public.sales as sale (
    client_request_id, status, consumption_type, subtotal, discount, total, notes, user_id,
    customer_name, delivery_fee, payment_status, dining_option
  )
  values (
    p_client_request_id, 'recebido', p_consumption_type, v_subtotal, v_discount, v_total, p_notes, auth.uid(),
    v_customer_name, v_delivery_fee, v_payment_status, v_dining_option
  )
  returning sale.id, sale.order_number, sale.status, sale.created_at into v_sale_id, v_order_number, v_status, v_created_at;

  for v_item in select * from jsonb_array_elements(v_resolved_items) loop
    insert into public.sale_items (sale_id, product_id, product_name, unit_price, quantity, note, subtotal)
    values (
      v_sale_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      (v_item->>'unit_price')::numeric,
      (v_item->>'quantity')::numeric,
      v_item->>'note',
      (v_item->>'subtotal')::numeric
    )
    returning id into v_parent_sale_item_id;

    for v_adicional in select * from jsonb_array_elements(v_item->'adicionais') loop
      insert into public.sale_items (sale_id, product_id, product_name, unit_price, quantity, note, subtotal, parent_sale_item_id)
      values (
        v_sale_id,
        (v_adicional->>'product_id')::uuid,
        v_adicional->>'product_name',
        (v_adicional->>'unit_price')::numeric,
        (v_adicional->>'quantity')::numeric,
        null,
        (v_adicional->>'subtotal')::numeric,
        v_parent_sale_item_id
      );
    end loop;
  end loop;

  for v_item in select * from jsonb_array_elements(v_stock_updates) loop
    update public.products
      set stock_current = (v_item->>'new_stock')::numeric
      where id = (v_item->>'product_id')::uuid;

    insert into public.stock_movements (product_id, type, reason, quantity, sale_id, note)
    values (
      (v_item->>'product_id')::uuid, 'saida', 'venda', (v_item->>'quantity')::numeric, v_sale_id, null
    );
  end loop;

  -- Pagamentos/caixa: só gravados quando payment_status = 'pago'. Numa
  -- venda 'nao_pago' nenhuma linha entra em payments/cash_movements —
  -- nenhum dinheiro entrou de verdade, então nada é lançado no caixa.
  if v_payment_status = 'pago' then
    for v_payment in select * from jsonb_array_elements(p_payments) loop
      v_amount := (v_payment->>'amount')::numeric;
      v_change := coalesce(nullif(v_payment->>'change_amount', '')::numeric, 0);
      v_net_amount := v_amount - v_change;

      insert into public.cash_movements (cash_session_id, type, origin, amount, payment_method, sale_id)
      values (v_cash_session_id, 'entrada', 'venda', v_net_amount, v_payment->>'payment_method', v_sale_id);

      insert into public.payments (sale_id, payment_method, amount, change_amount)
      values (v_sale_id, v_payment->>'payment_method', v_amount, nullif(v_payment->>'change_amount', '')::numeric);
    end loop;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', si.id,
           'product_id', si.product_id,
           'product_name', si.product_name,
           'unit_price', si.unit_price,
           'quantity', si.quantity,
           'note', si.note,
           'subtotal', si.subtotal,
           'parent_sale_item_id', si.parent_sale_item_id
         )), '[]'::jsonb)
    into v_items_result
    from public.sale_items si
    where si.sale_id = v_sale_id;

  return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount,
    v_total, v_items_result, v_customer_name, v_delivery_fee, v_payment_status, v_dining_option;
end;
$$;

grant execute on function public.finalize_sale(uuid, text, numeric, text, jsonb, jsonb, text, numeric, text, text) to authenticated;
