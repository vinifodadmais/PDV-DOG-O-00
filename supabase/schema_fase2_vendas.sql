-- ============================================================================
-- FASE 2 — Finalização de venda no Supabase (RPC atômica + idempotência)
-- ============================================================================
-- Aditivo apenas: 1 coluna nova (nullable) + 1 constraint + 1 função. Nada
-- existente é alterado, removido ou recriado.
--
-- COMO EXECUTAR: SQL Editor do Supabase → colar este arquivo inteiro → Run.
-- Seguro rodar mais de uma vez (IF NOT EXISTS / OR REPLACE em tudo).
-- ============================================================================

alter table public.sales add column if not exists client_request_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_sales_client_request_id'
  ) then
    alter table public.sales add constraint uq_sales_client_request_id unique (client_request_id);
  end if;
end $$;

-- ============================================================================
-- finalize_sale: cria sales + sale_items + payments numa única transação.
--
-- O frontend NUNCA é autoridade sobre preço/subtotal/total — só envia
-- product_id/quantity/note por item, os pagamentos, e o desconto
-- SOLICITADO. Esta função busca o preço oficial em products.price,
-- calcula tudo em `numeric` (decimal exato) e só grava depois de validar.
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
security invoker
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
  v_items_result jsonb;
begin
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

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::numeric;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantidade inválida para um dos itens.';
    end if;

    select id, name, price, active into v_product
      from public.products
      where id = (v_item->>'product_id')::uuid;

    if not found then
      raise exception 'Produto % não encontrado.', v_item->>'product_id';
    end if;
    if not v_product.active then
      raise exception 'Produto "%" está inativo e não pode ser vendido.', v_product.name;
    end if;

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
