-- ============================================================================
-- DIAGNÓSTICO — subtotal NULL no INSERT de sales
-- ============================================================================
-- Todas as consultas abaixo são SOMENTE LEITURA (SELECT). Nenhuma altera
-- dados, schema, function ou trigger. Rode uma de cada vez e me mande o
-- resultado de cada uma (pode ser só print/screenshot).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) A constraint NOT NULL de products.price ainda existe? (item 2 da sua lista)
--    Se esta consulta NÃO devolver "price" com is_nullable = 'NO', a
--    constraint foi removida/alterada em algum momento — mesmo que os
--    dados hoje pareçam corretos, o banco pararia de garantir isso.
-- ----------------------------------------------------------------------------
select column_name, is_nullable, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
  and column_name in ('price', 'active', 'stock_current');

-- ----------------------------------------------------------------------------
-- 2) Existe ALGUM produto (ativo ou não) com price null de verdade?
--    (confere os dados diretamente, sem depender do que a constraint promete)
-- ----------------------------------------------------------------------------
select id, name, active, price, stock_current
from public.products
where price is null;

-- ----------------------------------------------------------------------------
-- 3) Mesma pergunta, só produtos ATIVOS (o que a RPC realmente teria
--    permitido vender) — confirma de forma independente o que você já
--    checou manualmente.
-- ----------------------------------------------------------------------------
select id, name, price
from public.products
where active = true and price is null;

-- ----------------------------------------------------------------------------
-- 4) Todas as constraints de public.products (procure por algo relativo
--    a "price" — deveria aparecer um CHECK, e a coluna deveria estar
--    listada como NOT NULL na consulta 1 acima).
-- ----------------------------------------------------------------------------
select conname, contype, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conrelid = 'public.products'::regclass
order by conname;

-- ----------------------------------------------------------------------------
-- 5) Constraints/nullability de public.sales (confirma que
--    subtotal/discount/total realmente são NOT NULL na tabela).
-- ----------------------------------------------------------------------------
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'sales'
  and column_name in ('subtotal', 'discount', 'total');

-- ----------------------------------------------------------------------------
-- 6) TRIGGERS em public.sales — algum trigger além dos que já
--    documentamos (updated_at, proteção de campos imutáveis) mexendo em
--    subtotal/discount/total durante o INSERT? (item 4 da sua lista)
-- ----------------------------------------------------------------------------
select tgname as trigger_name, tgenabled as habilitado, pg_get_triggerdef(oid) as definicao
from pg_trigger
where tgrelid = 'public.sales'::regclass
  and not tgisinternal;

-- ----------------------------------------------------------------------------
-- 7) TRIGGERS em public.products (item 5 da sua lista) — algo que possa
--    interferir na leitura/gravação de price ou stock_current.
-- ----------------------------------------------------------------------------
select tgname as trigger_name, tgenabled as habilitado, pg_get_triggerdef(oid) as definicao
from pg_trigger
where tgrelid = 'public.products'::regclass
  and not tgisinternal;

-- ----------------------------------------------------------------------------
-- 8) A definição EXATA da função instalada agora no seu banco — cole o
--    resultado completo, preciso ver linha por linha se bate com o que
--    te enviei (item 6 da sua lista).
-- ----------------------------------------------------------------------------
select pg_get_functiondef(oid) as definicao_instalada
from pg_proc
where proname = 'finalize_sale';

-- ----------------------------------------------------------------------------
-- 9) Existe só UMA versão de finalize_sale, ou ficaram overloads
--    duplicados (assinaturas diferentes) de tentativas anteriores?
--    Se aparecer mais de uma linha aqui, isso pode ser a causa raiz —
--    uma chamada da API pode estar batendo numa versão antiga.
-- ----------------------------------------------------------------------------
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as argumentos,
  p.prosecdef as security_definer,
  p.proconfig as configuracoes -- deve conter "search_path=public"
from pg_proc p
where p.proname = 'finalize_sale';

-- ----------------------------------------------------------------------------
-- 10) Teste isolado do cálculo (sem gravar nada): troque o UUID abaixo
--     pelo product_id EXATO que você usou no teste que gerou o erro
--     (pegue na aba Network do navegador, no payload enviado pra RPC,
--     ou no Table Editor pelo nome do produto). Confirma se
--     price * quantidade realmente dá um número, pra ESSE produto
--     específico, fora do contexto da função.
-- ----------------------------------------------------------------------------
-- select id, name, price, active, stock_current,
--        round(price * 1, 2) as subtotal_se_vender_1_unidade
-- from public.products
-- where id = 'COLOQUE-AQUI-O-UUID-DO-PRODUTO-TESTADO';

-- ----------------------------------------------------------------------------
-- 11) Últimas linhas de sales (confirma que nenhuma venda parcial ficou
--     gravada por engano antes do erro — não deveria, já que tudo é uma
--     transação só, mas vale conferir).
-- ----------------------------------------------------------------------------
select id, order_number, client_request_id, subtotal, discount, total, created_at
from public.sales
order by created_at desc
limit 5;
