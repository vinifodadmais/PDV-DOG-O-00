import type { EntityId, Timestamped } from "./common";

/**
 * Ciclo de vida do pedido:
 * "aberto"      -> carrinho em andamento, ainda não pago (via criarPedido)
 * "recebido"    -> pago, acabou de entrar na cozinha (via finalizarVenda)
 * "em_preparo"  -> em preparação
 * "pronto"      -> pronto para entrega/retirada
 * "finalizado"  -> entregue/concluído
 * "cancelado"   -> cancelado (devolve estoque e ajusta caixa quando pago)
 */
export type StatusPedido =
  | "aberto"
  | "recebido"
  | "em_preparo"
  | "pronto"
  | "finalizado"
  | "cancelado";
export type TipoConsumo = "balcao" | "viagem" | "entrega";
export type FormaPagamento = "dinheiro" | "pix" | "debito" | "credito" | "outro";

/**
 * Um adicional vinculado a um item do pedido (ex: "Bacon" no X-Burguer).
 * É um produto real (mesmo preço oficial, mesma baixa de estoque) — só
 * que gravado como filho da linha do item principal, nunca como venda
 * independente.
 */
export interface ItemAdicionalPedido {
  id: EntityId;
  produtoId: EntityId;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

/**
 * Item de um pedido. Guarda uma "foto" do nome e do preço do produto no
 * momento da venda, para que alterações futuras no cadastro do produto
 * não afetem pedidos já registrados.
 */
export interface ItemPedido {
  id: EntityId;
  produtoId: EntityId;
  produtoNome: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
  subtotal: number;
  /** Adicionais vinculados a este item específico (ex: Bacon, Catupiry no X-Burguer). */
  adicionais?: ItemAdicionalPedido[];
}

export interface Pagamento {
  id: EntityId;
  forma: FormaPagamento;
  valor: number;
  /** Preenchido apenas quando `forma` é "dinheiro". */
  troco?: number;
  criadoEm: string;
}

export interface Pedido extends Timestamped {
  id: EntityId;
  /** Número sequencial exibido para o cliente/operador (ex: "Pedido #12"). */
  numero: number;
  status: StatusPedido;
  tipoConsumo: TipoConsumo;
  itens: ItemPedido[];
  pagamentos: Pagamento[];
  subtotal: number;
  desconto: number;
  /** Taxa de entrega — sempre 0 quando tipoConsumo não é "entrega". */
  taxaEntrega: number;
  total: number;
  /** Nome do cliente — opcional, venda sem nome continua funcionando normalmente. */
  nomeCliente?: string;
  observacoes?: string;
}
