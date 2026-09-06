-- ============================================================================
-- DOGÃO DA PRAÇA — Schema completo do Supabase (PostgreSQL)
-- ============================================================================
-- Espelha 1:1 o modelo de dados que já existe no frontend
-- (src/types/*.ts) — nenhuma estrutura nova foi inventada, só traduzida
-- para tabelas relacionais + autenticação real.
--
-- COMO EXECUTAR:
--   1. Abra seu projeto em https://supabase.com/dashboard
--   2. Vá em "SQL Editor" (ícone de banco de dados na barra lateral)
--   3. Clique em "New query"
--   4. Cole o conteúdo INTEIRO deste arquivo
--   5. Clique em "Run" (ou Ctrl+Enter)
--   6. Confira no final que apareceu "Success. No rows returned"
--
-- É seguro rodar este arquivo mais de uma vez (usa IF NOT EXISTS / OR
-- REPLACE em tudo), então se der algum erro no meio, pode corrigir e
-- rodar de novo sem duplicar nada.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. FUNÇÃO AUXILIAR: updated_at automático
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 2. PROFILES (perfis / papéis dos usuários)
-- ============================================================================
-- Um profile é criado automaticamente para todo usuário que se cadastra
-- no Supabase Auth (via trigger, mais abaixo). O papel padrão é
-- "operator" — NINGUÉM vira admin sozinho; você precisa promover o seu
-- próprio usuário manualmente depois (passo a passo no final).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default 'operator' check (role in ('admin', 'operator')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles (role);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente quando alguém se cadastra no Supabase Auth.
-- IMPORTANTE: 'operator' é um valor fixo aqui, NUNCA lido de
-- `raw_user_meta_data` — mesmo que alguém se cadastre mandando
-- `{ "role": "admin" }` no metadata do signup, essa função ignora
-- completamente esse campo. Não existe caminho pelo app para um usuário
-- se autopromover a admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.email, ''),
    'operator',
    true
  );
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. FUNÇÕES DE APOIO PARA AS POLICIES (evitam recursão de RLS)
-- ============================================================================
-- SECURITY DEFINER: rodam com privilégio do dono da função, então
-- conseguem ler "profiles" mesmo com RLS ativado nela, sem cair num loop
-- de "policy que precisa de policy para se avaliar".

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active = true
  );
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true
  );
$$;

-- ============================================================================
-- 4. CATEGORIES (categorias do cardápio)
-- ============================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  color text not null default '#E11D2E',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_categories_active on public.categories (active);
create index if not exists idx_categories_sort_order on public.categories (sort_order);

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 5. PRODUCTS (produtos do cardápio)
-- ============================================================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  description text,
  price numeric(10, 2) not null check (price >= 0),
  cost numeric(10, 2) check (cost is null or cost >= 0),
  unit text not null default 'un',
  stock_current numeric(10, 2) not null default 0 check (stock_current >= 0),
  stock_minimum numeric(10, 2) not null default 0 check (stock_minimum >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_products_active on public.products (active);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. SALES (pedidos/vendas)
-- ============================================================================
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  order_number integer generated by default as identity,
  status text not null default 'recebido'
    check (status in ('aberto', 'recebido', 'em_preparo', 'pronto', 'finalizado', 'cancelado')),
  consumption_type text not null default 'balcao'
    check (consumption_type in ('balcao', 'viagem', 'entrega')),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  notes text,
  user_id uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_sales_order_number unique (order_number)
);

create index if not exists idx_sales_status on public.sales (status);
create index if not exists idx_sales_created_at on public.sales (created_at);
create index if not exists idx_sales_user_id on public.sales (user_id);

drop trigger if exists trg_sales_updated_at on public.sales;
create trigger trg_sales_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Proteção de integridade financeira: um operador só pode alterar o
-- STATUS de uma venda (fluxo de cozinha / cancelamento). Qualquer
-- tentativa de mudar subtotal, discount, total, user_id, created_at,
-- order_number ou consumption_type é rejeitada pelo próprio Postgres —
-- não depende do frontend nunca enviar esses campos. Admin não tem essa
-- trava (pode corrigir um pedido manualmente se precisar).
-- ----------------------------------------------------------------------------
create or replace function public.protect_sales_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.subtotal is distinct from old.subtotal
     or new.discount is distinct from old.discount
     or new.total is distinct from old.total
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
     or new.order_number is distinct from old.order_number
     or new.consumption_type is distinct from old.consumption_type
     or new.notes is distinct from old.notes
  then
    raise exception 'Operadores só podem alterar o status do pedido, não seus valores.';
  end if;

  if old.status = 'cancelado' and new.status is distinct from old.status then
    raise exception 'Este pedido já está cancelado e não pode ter o status alterado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sales_protect_immutable on public.sales;
create trigger trg_sales_protect_immutable
  before update on public.sales
  for each row execute function public.protect_sales_immutable_fields();

-- ============================================================================
-- 7. SALE_ITEMS (itens do pedido — SNAPSHOT do produto no momento da venda)
-- ============================================================================
-- product_id permite ON DELETE SET NULL de propósito: se um produto for
-- excluído no futuro, o item da venda antiga continua existindo, com o
-- nome/preço que foram salvos aqui — nunca muda retroativamente.
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  quantity numeric(10, 2) not null check (quantity > 0),
  note text,
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_sale_items_sale_id on public.sale_items (sale_id);
create index if not exists idx_sale_items_product_id on public.sale_items (product_id);

-- ============================================================================
-- 8. PAYMENTS (pagamentos de um pedido — separado por poder ser múltiplo/misto)
-- ============================================================================
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  payment_method text not null check (payment_method in ('dinheiro', 'pix', 'debito', 'credito', 'outro')),
  amount numeric(10, 2) not null check (amount >= 0),
  change_amount numeric(10, 2) check (change_amount is null or change_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_sale_id on public.payments (sale_id);

-- ============================================================================
-- 9. CASH_SESSIONS (sessões de caixa: abertura/fechamento)
-- ============================================================================
create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references auth.users (id) default auth.uid(),
  status text not null default 'aberta' check (status in ('aberta', 'fechada')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric(10, 2) not null check (opening_amount >= 0),
  closing_amount_declared numeric(10, 2) check (closing_amount_declared is null or closing_amount_declared >= 0),
  closing_amount_calculated numeric(10, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cash_sessions_status on public.cash_sessions (status);

drop trigger if exists trg_cash_sessions_updated_at on public.cash_sessions;
create trigger trg_cash_sessions_updated_at
  before update on public.cash_sessions
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Mesma lógica de proteção de "sales": um operador só pode FECHAR a
-- sessão (status, closed_at, os dois valores de fechamento) — não pode
-- reescrever o valor de abertura, quem abriu, nem reabrir uma sessão já
-- fechada. Não foi pedido explicitamente, mas é o mesmo risco de
-- integridade financeira que a revisão de "sales" identificou, então
-- apliquei o mesmo padrão aqui por consistência.
-- ----------------------------------------------------------------------------
create or replace function public.protect_cash_sessions_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.operator_id is distinct from old.operator_id
     or new.opening_amount is distinct from old.opening_amount
     or new.opened_at is distinct from old.opened_at
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Operadores só podem fechar a sessão de caixa, não alterar os dados de abertura.';
  end if;

  if old.status = 'fechada' then
    raise exception 'Esta sessão de caixa já está fechada.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cash_sessions_protect_immutable on public.cash_sessions;
create trigger trg_cash_sessions_protect_immutable
  before update on public.cash_sessions
  for each row execute function public.protect_cash_sessions_immutable_fields();

-- Só permite UMA sessão "aberta" por vez em todo o sistema — espelha a
-- trava que já existe hoje no `caixaService.abrirCaixa()` do frontend,
-- agora garantida também no banco.
create unique index if not exists uq_cash_sessions_only_one_open
  on public.cash_sessions ((true))
  where status = 'aberta';

-- ============================================================================
-- 10. CASH_MOVEMENTS (movimentações de caixa: venda, sangria, despesa...)
-- ============================================================================
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions (id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  origin text not null check (origin in ('venda', 'sangria', 'despesa', 'reforco', 'cancelamento', 'ajuste')),
  amount numeric(10, 2) not null check (amount >= 0),
  reason text,
  note text,
  payment_method text check (payment_method in ('dinheiro', 'pix', 'debito', 'credito', 'outro')),
  sale_id uuid references public.sales (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Integridade: movimentação de "venda"/"cancelamento" TEM que estar
  -- amarrada a uma venda real; sangria/despesa/reforço/ajuste NUNCA têm
  -- sale_id (não fazem sentido atrelados a uma venda). Vale para
  -- qualquer papel, inclusive admin — é regra de dado, não de permissão.
  constraint chk_cash_movements_sale_id_matches_origin
    check ((origin in ('venda', 'cancelamento')) = (sale_id is not null)),
  -- Evita duplicar o mesmo lançamento de venda/cancelamento (ex: dois
  -- registros de "venda" Pix pro mesmo pedido) — permite várias formas
  -- de pagamento por venda (pagamento misto), mas não repetição da
  -- mesma forma para a mesma venda.
  constraint uq_cash_movements_sale_origin_method
    unique (sale_id, origin, payment_method)
);

create index if not exists idx_cash_movements_session_id on public.cash_movements (cash_session_id);
create index if not exists idx_cash_movements_sale_id on public.cash_movements (sale_id);

-- ============================================================================
-- 11. STOCK_MOVEMENTS (movimentações de estoque: entrada, saída, ajuste)
-- ============================================================================
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  type text not null check (type in ('entrada', 'saida', 'ajuste')),
  reason text not null check (reason in ('compra', 'venda', 'perda', 'ajuste_manual', 'cancelamento', 'inicial')),
  quantity numeric(10, 2) not null,
  sale_id uuid references public.sales (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  -- Mesma regra de integridade da tabela cash_movements: "venda" e
  -- "cancelamento" sempre amarrados a uma venda real; os demais motivos
  -- (compra, perda, ajuste_manual, inicial) nunca têm sale_id.
  constraint chk_stock_movements_sale_id_matches_reason
    check ((reason in ('venda', 'cancelamento')) = (sale_id is not null))
);

create index if not exists idx_stock_movements_product_id on public.stock_movements (product_id);
create index if not exists idx_stock_movements_sale_id on public.stock_movements (sale_id);

-- ============================================================================
-- 12. ROW LEVEL SECURITY — habilitar em tudo
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.stock_movements enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());
-- ^ Só quem JÁ é admin consegue fazer UPDATE em profiles — inclusive no
-- próprio registro. Um operador não tem nenhuma policy de UPDATE
-- disponível (nem pra própria linha), então não existe forma de ele
-- mudar seu `role`/`active`/`name` sozinho, através do app.
-- Sem policy de INSERT/DELETE para usuários comuns: profiles só é criado
-- pelo trigger (SECURITY DEFINER, ignora RLS) e não deve ser apagado
-- pelo app — para desativar alguém, o admin usa UPDATE (active = false).

-- ---------- CATEGORIES ----------
drop policy if exists "categories_select_staff" on public.categories;
create policy "categories_select_staff" on public.categories
  for select
  using (public.is_active_staff());

drop policy if exists "categories_write_admin" on public.categories;
create policy "categories_write_admin" on public.categories
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- PRODUCTS ----------
drop policy if exists "products_select_staff" on public.products;
create policy "products_select_staff" on public.products
  for select
  using (public.is_active_staff());

drop policy if exists "products_write_admin" on public.products;
create policy "products_write_admin" on public.products
  for all
  using (public.is_admin())
  with check (public.is_admin());
-- ^ Esta é a policy que garante, DE VERDADE, que um operador não altera
-- preço/cadastro — mesmo que ele manipule a requisição na mão, o Postgres
-- rejeita qualquer INSERT/UPDATE/DELETE em "products" que não venha de
-- um usuário com role = 'admin'.

-- ---------- SALES ----------
drop policy if exists "sales_select_staff" on public.sales;
create policy "sales_select_staff" on public.sales
  for select
  using (public.is_active_staff());

drop policy if exists "sales_insert_staff" on public.sales;
create policy "sales_insert_staff" on public.sales
  for insert
  with check (public.is_active_staff() and user_id = auth.uid());

drop policy if exists "sales_update_staff" on public.sales;
create policy "sales_update_staff" on public.sales
  for update
  using (public.is_active_staff())
  with check (public.is_active_staff());
-- ^ Esta policy só controla QUAIS LINHAS um funcionário ativo pode
-- tocar. QUAIS COLUNAS ele pode alterar é decidido pelo trigger
-- `trg_sales_protect_immutable` (acima) — operador só consegue mudar
-- `status`; qualquer campo financeiro é rejeitado pelo próprio banco.

drop policy if exists "sales_delete_admin" on public.sales;
create policy "sales_delete_admin" on public.sales
  for delete
  using (public.is_admin());

-- ---------- SALE_ITEMS ----------
drop policy if exists "sale_items_select_staff" on public.sale_items;
create policy "sale_items_select_staff" on public.sale_items
  for select
  using (public.is_active_staff());

drop policy if exists "sale_items_insert_staff" on public.sale_items;
create policy "sale_items_insert_staff" on public.sale_items
  for insert
  with check (
    public.is_active_staff()
    and exists (select 1 from public.sales s where s.id = sale_id and s.user_id = auth.uid())
  );
-- Sem policy de UPDATE/DELETE: um item de venda, uma vez criado, é
-- IMUTÁVEL — igual ao comportamento atual do frontend (o "snapshot" do
-- pedido nunca muda). No Postgres RLS, comando sem nenhuma policy
-- correspondente fica automaticamente NEGADO para "authenticated" — não
-- é preciso (nem existe) uma policy "de negar", a ausência já barra.
-- Isso vale tanto para operador quanto para admin através do app.

-- ---------- PAYMENTS ----------
drop policy if exists "payments_select_staff" on public.payments;
create policy "payments_select_staff" on public.payments
  for select
  using (public.is_active_staff());

drop policy if exists "payments_insert_staff" on public.payments;
create policy "payments_insert_staff" on public.payments
  for insert
  with check (
    public.is_active_staff()
    and exists (select 1 from public.sales s where s.id = sale_id and s.user_id = auth.uid())
  );
-- Sem UPDATE/DELETE: pagamento registrado não muda depois (mesma regra
-- de "ausência de policy = negado" explicada em sale_items). Vale para
-- operador e para admin através do app.

-- ---------- CASH_SESSIONS ----------
drop policy if exists "cash_sessions_select_staff" on public.cash_sessions;
create policy "cash_sessions_select_staff" on public.cash_sessions
  for select
  using (public.is_active_staff());

drop policy if exists "cash_sessions_insert_staff" on public.cash_sessions;
create policy "cash_sessions_insert_staff" on public.cash_sessions
  for insert
  with check (public.is_active_staff() and operator_id = auth.uid());

drop policy if exists "cash_sessions_update_staff" on public.cash_sessions;
create policy "cash_sessions_update_staff" on public.cash_sessions
  for update
  using (public.is_active_staff())
  with check (public.is_active_staff());

-- ---------- CASH_MOVEMENTS ----------
drop policy if exists "cash_movements_select_staff" on public.cash_movements;
create policy "cash_movements_select_staff" on public.cash_movements
  for select
  using (public.is_active_staff());

drop policy if exists "cash_movements_insert_staff" on public.cash_movements;
create policy "cash_movements_insert_staff" on public.cash_movements
  for insert
  with check (
    public.is_active_staff()
    and (
      public.is_admin()
      or origin in ('venda', 'cancelamento', 'sangria', 'despesa')
    )
  );
-- ^ Operador só pode criar movimentações que o fluxo atual do PDV
-- realmente usa: entrada automática de "venda", estorno automático de
-- "cancelamento", e sangria/despesa manuais (que já têm formulário
-- próprio na tela de Caixa). "reforço" e "ajuste" ficam reservados só
-- para admin — são lançamentos incomuns/discricionários demais para
-- deixar um operador criar livremente. A constraint
-- `chk_cash_movements_sale_id_matches_origin` (na criação da tabela)
-- garante que "venda"/"cancelamento" sempre vêm com um sale_id real, e
-- a `uq_cash_movements_sale_origin_method` impede duplicar o mesmo
-- lançamento pra mesma venda.
-- Sem UPDATE/DELETE: ledger financeiro imutável (mesma regra de
-- "ausência de policy = negado").

-- ---------- STOCK_MOVEMENTS ----------
drop policy if exists "stock_movements_select_staff" on public.stock_movements;
create policy "stock_movements_select_staff" on public.stock_movements
  for select
  using (public.is_active_staff());

drop policy if exists "stock_movements_insert_staff" on public.stock_movements;
create policy "stock_movements_insert_staff" on public.stock_movements
  for insert
  with check (
    public.is_active_staff()
    and (
      public.is_admin()
      or (reason in ('venda', 'cancelamento') and sale_id is not null)
    )
  );
-- ^ Operador só pode gerar movimentação de estoque que seja consequência
-- automática de uma venda real (baixa por "venda" ou devolução por
-- "cancelamento" — sempre com sale_id, garantido pela constraint da
-- tabela). Qualquer entrada manual (compra, perda, ajuste_manual) fica
-- restrita a admin. Sem UPDATE/DELETE: histórico de estoque imutável.

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
-- Depois de rodar este arquivo com sucesso, siga os passos do chat para:
--   1. Criar seu usuário (Supabase Auth)
--   2. Promover esse usuário para role = 'admin'
--   3. (opcional, na próxima etapa) Migrar categorias/produtos do seed
-- ============================================================================
