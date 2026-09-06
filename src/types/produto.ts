import type { EntityId, Timestamped } from "./common";

/**
 * Produto vendável no cardápio (ex: X-Bacon, Dog Especial).
 * `estoqueAtual` é um valor "em cache", mantido em sincronia pelas
 * movimentações de estoque (ver `MovimentacaoEstoque`) — nunca deve ser
 * editado diretamente fora do serviço de estoque.
 */
export interface Produto extends Timestamped {
  id: EntityId;
  categoriaId: EntityId;
  nome: string;
  descricao?: string;
  preco: number;
  /** Custo de produção/compra, usado para acompanhar a margem. Opcional. */
  custo?: number;
  /** Unidade de venda: "un", "kg", "ml"... */
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  /** Imagem opcional do produto, como data URL (base64) já redimensionada. */
  imagemUrl?: string;
  ativo: boolean;
}
