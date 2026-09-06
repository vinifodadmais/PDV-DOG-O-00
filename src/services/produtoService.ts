import { produtoRepository } from "@/storage";
import { generateId } from "@/utils/id";
import { nowIso } from "@/utils/date";
import type { Produto, EntityId } from "@/types";

export async function listarProdutos(): Promise<Produto[]> {
  return produtoRepository.getAll();
}

export async function listarProdutosAtivos(): Promise<Produto[]> {
  const produtos = await listarProdutos();
  return produtos.filter((produto) => produto.ativo);
}

export async function listarProdutosPorCategoria(
  categoriaId: EntityId
): Promise<Produto[]> {
  const produtos = await listarProdutos();
  return produtos.filter((produto) => produto.categoriaId === categoriaId);
}

export async function listarProdutosComEstoqueBaixo(): Promise<Produto[]> {
  const produtos = await listarProdutos();
  return produtos.filter((produto) => produto.estoqueAtual <= produto.estoqueMinimo);
}

export async function buscarProduto(id: EntityId): Promise<Produto | null> {
  return produtoRepository.getById(id);
}

export interface NovoProdutoInput {
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

export async function criarProduto(input: NovoProdutoInput): Promise<Produto> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome do produto.");
  }
  if (input.preco < 0) {
    throw new Error("O preço não pode ser negativo.");
  }
  if (input.custo !== undefined && input.custo < 0) {
    throw new Error("O custo não pode ser negativo.");
  }
  if (input.estoqueAtual !== undefined && input.estoqueAtual < 0) {
    throw new Error("O estoque não pode ser negativo.");
  }
  if (input.estoqueMinimo !== undefined && input.estoqueMinimo < 0) {
    throw new Error("O estoque mínimo não pode ser negativo.");
  }

  const timestamp = nowIso();

  const produto: Produto = {
    id: generateId(),
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
  };

  return produtoRepository.create(produto);
}

/**
 * Aceita apenas um patch parcial, mas valida os campos que estiverem
 * presentes — nunca permite preço, custo ou estoque negativos, nem nome
 * vazio, mesmo que a chamada não passe pela tela de edição (ex: um
 * ajuste rápido de "ativo" via toggle na lista continua liberado
 * normalmente, sem exigir os outros campos).
 */
export async function atualizarProduto(
  id: EntityId,
  patch: Partial<Omit<Produto, "id" | "createdAt">>
): Promise<Produto | null> {
  if (patch.nome !== undefined && patch.nome.trim() === "") {
    throw new Error("O nome do produto não pode ficar vazio.");
  }
  if (patch.preco !== undefined && patch.preco < 0) {
    throw new Error("O preço não pode ser negativo.");
  }
  if (patch.custo !== undefined && patch.custo !== null && patch.custo < 0) {
    throw new Error("O custo não pode ser negativo.");
  }
  if (patch.estoqueAtual !== undefined && patch.estoqueAtual < 0) {
    throw new Error("O estoque não pode ser negativo.");
  }
  if (patch.estoqueMinimo !== undefined && patch.estoqueMinimo < 0) {
    throw new Error("O estoque mínimo não pode ser negativo.");
  }

  return produtoRepository.update(id, { ...patch, updatedAt: nowIso() });
}

export async function excluirProduto(id: EntityId): Promise<void> {
  return produtoRepository.remove(id);
}
