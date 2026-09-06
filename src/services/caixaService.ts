import { sessaoCaixaRepository, movimentacaoCaixaRepository } from "@/storage";
import { generateId } from "@/utils/id";
import { nowIso } from "@/utils/date";
import { arredondarMoeda } from "@/utils/currency";
import type {
  EntityId,
  FormaPagamento,
  MovimentacaoCaixa,
  OrigemMovimentacaoCaixa,
  SessaoCaixa,
  TipoMovimentacaoCaixa,
} from "@/types";

export async function listarSessoesCaixa(): Promise<SessaoCaixa[]> {
  const sessoes = await sessaoCaixaRepository.getAll();
  return sessoes.slice().sort((a, b) => b.abertoEm.localeCompare(a.abertoEm));
}

export async function buscarSessaoCaixa(
  id: EntityId
): Promise<SessaoCaixa | null> {
  return sessaoCaixaRepository.getById(id);
}

export async function obterSessaoCaixaAberta(): Promise<SessaoCaixa | null> {
  const sessoes = await sessaoCaixaRepository.getAll();
  return sessoes.find((sessao) => sessao.status === "aberta") ?? null;
}

/**
 * Erro lançado ao tentar finalizar uma venda sem uma sessão de caixa
 * aberta. O PDV nunca deve vender "fora do caixa".
 */
export class CaixaFechadoError extends Error {
  constructor() {
    super("Não há caixa aberto. Abra o caixa antes de finalizar uma venda.");
    this.name = "CaixaFechadoError";
  }
}

export interface AbrirCaixaInput {
  valorAbertura: number;
  operador?: string;
  observacoes?: string;
}

/**
 * Abre uma nova sessão de caixa. Nunca permite duas sessões abertas ao
 * mesmo tempo — é a própria trava usada pelo PDV para saber se pode
 * vender ou não.
 */
export async function abrirCaixa(input: AbrirCaixaInput): Promise<SessaoCaixa> {
  const sessaoAberta = await obterSessaoCaixaAberta();
  if (sessaoAberta) {
    throw new Error("Já existe uma sessão de caixa aberta.");
  }

  const timestamp = nowIso();
  const sessao: SessaoCaixa = {
    id: generateId(),
    operador: input.operador,
    status: "aberta",
    abertoEm: timestamp,
    valorAbertura: arredondarMoeda(input.valorAbertura),
    observacoes: input.observacoes,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return sessaoCaixaRepository.create(sessao);
}

export async function listarMovimentacoesPorSessao(
  sessaoCaixaId: EntityId
): Promise<MovimentacaoCaixa[]> {
  const todas = await movimentacaoCaixaRepository.getAll();
  return todas
    .filter((movimentacao) => movimentacao.sessaoCaixaId === sessaoCaixaId)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export interface ResumoCaixa {
  valorAbertura: number;
  vendasDinheiro: number;
  vendasPix: number;
  vendasDebito: number;
  vendasCredito: number;
  totalSangrias: number;
  totalDespesas: number;
  totalEntradas: number;
  totalSaidas: number;
  /** valorAbertura + totalEntradas − totalSaidas */
  valorEsperado: number;
}

const BUCKET_POR_FORMA: Partial<Record<FormaPagamento, keyof ResumoCaixa>> = {
  dinheiro: "vendasDinheiro",
  pix: "vendasPix",
  debito: "vendasDebito",
  credito: "vendasCredito",
};

/**
 * Calcula o resumo financeiro de uma sessão: vendas por forma de
 * pagamento, sangrias, despesas e o valor esperado no caixa. Usado tanto
 * na tela de caixa aberto quanto na conferência de fechamento.
 */
export async function obterResumoSessao(sessaoCaixaId: EntityId): Promise<ResumoCaixa> {
  const sessao = await sessaoCaixaRepository.getById(sessaoCaixaId);
  const movimentacoes = await listarMovimentacoesPorSessao(sessaoCaixaId);

  const resumo: ResumoCaixa = {
    valorAbertura: sessao?.valorAbertura ?? 0,
    vendasDinheiro: 0,
    vendasPix: 0,
    vendasDebito: 0,
    vendasCredito: 0,
    totalSangrias: 0,
    totalDespesas: 0,
    totalEntradas: 0,
    totalSaidas: 0,
    valorEsperado: 0,
  };

  for (const movimentacao of movimentacoes) {
    if (movimentacao.tipo === "entrada") {
      resumo.totalEntradas = arredondarMoeda(resumo.totalEntradas + movimentacao.valor);
    } else {
      resumo.totalSaidas = arredondarMoeda(resumo.totalSaidas + movimentacao.valor);
    }

    if (movimentacao.origem === "venda" && movimentacao.formaPagamento) {
      const bucket = BUCKET_POR_FORMA[movimentacao.formaPagamento];
      if (bucket) {
        resumo[bucket] = arredondarMoeda((resumo[bucket] as number) + movimentacao.valor);
      }
    } else if (movimentacao.origem === "cancelamento" && movimentacao.formaPagamento) {
      // Estorno de uma venda cancelada: tira o valor de volta do bucket
      // daquela forma de pagamento, senão "vendas em dinheiro/Pix/..."
      // ficaria superestimado depois de um cancelamento.
      const bucket = BUCKET_POR_FORMA[movimentacao.formaPagamento];
      if (bucket) {
        resumo[bucket] = arredondarMoeda((resumo[bucket] as number) - movimentacao.valor);
      }
    } else if (movimentacao.origem === "sangria") {
      resumo.totalSangrias = arredondarMoeda(resumo.totalSangrias + movimentacao.valor);
    } else if (movimentacao.origem === "despesa") {
      resumo.totalDespesas = arredondarMoeda(resumo.totalDespesas + movimentacao.valor);
    }
  }

  resumo.valorEsperado = arredondarMoeda(
    resumo.valorAbertura + resumo.totalEntradas - resumo.totalSaidas
  );

  return resumo;
}

/**
 * Fecha a sessão de caixa, calculando o valor esperado a partir da
 * abertura + movimentações (entradas − saídas) e registrando o valor
 * contado manualmente pelo operador para conferência.
 */
export async function fecharCaixa(
  id: EntityId,
  valorFechamentoInformado: number
): Promise<SessaoCaixa | null> {
  const sessao = await sessaoCaixaRepository.getById(id);
  if (!sessao) return null;

  const resumo = await obterResumoSessao(id);

  return sessaoCaixaRepository.update(id, {
    status: "fechada",
    fechadoEm: nowIso(),
    valorFechamentoInformado: arredondarMoeda(valorFechamentoInformado),
    valorFechamentoCalculado: resumo.valorEsperado,
    updatedAt: nowIso(),
  });
}

export interface NovaMovimentacaoCaixaInput {
  sessaoCaixaId: EntityId;
  tipo: TipoMovimentacaoCaixa;
  origem: OrigemMovimentacaoCaixa;
  valor: number;
  motivo?: string;
  observacao?: string;
  formaPagamento?: FormaPagamento;
  pedidoId?: EntityId;
}

export async function registrarMovimentacaoCaixa(
  input: NovaMovimentacaoCaixaInput
): Promise<MovimentacaoCaixa> {
  const movimentacao: MovimentacaoCaixa = {
    id: generateId(),
    criadoEm: nowIso(),
    ...input,
    valor: arredondarMoeda(input.valor),
  };

  return movimentacaoCaixaRepository.create(movimentacao);
}

export interface SangriaOuDespesaInput {
  sessaoCaixaId: EntityId;
  valor: number;
  motivo: string;
  observacao?: string;
}

/** Registra uma sangria (retirada de dinheiro do caixa). */
export async function registrarSangria(
  input: SangriaOuDespesaInput
): Promise<MovimentacaoCaixa> {
  return registrarMovimentacaoCaixa({
    sessaoCaixaId: input.sessaoCaixaId,
    tipo: "saida",
    origem: "sangria",
    valor: input.valor,
    motivo: input.motivo,
    observacao: input.observacao,
  });
}

/** Registra uma despesa paga com o dinheiro do caixa. */
export async function registrarDespesa(
  input: SangriaOuDespesaInput
): Promise<MovimentacaoCaixa> {
  return registrarMovimentacaoCaixa({
    sessaoCaixaId: input.sessaoCaixaId,
    tipo: "saida",
    origem: "despesa",
    valor: input.valor,
    motivo: input.motivo,
    observacao: input.observacao,
  });
}
