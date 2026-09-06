import type { EntityId, Timestamped } from "./common";
import type { FormaPagamento } from "./pedido";

export type StatusSessaoCaixa = "aberta" | "fechada";
export type TipoMovimentacaoCaixa = "entrada" | "saida";
export type OrigemMovimentacaoCaixa =
  | "venda"
  | "sangria"
  | "despesa"
  | "reforco"
  | "cancelamento"
  | "ajuste";

/**
 * Um turno de caixa: da abertura até o fechamento.
 * `valorFechamentoCalculado` é derivado das movimentações da sessão
 * (abertura + entradas − saídas); `valorFechamentoInformado` é o valor
 * contado manualmente pelo operador ao fechar, para permitir conferência.
 */
export interface SessaoCaixa extends Timestamped {
  id: EntityId;
  operador?: string;
  status: StatusSessaoCaixa;
  abertoEm: string;
  fechadoEm?: string;
  valorAbertura: number;
  valorFechamentoInformado?: number;
  valorFechamentoCalculado?: number;
  observacoes?: string;
}

/**
 * Movimentação financeira dentro de uma sessão de caixa (venda, sangria,
 * despesa, reforço, estorno por cancelamento ou ajuste manual).
 */
export interface MovimentacaoCaixa {
  id: EntityId;
  sessaoCaixaId: EntityId;
  tipo: TipoMovimentacaoCaixa;
  origem: OrigemMovimentacaoCaixa;
  valor: number;
  /** Motivo curto (ex: "Troco para segunda-feira", "Compra de gelo"). */
  motivo?: string;
  /** Observação livre adicional. */
  observacao?: string;
  /** Preenchido quando `origem` é "venda" ou "cancelamento". */
  formaPagamento?: FormaPagamento;
  /** Preenchido quando `origem` é "venda" ou "cancelamento". */
  pedidoId?: EntityId;
  criadoEm: string;
}
