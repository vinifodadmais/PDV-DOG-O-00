import type { EntityId } from "./common";

export type TipoMovimentacaoEstoque = "entrada" | "saida" | "ajuste";
export type MotivoMovimentacaoEstoque =
  | "compra"
  | "venda"
  | "perda"
  | "ajuste_manual"
  | "cancelamento"
  | "inicial";

/**
 * Movimentação de estoque de um produto.
 *
 * `quantidade` é positiva para "entrada" e "saida" (a direção do efeito
 * vem do campo `tipo`). Só pode ser negativa quando `tipo` é "ajuste",
 * representando uma correção manual para baixo.
 *
 * O motivo "cancelamento" é usado quando o estoque é devolvido por causa
 * do cancelamento de uma venda já finalizada.
 */
export interface MovimentacaoEstoque {
  id: EntityId;
  produtoId: EntityId;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo: MotivoMovimentacaoEstoque;
  /** Preenchido quando `motivo` é "venda". */
  pedidoId?: EntityId;
  observacao?: string;
  criadoEm: string;
}
