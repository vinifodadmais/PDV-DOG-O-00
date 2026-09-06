import type { MapeamentoTabela } from "@/storage/createSupabaseRepository";
import type { MovimentacaoCaixa } from "@/types";

export interface MovimentacaoCaixaRow {
  id: string;
  cash_session_id: string;
  type: string;
  origin: string;
  amount: number | string;
  reason: string | null;
  note: string | null;
  payment_method: string | null;
  sale_id: string | null;
  created_at: string;
}

export const movimentacaoCaixaMapeamento: MapeamentoTabela<MovimentacaoCaixa, MovimentacaoCaixaRow> = {
  paraLinha(movimentacao) {
    return {
      id: movimentacao.id,
      cash_session_id: movimentacao.sessaoCaixaId,
      type: movimentacao.tipo,
      origin: movimentacao.origem,
      amount: movimentacao.valor,
      reason: movimentacao.motivo ?? null,
      note: movimentacao.observacao ?? null,
      payment_method: movimentacao.formaPagamento ?? null,
      sale_id: movimentacao.pedidoId ?? null,
      created_at: movimentacao.criadoEm,
    };
  },

  paraLinhaParcial() {
    // Movimentações de caixa são imutáveis depois de criadas (mesma
    // regra do resto do sistema) — nunca há update, então isto nunca é
    // chamado de verdade, mas precisa existir pra satisfazer a interface.
    return {};
  },

  paraEntidade(row) {
    return {
      id: row.id,
      sessaoCaixaId: row.cash_session_id,
      tipo: row.type === "entrada" ? "entrada" : "saida",
      origem: row.origin as MovimentacaoCaixa["origem"],
      valor: Number(row.amount),
      motivo: row.reason ?? undefined,
      observacao: row.note ?? undefined,
      formaPagamento: (row.payment_method as MovimentacaoCaixa["formaPagamento"]) ?? undefined,
      pedidoId: row.sale_id ?? undefined,
      criadoEm: row.created_at,
    };
  },
};
