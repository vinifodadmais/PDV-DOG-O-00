/**
 * Chaves das coleções persistidas. Centralizadas aqui para que nenhuma
 * outra parte do app precise "adivinhar" ou repetir strings soltas.
 */
export const COLLECTIONS = {
  categorias: "categorias",
  produtos: "produtos",
  pedidos: "pedidos",
  sessoesCaixa: "sessoes-caixa",
  movimentacoesCaixa: "movimentacoes-caixa",
  movimentacoesEstoque: "movimentacoes-estoque",
} as const;

/**
 * Chaves de valores avulsos de configuração/controle (não são coleções).
 */
export const CONFIG_KEYS = {
  seedVersao: "config:seed-versao",
  pedidoSequencia: "config:pedido-sequencia",
  impressoraCortarPapel: "config:impressora-cortar-papel",
  impressoraImprimirAutomaticamente: "config:impressora-imprimir-automaticamente",
  impressoraNomeSelecionada: "config:impressora-nome-selecionada",
} as const;
