import { movimentacaoEstoqueRepository, produtoRepository } from "@/storage";
import { generateId } from "@/utils/id";
import { nowIso } from "@/utils/date";
import type {
  EntityId,
  MotivoMovimentacaoEstoque,
  MovimentacaoEstoque,
  TipoMovimentacaoEstoque,
} from "@/types";

export async function listarMovimentacoesEstoque(): Promise<MovimentacaoEstoque[]> {
  const todas = await movimentacaoEstoqueRepository.getAll();
  return todas
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function listarMovimentacoesPorProduto(
  produtoId: EntityId
): Promise<MovimentacaoEstoque[]> {
  const todas = await listarMovimentacoesEstoque();
  return todas.filter((movimentacao) => movimentacao.produtoId === produtoId);
}

export interface NovaMovimentacaoEstoqueInput {
  produtoId: EntityId;
  tipo: TipoMovimentacaoEstoque;
  /** Positiva para entrada/saída; pode ser negativa apenas em "ajuste". */
  quantidade: number;
  motivo: MotivoMovimentacaoEstoque;
  pedidoId?: EntityId;
  observacao?: string;
}

/**
 * Erro lançado quando uma movimentação deixaria o estoque de um produto
 * negativo. O sistema nunca permite isso — nem por venda, nem por saída
 * manual, nem por ajuste.
 */
export class EstoqueInsuficienteError extends Error {
  constructor(
    public readonly nomeProduto: string,
    public readonly disponivel: number,
    public readonly solicitado: number
  ) {
    super(
      `Estoque insuficiente para "${nomeProduto}": disponível ${disponivel}, solicitado ${solicitado}.`
    );
    this.name = "EstoqueInsuficienteError";
  }
}

function calcularDelta(tipo: TipoMovimentacaoEstoque, quantidade: number): number {
  if (tipo === "entrada") return Math.abs(quantidade);
  if (tipo === "saida") return -Math.abs(quantidade);
  return quantidade; // "ajuste": o sinal é definido por quem chama
}

/**
 * Registra uma movimentação de estoque e atualiza `produto.estoqueAtual`
 * de forma consistente. É o único lugar do sistema que deve alterar o
 * estoque de um produto — e por isso é também o único lugar que precisa
 * impedir estoque negativo.
 */
export async function registrarMovimentacaoEstoque(
  input: NovaMovimentacaoEstoqueInput
): Promise<MovimentacaoEstoque> {
  const produto = await produtoRepository.getById(input.produtoId);
  if (!produto) {
    throw new Error("Produto não encontrado para registrar a movimentação de estoque.");
  }

  const delta = calcularDelta(input.tipo, input.quantidade);
  const novoEstoque = produto.estoqueAtual + delta;

  if (novoEstoque < 0) {
    throw new EstoqueInsuficienteError(produto.nome, produto.estoqueAtual, Math.abs(delta));
  }

  const movimentacao: MovimentacaoEstoque = {
    id: generateId(),
    criadoEm: nowIso(),
    ...input,
  };

  await movimentacaoEstoqueRepository.create(movimentacao);
  await produtoRepository.update(produto.id, {
    estoqueAtual: novoEstoque,
    updatedAt: nowIso(),
  });

  return movimentacao;
}

/**
 * Confere, sem gravar nada, se há estoque suficiente para atender uma
 * lista de itens (somando quantidades repetidas do mesmo produto).
 * Usado pelo PDV antes de finalizar uma venda, para nunca deixar o
 * pedido "meio salvo" por falta de um produto no meio do caminho.
 */
export async function verificarDisponibilidadeEstoque(
  itens: { produtoId: EntityId; quantidade: number }[]
): Promise<void> {
  const quantidadesPorProduto = new Map<EntityId, number>();
  for (const item of itens) {
    quantidadesPorProduto.set(
      item.produtoId,
      (quantidadesPorProduto.get(item.produtoId) ?? 0) + item.quantidade
    );
  }

  for (const [produtoId, quantidadeNecessaria] of quantidadesPorProduto) {
    const produto = await produtoRepository.getById(produtoId);
    if (!produto) continue;
    if (produto.estoqueAtual < quantidadeNecessaria) {
      throw new EstoqueInsuficienteError(
        produto.nome,
        produto.estoqueAtual,
        quantidadeNecessaria
      );
    }
  }
}
