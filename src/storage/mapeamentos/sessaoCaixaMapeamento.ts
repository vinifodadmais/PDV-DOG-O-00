import type { MapeamentoTabela } from "@/storage/createSupabaseRepository";
import type { SessaoCaixa } from "@/types";

export interface SessaoCaixaRow {
  id: string;
  operator_id: string;
  status: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number | string;
  closing_amount_declared: number | string | null;
  closing_amount_calculated: number | string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const sessaoCaixaMapeamento: MapeamentoTabela<SessaoCaixa, SessaoCaixaRow> = {
  paraLinha(sessao) {
    return {
      id: sessao.id,
      // operator_id é preenchido pelo próprio banco (default auth.uid())
      // — não enviamos aqui, ver `caixaSupabaseService.abrirCaixa`.
      operator_id: "",
      status: sessao.status === "aberta" ? "aberta" : "fechada",
      opened_at: sessao.abertoEm,
      closed_at: sessao.fechadoEm ?? null,
      opening_amount: sessao.valorAbertura,
      closing_amount_declared: sessao.valorFechamentoInformado ?? null,
      closing_amount_calculated: sessao.valorFechamentoCalculado ?? null,
      notes: sessao.observacoes ?? null,
      created_at: sessao.createdAt,
      updated_at: sessao.updatedAt,
    };
  },

  paraLinhaParcial(patch) {
    const linha: Record<string, unknown> = {};
    if (patch.status !== undefined) linha.status = patch.status;
    if (patch.fechadoEm !== undefined) linha.closed_at = patch.fechadoEm ?? null;
    if (patch.valorFechamentoInformado !== undefined) {
      linha.closing_amount_declared = patch.valorFechamentoInformado ?? null;
    }
    if (patch.valorFechamentoCalculado !== undefined) {
      linha.closing_amount_calculated = patch.valorFechamentoCalculado ?? null;
    }
    if (patch.observacoes !== undefined) linha.notes = patch.observacoes ?? null;
    if (patch.updatedAt !== undefined) linha.updated_at = patch.updatedAt;
    return linha;
  },

  paraEntidade(row) {
    return {
      id: row.id,
      status: row.status === "aberta" ? "aberta" : "fechada",
      abertoEm: row.opened_at,
      fechadoEm: row.closed_at ?? undefined,
      valorAbertura: Number(row.opening_amount),
      valorFechamentoInformado:
        row.closing_amount_declared !== null ? Number(row.closing_amount_declared) : undefined,
      valorFechamentoCalculado:
        row.closing_amount_calculated !== null ? Number(row.closing_amount_calculated) : undefined,
      observacoes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
