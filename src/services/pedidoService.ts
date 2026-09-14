import { pedidoRepository, proximoNumeroSequencial, CONFIG_KEYS } from "@/storage";
import { generateId } from "@/utils/id";
import { nowIso } from "@/utils/date";
import { arredondarMoeda } from "@/utils/currency";
import {
  registrarMovimentacaoEstoque,
  verificarDisponibilidadeEstoque,
} from "./estoqueService";
import {
  obterSessaoCaixaAberta,
  registrarMovimentacaoCaixa,
  listarMovimentacoesPorSessao,
  CaixaFechadoError,
} from "./caixaService";
import type {
  EntityId,
  FormaPagamento,
  ItemPedido,
  Pagamento,
  Pedido,
  StatusPedido,
  TipoConsumo,
} from "@/types";

/**
 * Estados do pedido que já passaram pelo pagamento (ou seja, já deram
 * baixa no estoque e lançaram entrada no caixa). Usado para decidir se
 * um cancelamento precisa estornar estoque/caixa.
 */
const STATUSES_PAGOS: StatusPedido[] = ["recebido", "em_preparo", "pronto", "finalizado"];

export function pedidoFoiPago(status: StatusPedido): boolean {
  return STATUSES_PAGOS.includes(status);
}

/**
 * Ordem "natural" do fluxo de cozinha, usada só como sugestão de próximo
 * passo na UI (o operador pode escolher qualquer status manualmente).
 */
export const SEQUENCIA_STATUS_PEDIDO: StatusPedido[] = [
  "recebido",
  "em_preparo",
  "pronto",
  "finalizado",
];

export async function listarPedidos(): Promise<Pedido[]> {
  return pedidoRepository.getAll();
}

export async function listarPedidosPorStatus(
  status: StatusPedido
): Promise<Pedido[]> {
  const pedidos = await listarPedidos();
  return pedidos.filter((pedido) => pedido.status === status);
}

export async function buscarPedido(id: EntityId): Promise<Pedido | null> {
  return pedidoRepository.getById(id);
}

export interface NovoItemPedidoInput {
  produtoId: EntityId;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
}

export interface NovoPedidoInput {
  tipoConsumo: TipoConsumo;
  itens: NovoItemPedidoInput[];
  observacoes?: string;
}

function montarItens(itens: NovoItemPedidoInput[]): ItemPedido[] {
  return itens.map((item) => ({
    id: generateId(),
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
    observacao: item.observacao,
    subtotal: item.quantidade * item.precoUnitario,
  }));
}

/**
 * Cria um pedido em aberto, com número sequencial automático.
 * Esta é apenas a criação do registro — o fluxo completo de venda
 * (adicionar pagamento, finalizar, baixar estoque, lançar no caixa)
 * será implementado em uma etapa futura.
 */
export async function criarPedido(input: NovoPedidoInput): Promise<Pedido> {
  const timestamp = nowIso();
  const numero = await proximoNumeroSequencial(CONFIG_KEYS.pedidoSequencia);
  const itens = montarItens(input.itens);
  const subtotal = itens.reduce((soma, item) => soma + item.subtotal, 0);

  const pedido: Pedido = {
    id: generateId(),
    numero,
    status: "aberto",
    tipoConsumo: input.tipoConsumo,
    // Pedido local (legado) ainda em aberto — sem pagamento registrado
    // ainda, então "nao_pago"/"levar" são os defaults mais neutros aqui.
    statusPagamento: "nao_pago",
    opcaoConsumo: "levar",
    itens,
    pagamentos: [],
    subtotal,
    desconto: 0,
    taxaEntrega: 0,
    total: subtotal,
    observacoes: input.observacoes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return pedidoRepository.create(pedido);
}

export async function atualizarPedido(
  id: EntityId,
  patch: Partial<Omit<Pedido, "id" | "createdAt">>
): Promise<Pedido | null> {
  return pedidoRepository.update(id, { ...patch, updatedAt: nowIso() });
}

/**
 * Altera o status "de cozinha" do pedido (recebido → em preparo → pronto
 * → finalizado). Não aceita "cancelado" aqui de propósito — cancelar tem
 * uma rotina própria (`cancelarPedido`) que também devolve estoque e
 * ajusta o caixa quando necessário.
 */
export async function atualizarStatusPedido(
  id: EntityId,
  novoStatus: Exclude<StatusPedido, "cancelado">
): Promise<Pedido> {
  const pedido = await pedidoRepository.getById(id);
  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }
  if (pedido.status === "cancelado") {
    throw new PedidoJaCanceladoError();
  }

  const atualizado = await pedidoRepository.update(id, {
    status: novoStatus,
    updatedAt: nowIso(),
  });

  if (!atualizado) {
    throw new Error("Não foi possível atualizar o status do pedido.");
  }
  return atualizado;
}

export async function excluirPedido(id: EntityId): Promise<void> {
  return pedidoRepository.remove(id);
}

export interface NovoPagamentoInput {
  forma: FormaPagamento;
  valor: number;
  /** Troco devolvido ao cliente. Só faz sentido para pagamento em dinheiro. */
  troco?: number;
}

export interface FinalizarVendaInput {
  itens: NovoItemPedidoInput[];
  pagamentos: NovoPagamentoInput[];
  desconto?: number;
  tipoConsumo?: TipoConsumo;
  observacoes?: string;
}

/**
 * Erro específico para quando a soma dos pagamentos não cobre o total do
 * pedido — permite que a tela distinga isso de uma falha inesperada de
 * storage e mostre uma mensagem amigável.
 */
export class PagamentoInsuficienteError extends Error {
  constructor(faltando: number) {
    super(
      `O valor pago é insuficiente. Faltam ${faltando.toFixed(2)} para completar o total.`
    );
    this.name = "PagamentoInsuficienteError";
  }
}

/**
 * Finaliza uma venda do PDV: gera o número sequencial do pedido, monta os
 * itens e os pagamentos, calcula os totais e salva tudo já com status
 * "recebido" (pago, indo para a cozinha) em uma única gravação. Também dá
 * baixa automática no estoque de cada item vendido e lança a entrada
 * correspondente no caixa aberto (separada por forma de pagamento).
 *
 * Exige uma sessão de caixa aberta — é assim que o sistema "impede novas
 * vendas até abrir outro caixa".
 */
export async function finalizarVenda(input: FinalizarVendaInput): Promise<Pedido> {
  const sessaoCaixa = await obterSessaoCaixaAberta();
  if (!sessaoCaixa) {
    throw new CaixaFechadoError();
  }

  const itens = montarItens(input.itens);
  const subtotal = arredondarMoeda(
    itens.reduce((soma, item) => soma + item.subtotal, 0)
  );
  const desconto = arredondarMoeda(
    Math.min(Math.max(input.desconto ?? 0, 0), subtotal)
  );
  const total = arredondarMoeda(subtotal - desconto);

  const valorPago = arredondarMoeda(
    input.pagamentos.reduce((soma, pagamento) => soma + pagamento.valor, 0)
  );
  if (valorPago < total) {
    throw new PagamentoInsuficienteError(arredondarMoeda(total - valorPago));
  }

  // Confere estoque de TODOS os itens antes de gravar qualquer coisa —
  // evita ficar com um pedido "meio salvo" se faltar um produto no meio
  // do caminho, e nunca deixa o estoque ficar negativo.
  await verificarDisponibilidadeEstoque(
    itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade }))
  );

  const timestamp = nowIso();
  const numero = await proximoNumeroSequencial(CONFIG_KEYS.pedidoSequencia);

  const pagamentos: Pagamento[] = input.pagamentos.map((pagamento) => ({
    id: generateId(),
    forma: pagamento.forma,
    valor: arredondarMoeda(pagamento.valor),
    troco: pagamento.troco !== undefined ? arredondarMoeda(pagamento.troco) : undefined,
    criadoEm: timestamp,
  }));

  const pedido: Pedido = {
    id: generateId(),
    numero,
    status: "recebido",
    tipoConsumo: input.tipoConsumo ?? "balcao",
    // Este fluxo legado (localStorage) só finaliza depois de conferir que
    // o valor pago cobre o total (ver `PagamentoInsuficienteError` acima)
    // — ou seja, aqui a venda é sempre "pago". "levar" é o default neutro
    // pra Comer aqui/Levar, que este fluxo legado não coleta.
    statusPagamento: "pago",
    opcaoConsumo: "levar",
    itens,
    pagamentos,
    subtotal,
    desconto,
    taxaEntrega: 0,
    total,
    observacoes: input.observacoes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const pedidoSalvo = await pedidoRepository.create(pedido);

  // Baixa automática de estoque — um lançamento de "saída" por item,
  // já vinculado ao pedido para aparecer no histórico de movimentações.
  for (const item of itens) {
    await registrarMovimentacaoEstoque({
      produtoId: item.produtoId,
      tipo: "saida",
      quantidade: item.quantidade,
      motivo: "venda",
      pedidoId: pedidoSalvo.id,
      observacao: `Baixa automática — pedido #${numero}`,
    });
  }

  // Lança no caixa aberto uma entrada por forma de pagamento. Para
  // dinheiro, o valor lançado é líquido do troco (o que efetivamente
  // fica na gaveta), não o valor recebido em mãos.
  for (const pagamento of pagamentos) {
    const valorLiquido =
      pagamento.forma === "dinheiro"
        ? arredondarMoeda(pagamento.valor - (pagamento.troco ?? 0))
        : pagamento.valor;

    await registrarMovimentacaoCaixa({
      sessaoCaixaId: sessaoCaixa.id,
      tipo: "entrada",
      origem: "venda",
      valor: valorLiquido,
      formaPagamento: pagamento.forma,
      pedidoId: pedidoSalvo.id,
      motivo: `Venda — pedido #${numero}`,
    });
  }

  return pedidoSalvo;
}

/**
 * Erro lançado ao tentar cancelar um pedido que já está cancelado —
 * evita devolver o mesmo estoque para o inventário duas vezes.
 */
export class PedidoJaCanceladoError extends Error {
  constructor() {
    super("Este pedido já está cancelado.");
    this.name = "PedidoJaCanceladoError";
  }
}

/**
 * Cancela um pedido. Se ele já tinha sido pago (qualquer status
 * "recebido" → "finalizado", ver `pedidoFoiPago`), devolve
 * automaticamente a quantidade de cada item ao estoque, com motivo
 * "cancelamento". Pedidos ainda "abertos" são apenas marcados como
 * cancelados, já que nunca chegaram a baixar estoque nem a pagar.
 *
 * Se a venda original lançou entradas na sessão de caixa que está
 * aberta *agora*, também lança os estornos correspondentes (saída, com
 * origem "cancelamento"). Se a sessão já foi fechada nesse meio tempo,
 * o histórico dela não é alterado — o estorno só se aplica à sessão
 * corrente.
 */
export async function cancelarPedido(id: EntityId, motivo?: string): Promise<Pedido> {
  const pedido = await pedidoRepository.getById(id);
  if (!pedido) {
    throw new Error("Pedido não encontrado.");
  }
  if (pedido.status === "cancelado") {
    throw new PedidoJaCanceladoError();
  }

  if (pedidoFoiPago(pedido.status)) {
    const observacaoBase = `Devolução — cancelamento do pedido #${pedido.numero}`;
    for (const item of pedido.itens) {
      await registrarMovimentacaoEstoque({
        produtoId: item.produtoId,
        tipo: "entrada",
        quantidade: item.quantidade,
        motivo: "cancelamento",
        pedidoId: pedido.id,
        observacao: motivo ? `${observacaoBase}: ${motivo}` : observacaoBase,
      });
    }

    const sessaoCaixa = await obterSessaoCaixaAberta();
    if (sessaoCaixa) {
      const movimentacoesDaVenda = (
        await listarMovimentacoesPorSessao(sessaoCaixa.id)
      ).filter((m) => m.origem === "venda" && m.pedidoId === pedido.id);

      for (const movimentacao of movimentacoesDaVenda) {
        await registrarMovimentacaoCaixa({
          sessaoCaixaId: sessaoCaixa.id,
          tipo: "saida",
          origem: "cancelamento",
          valor: movimentacao.valor,
          formaPagamento: movimentacao.formaPagamento,
          pedidoId: pedido.id,
          motivo: `Estorno — cancelamento do pedido #${pedido.numero}`,
        });
      }
    }
  }

  const atualizado = await pedidoRepository.update(id, {
    status: "cancelado",
    updatedAt: nowIso(),
  });

  if (!atualizado) {
    throw new Error("Não foi possível cancelar o pedido.");
  }

  return atualizado;
}
