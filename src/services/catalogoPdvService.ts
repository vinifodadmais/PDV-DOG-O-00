import { createSupabaseRepository } from "@/storage/createSupabaseRepository";
import { categoriaMapeamento, type CategoriaRow } from "@/storage/mapeamentos/categoriaMapeamento";
import { produtoMapeamento, type ProdutoRow } from "@/storage/mapeamentos/produtoMapeamento";
import type { Categoria, Produto } from "@/types";

/**
 * ============================================================================
 * FASE 1 da migração do PDV operacional: leitura do cardápio oficial
 * (Supabase) para a tela Vendas. Reaproveita os mesmos mapeamentos de
 * campo do módulo Admin (`storage/mapeamentos/*`), mas com sua própria
 * instância de repositório — mantém este arquivo desacoplado do
 * namespace "admin" (só compartilha a definição de como traduzir os
 * campos, não o módulo administrativo em si).
 *
 * IMPORTANTE: isto é só LEITURA do cardápio. `finalizarVenda`,
 * `estoqueService`, `caixaService` continuam 100% locais nesta fase —
 * ver aviso na Fase 1 sobre por que "Finalizar Venda" fica desabilitado
 * enquanto isso não for migrado também (Fase 2).
 */

const categoriaSupabaseRepositoryPdv = createSupabaseRepository<Categoria, CategoriaRow>(
  "categories",
  categoriaMapeamento
);

const produtoSupabaseRepositoryPdv = createSupabaseRepository<Produto, ProdutoRow>(
  "products",
  produtoMapeamento
);

/** Categorias ativas do cardápio oficial (Supabase), ordenadas como no Admin. */
export async function listarCategoriasAtivasSupabase(): Promise<Categoria[]> {
  const todas = await categoriaSupabaseRepositoryPdv.getAll();
  return todas.filter((categoria) => categoria.ativo).sort((a, b) => a.ordem - b.ordem);
}

/** Produtos ativos do cardápio oficial (Supabase) — produtos inativos nunca aparecem aqui. */
export async function listarProdutosAtivosSupabase(): Promise<Produto[]> {
  const todos = await produtoSupabaseRepositoryPdv.getAll();
  return todos.filter((produto) => produto.ativo);
}
