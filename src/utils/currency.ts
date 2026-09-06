/**
 * Formata um valor numérico como moeda brasileira (R$).
 * Centralizado aqui para não repetir `toLocaleString` em cada tela.
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Arredonda para 2 casas decimais, evitando erros de ponto flutuante ao
 * comparar/somar valores em dinheiro (ex: 0.1 + 0.2 !== 0.3 em JS).
 */
export function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
