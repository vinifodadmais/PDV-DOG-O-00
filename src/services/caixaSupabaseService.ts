import { createSupabaseRepository } from "@/storage/createSupabaseRepository";
import { sessaoCaixaMapeamento, type SessaoCaixaRow } from "@/storage/mapeamentos/sessaoCaixaMapeamento";
import {
  movimentacaoCaixaMapeamento,
  type MovimentacaoCaixaRow,
} from "@/storage/mapeamentos/movimentacaoCaixaMapeamento";
import { supabase } from "@/lib/supabase";
import { arredondarMoeda } from "@/utils/currency";
import type {
  EntityId,
  FormaPagamento,
  MovimentacaoCaixa,
  OrigemMovimentacaoCaixa,
  SessaoCaixa,
  TipoMovimentacaoCaixa,
} from "@/types";

/**
 * ============================================================================
 * FASE 4 da migração do PDV: caixa via Supabase (`cash_sessions` +
 * `cash_movements`). Mesma API do `caixaService.ts` local (mesmos nomes
 * de função, mesmos tipos de entrada) de propósito — só troca a origem
 * dos dados, então `Caixa.tsx`/`Vendas.tsx` trocam de import sem
 * precisar reescrever a UI.
 *
 * A entrada de caixa gerada por uma VENDA não passa por aqui — ela é
 * criada dentro da própria RPC `finalize_sale` (mesma transação da
 * venda/estoque, ver `supabase/schema_fase4_caixa.sql`). Este arquivo
 * cobre só abrir/fechar caixa e sangria/despesa manuais.
 * ============================================================================
 */

const sessaoCaixaSupabaseRepository = createSupabaseRepository<SessaoCaixa, SessaoCaixaRow>(
  "cash_sessions",
  sessaoCaixaMapeamento
);

const movimentacaoCaixaSupabaseRepository = createSupabaseRepository<MovimentacaoCaixa, MovimentacaoCaixaRow>(
  "cash_movements",
  movimentacaoCaixaMapeamento
);

export async function listarSessoesCaixa(): Promise<SessaoCaixa[]> {
  const sessoes = await sessaoCaixaSupabaseRepository.getAll();
  return sessoes.slice().sort((a, b) => b.abertoEm.localeCompare(a.abertoEm));
}

export async function buscarSessaoCaixa(id: EntityId): Promise<SessaoCaixa | null> {
  return sessaoCaixaSupabaseRepository.getById(id);
}

export async function obterSessaoCaixaAberta(): Promise<SessaoCaixa | null> {
  const sessoes = await sessaoCaixaSupabaseRepository.getAll();
  return sessoes.find((sessao) => sessao.status === "aberta") ?? null;
}

export interface AbrirCaixaInput {
  valorAbertura: number;
  operador?: string;
  observacoes?: string;
}

/**
 * Abre uma sessão de caixa. A checagem "só uma sessão aberta por vez" é
 * feita aqui de forma amigável (mensagem clara) E garantida de verdade
 * pelo índice único parcial que já existe no banco
 * (`uq_cash_sessions_only_one_open`) — mesmo em caso de corrida entre
 * duas abas, o banco rejeita a segunda tentativa.
 */
export async function abrirCaixa(input: AbrirCaixaInput): Promise<SessaoCaixa> {
  if (!supabase) {
    throw new Error("Supabase não está configurado.");
  }

  const sessaoAberta = await obterSessaoCaixaAberta();
  if (sessaoAberta) {
    throw new Error("Já existe uma sessão de caixa aberta.");
  }

  const { data: sessaoUsuario } = await supabase.auth.getSession();
  const usuarioId = sessaoUsuario.session?.user.id;
  if (!usuarioId) {
    throw new Error("Sessão de usuário não encontrada — faça login novamente.");
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      operator_id: usuarioId,
      status: "aberta",
      opened_at: timestamp,
      opening_amount: arredondarMoeda(input.valorAbertura),
      notes: input.observacoes ?? null,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select()
    .single();

  if (error) {
    if (error.message.includes("uq_cash_sessions_only_one_open")) {
      throw new Error("Já existe uma sessão de caixa aberta.");
    }
    throw new Error(error.message);
  }

  return sessaoCaixaMapeamento.paraEntidade(data as SessaoCaixaRow);
}

export async function listarMovimentacoesPorSessao(
  sessaoCaixaId: EntityId
): Promise<MovimentacaoCaixa[]> {
  const todas = await movimentacaoCaixaSupabaseRepository.getAll();
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
  valorEsperado: number;
}

const BUCKET_POR_FORMA: Partial<Record<FormaPagamento, keyof ResumoCaixa>> = {
  dinheiro: "vendasDinheiro",
  pix: "vendasPix",
  debito: "vendasDebito",
  credito: "vendasCredito",
};

/** Mesmo cálculo do caixaService local, só que sobre as movimentações do Supabase. */
export async function obterResumoSessao(sessaoCaixaId: EntityId): Promise<ResumoCaixa> {
  const sessao = await sessaoCaixaSupabaseRepository.getById(sessaoCaixaId);
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

/** Fecha a sessão — só altera status/closed_at/valores de fechamento (mesmos campos que o trigger de segurança já permite pra qualquer funcionário ativo). */
export async function fecharCaixa(
  id: EntityId,
  valorFechamentoInformado: number
): Promise<SessaoCaixa | null> {
  const resumo = await obterResumoSessao(id);

  return sessaoCaixaSupabaseRepository.update(id, {
    status: "fechada",
    fechadoEm: new Date().toISOString(),
    valorFechamentoInformado: arredondarMoeda(valorFechamentoInformado),
    valorFechamentoCalculado: resumo.valorEsperado,
    updatedAt: new Date().toISOString(),
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

async function registrarMovimentacaoCaixa(
  input: NovaMovimentacaoCaixaInput
): Promise<MovimentacaoCaixa> {
  const timestamp = new Date().toISOString();
  return movimentacaoCaixaSupabaseRepository.create({
    id: crypto.randomUUID(),
    ...input,
    valor: arredondarMoeda(input.valor),
    criadoEm: timestamp,
  });
}

export interface SangriaOuDespesaInput {
  sessaoCaixaId: EntityId;
  valor: number;
  motivo: string;
  observacao?: string;
}

/** Sangria (retirada) — RLS já permite qualquer funcionário ativo registrar, sem precisar de RPC. */
export async function registrarSangria(input: SangriaOuDespesaInput): Promise<MovimentacaoCaixa> {
  return registrarMovimentacaoCaixa({
    sessaoCaixaId: input.sessaoCaixaId,
    tipo: "saida",
    origem: "sangria",
    valor: input.valor,
    motivo: input.motivo,
    observacao: input.observacao,
  });
}

/** Despesa paga com o dinheiro do caixa — mesma observação da sangria. */
export async function registrarDespesa(input: SangriaOuDespesaInput): Promise<MovimentacaoCaixa> {
  return registrarMovimentacaoCaixa({
    sessaoCaixaId: input.sessaoCaixaId,
    tipo: "saida",
    origem: "despesa",
    valor: input.valor,
    motivo: input.motivo,
    observacao: input.observacao,
  });
}
