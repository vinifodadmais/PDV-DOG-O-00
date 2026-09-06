-- ============================================================================
-- FASE 5 — Adicionais vinculados a um item do carrinho
-- ============================================================================
-- Aditivo apenas: 1 coluna nova (nullable, auto-referenciada) + 1 índice.
-- Nenhuma tabela nova, nenhuma coluna existente alterada, nenhum dado
-- apagado. Produtos/preços/categorias intocados.
-- ============================================================================

alter table public.sale_items
  add column if not exists parent_sale_item_id uuid references public.sale_items(id) on delete cascade;

create index if not exists idx_sale_items_parent_sale_item_id
  on public.sale_items(parent_sale_item_id);

-- Nota de design: não há checagem de "nível único" (um adicional nunca
-- pode ter outro adicional) via constraint de banco — é garantido pelo
-- próprio `finalize_sale`, que é o único código que escreve nessa
-- coluna e nunca gera um segundo nível. Se um dia outro código passar
-- a escrever em sale_items, essa invariante precisaria ser revisada.

-- ============================================================================
-- finalize_sale — agora aceita adicionais aninhados por item.
--
-- p_items: [{ product_id, quantity, note, adicionais: [{product_id, quantity}] }]
--
-- Cada adicional é validado (produto existe, está ativo, tem estoque) e
-- baixa estoque EXATAMENTE como um item principal — porque é o mesmo
-- produto real (ex: "Bacon"), só que gravado com parent_sale_item_id
-- apontando pra linha do lanche. Isso é o que garante que o adicional
-- nunca "sai de graça" do estoque.
--
-- Estratégia: 1ª passada só VALIDA e monta uma estrutura JSON com tudo
-- já resolvido (preço oficial, subtotal, e-mail dos adicionais
-- aninhados) — sem gravar nada. Só depois de validar o pedido inteiro
-- (itens + adicionais + pagamento) é que a venda é criada, e uma 2ª
-- passada grava as linhas de sale_items (pai primeiro, capturando o id
-- gerado, depois os adicionais com parent_sale_item_id = esse id).
-- ============================================================================
create or replace function public.finalize_sale(
  p_client_request_id uuid,
  p_consumption_type text,
  p_discount numeric,
  p_notes text,
  p_items jsonb,
  p_payments jsonb
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
  -- Capturam os dados do produto PRINCIPAL do item ANTES do loop de
  -- adicionais rodar por cima de v_product — elimina a releitura frágil
  -- que existia antes (um SELECT INTO sem STRICT que, se não encontrasse
  -- linha nenhuma, silenciosamente zerava v_product pra NULL em vez de
  -- dar erro, podendo gerar um subtotal NULL).
  v_produto_principal_id uuid;
  v_produto_principal_nome text;
  v_produto_principal_preco numeric;
  v_produto_principal_subtotal numeric;
begin
  if not public.is_active_staff() then
    raise exception 'Acesso negado: usuário não autenticado ou inativo.';
  end if;

  -- IDEMPOTÊNCIA: mesma requisição de novo -> devolve a venda já
  -- existente, agora incluindo parent_sale_item_id no retorno (pra o
  -- frontend conseguir reconstruir os adicionais aninhados também num replay).
  if p_client_request_id is not null then
    select s.id, s.order_number, s.status, s.created_at, s.subtotal, s.discount, s.total
      into v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total
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

      return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total, v_items_result;
      return;
    end if;
  end if;

  -- CAIXA (sem mudança de lógica).
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

  -- Validação de FORMATO dos pagamentos (valor/troco) — a checagem de
  -- SUFICIÊNCIA (pago >= total) só é feita depois de somar os itens.
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

  -- 1ª PASSADA: valida e resolve itens + adicionais (preço oficial,
  -- estoque, subtotal) — nada é gravado ainda.
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

    -- Captura os dados do produto PRINCIPAL AGORA, antes do loop de
    -- adicionais abaixo reescrever v_product com cada adicional.
    v_produto_principal_id := v_product.id;
    v_produto_principal_nome := v_product.name;
    v_produto_principal_preco := v_product.price;
    v_produto_principal_subtotal := v_item_subtotal;

    -- ADICIONAIS deste item: mesma validação (existe, ativo, estoque),
    -- mesmo produto real, só que vira uma linha FILHA depois.
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

    -- Usa os dados do produto PRINCIPAL capturados ANTES do loop de
    -- adicionais (nunca precisa reconsultar o banco pra isso, então não
    -- existe mais um SELECT sem STRICT que pudesse silenciosamente
    -- zerar o subtotal caso não encontrasse a linha).
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
  v_total := round(v_subtotal - v_discount, 2);

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    v_amount := (v_payment->>'amount')::numeric;
    v_change := coalesce(nullif(v_payment->>'change_amount', '')::numeric, 0);
    v_paid_total := v_paid_total + (v_amount - v_change);
  end loop;

  if v_paid_total < v_total then
    raise exception 'Pagamento insuficiente: recebido %, total %.', v_paid_total, v_total;
  end if;

  -- GARANTIA EXPLÍCITA (pedida depois do incidente de subtotal NULL):
  -- não importa o que aconteceu antes, subtotal/discount/total NUNCA
  -- podem chegar nulos no INSERT — se algo os deixou nulos por engano,
  -- caem em 0 aqui, em vez de violar a constraint NOT NULL da tabela.
  v_subtotal := coalesce(v_subtotal, 0);
  v_discount := coalesce(v_discount, 0);
  v_total := coalesce(v_total, 0);

  -- Tudo validado — grava. sales -> sale_items (pai + adicionais) ->
  -- baixa de estoque + stock_movements -> caixa -> payments.
  -- >>> CORREÇÃO: alias "sale" na tabela de destino do INSERT, pra poder
  -- qualificar "sale.id/order_number/status/created_at" no RETURNING —
  -- sem isso, esses nomes colidem com os parâmetros de saída do
  -- RETURNS TABLE (mesma classe de bug já corrigida antes; voltou a
  -- aparecer porque a função inteira foi reescrita do zero para os
  -- adicionais e essa parte não foi copiada da versão corrigida). <<<
  insert into public.sales as sale (client_request_id, status, consumption_type, subtotal, discount, total, notes, user_id)
  values (p_client_request_id, 'recebido', p_consumption_type, v_subtotal, v_discount, v_total, p_notes, auth.uid())
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

  for v_payment in select * from jsonb_array_elements(p_payments) loop
    v_amount := (v_payment->>'amount')::numeric;
    v_change := coalesce(nullif(v_payment->>'change_amount', '')::numeric, 0);
    v_net_amount := v_amount - v_change;

    insert into public.cash_movements (cash_session_id, type, origin, amount, payment_method, sale_id)
    values (v_cash_session_id, 'entrada', 'venda', v_net_amount, v_payment->>'payment_method', v_sale_id);

    insert into public.payments (sale_id, payment_method, amount, change_amount)
    values (v_sale_id, v_payment->>'payment_method', v_amount, nullif(v_payment->>'change_amount', '')::numeric);
  end loop;

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

  return query select v_sale_id, v_order_number, v_status, v_created_at, v_subtotal, v_discount, v_total, v_items_result;
end;
$$;

grant execute on function public.finalize_sale(uuid, text, numeric, text, jsonb, jsonb) to authenticated;
