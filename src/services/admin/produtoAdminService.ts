import { createSupabaseRepository } from "@/storage/createSupabaseRepository";
import { produtoMapeamento, type ProdutoRow } from "@/storage/mapeamentos/produtoMapeamento";
import type { EntityId, Produto } from "@/types";

/**
 * Repositório Supabase de produtos, usado SOMENTE pelo módulo
 * administrativo — mesma observação de `categoriaAdminService.ts`.
 */
export const produtoSupabaseRepository = createSupabaseRepository<Produto, ProdutoRow>(
  "products",
  produtoMapeamento
);

export async function listarProdutosAdmin(): Promise<Produto[]> {
  return produtoSupabaseRepository.getAll();
}

export interface NovoProdutoAdminInput {
  categoriaId: EntityId;
  nome: string;
  descricao?: string;
  preco: number;
  custo?: number;
  unidade?: string;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  imagemUrl?: string;
}

function validarCamposFinanceiros(campos: {
  preco?: number;
  custo?: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
}) {
  if (campos.preco !== undefined && campos.preco < 0) {
    throw new Error("O preço não pode ser negativo.");
  }
  if (campos.custo !== undefined && campos.custo < 0) {
    throw new Error("O custo não pode ser negativo.");
  }
  if (campos.estoqueAtual !== undefined && campos.estoqueAtual < 0) {
    throw new Error("O estoque não pode ser negativo.");
  }
  if (campos.estoqueMinimo !== undefined && campos.estoqueMinimo < 0) {
    throw new Error("O estoque mínimo não pode ser negativo.");
  }
}

export async function criarProdutoAdmin(input: NovoProdutoAdminInput): Promise<Produto> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome do produto.");
  }
  validarCamposFinanceiros(input);

  const timestamp = new Date().toISOString();
  return produtoSupabaseRepository.create({
    id: crypto.randomUUID(),
    categoriaId: input.categoriaId,
    nome,
    descricao: input.descricao?.trim() || undefined,
    preco: input.preco,
    custo: input.custo,
    unidade: input.unidade?.trim() || "un",
    estoqueAtual: input.estoqueAtual ?? 0,
    estoqueMinimo: input.estoqueMinimo ?? 0,
    imagemUrl: input.imagemUrl,
    ativo: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Atualiza um produto. Sem função de exclusão física aqui de propósito
 * — a interface administrativa só desativa (`ativo: false`).
 */
export async function atualizarProdutoAdmin(
  id: EntityId,
  patch: Partial<Omit<Produto, "id" | "createdAt">>
): Promise<Produto | null> {
  if (patch.nome !== undefined && patch.nome.trim() === "") {
    throw new Error("O nome do produto não pode ficar vazio.");
  }
  validarCamposFinanceiros(patch);

  return produtoSupabaseRepository.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Atalho para a edição rápida de preço direto na tabela (sem abrir o
 * modal completo) — mesma validação, só um caminho mais curto.
 */
export async function atualizarPrecoProdutoAdmin(
  id: EntityId,
  novoPreco: number
): Promise<Produto | null> {
  return atualizarProdutoAdmin(id, { preco: novoPreco });
}
