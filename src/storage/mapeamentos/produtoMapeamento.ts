import { arredondarMoeda } from "@/utils/currency";
import type { MapeamentoTabela } from "@/storage/createSupabaseRepository";
import type { Produto } from "@/types";

/**
 * Formato exato da tabela `public.products` (ver supabase/schema.sql).
 *
 * IMPORTANTE sobre `price`/`cost`: são colunas `numeric(10,2)` no
 * Postgres. O PostgREST costuma devolver `numeric` como STRING (não
 * number) exatamente para evitar perda de precisão na serialização
 * JSON — por isso `paraEntidade` sempre passa por `Number(...)` antes
 * de `arredondarMoeda`, tratando os dois casos (string ou number) da
 * mesma forma seguramente.
 */
export interface ProdutoRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | string;
  cost: number | string | null;
  unit: string;
  stock_current: number | string;
  stock_minimum: number | string;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const produtoMapeamento: MapeamentoTabela<Produto, ProdutoRow> = {
  paraLinha(produto) {
    return {
      id: produto.id,
      category_id: produto.categoriaId,
      name: produto.nome,
      description: produto.descricao ?? null,
      price: arredondarMoeda(produto.preco),
      cost: produto.custo !== undefined ? arredondarMoeda(produto.custo) : null,
      unit: produto.unidade,
      stock_current: produto.estoqueAtual,
      stock_minimum: produto.estoqueMinimo,
      image_url: produto.imagemUrl ?? null,
      active: produto.ativo,
      created_at: produto.createdAt,
      updated_at: produto.updatedAt,
    };
  },

  paraLinhaParcial(patch) {
    const linha: Record<string, unknown> = {};
    if (patch.categoriaId !== undefined) linha.category_id = patch.categoriaId;
    if (patch.nome !== undefined) linha.name = patch.nome;
    if (patch.descricao !== undefined) linha.description = patch.descricao ?? null;
    if (patch.preco !== undefined) linha.price = arredondarMoeda(patch.preco);
    if (patch.custo !== undefined) {
      linha.cost = patch.custo === undefined ? null : arredondarMoeda(patch.custo);
    }
    if (patch.unidade !== undefined) linha.unit = patch.unidade;
    if (patch.estoqueAtual !== undefined) linha.stock_current = patch.estoqueAtual;
    if (patch.estoqueMinimo !== undefined) linha.stock_minimum = patch.estoqueMinimo;
    if (patch.imagemUrl !== undefined) linha.image_url = patch.imagemUrl ?? null;
    if (patch.ativo !== undefined) linha.active = patch.ativo;
    if (patch.updatedAt !== undefined) linha.updated_at = patch.updatedAt;
    return linha;
  },

  paraEntidade(row) {
    return {
      id: row.id,
      categoriaId: row.category_id,
      nome: row.name,
      descricao: row.description ?? undefined,
      preco: arredondarMoeda(Number(row.price)),
      custo:
        row.cost !== null && row.cost !== undefined ? arredondarMoeda(Number(row.cost)) : undefined,
      unidade: row.unit,
      estoqueAtual: Number(row.stock_current),
      estoqueMinimo: Number(row.stock_minimum),
      imagemUrl: row.image_url ?? undefined,
      ativo: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
