import { storage } from "./instance";

/**
 * Gera o próximo número de uma sequência persistida (ex: número do pedido).
 * Genérico o suficiente para ser reaproveitado por outras sequências
 * futuras (ex: número da sessão de caixa).
 */
export async function proximoNumeroSequencial(chave: string): Promise<number> {
  const atual = (await storage.get<number>(chave)) ?? 0;
  const proximo = atual + 1;
  await storage.set(chave, proximo);
  return proximo;
}

/** Lê o valor atual de uma sequência sem incrementá-la. */
export async function obterNumeroSequencialAtual(chave: string): Promise<number> {
  return (await storage.get<number>(chave)) ?? 0;
}
