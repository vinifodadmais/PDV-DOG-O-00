import { storage as defaultStorage } from "./instance";
import type { StorageAdapter } from "./StorageAdapter";
import type { Repository } from "./Repository";
import type { EntityId } from "../types/common";

/**
 * Cria um `Repository<T>` que guarda toda a coleção como um array em uma
 * única chave do `StorageAdapter` — o formato natural para localStorage.
 *
 * Cada chamada de leitura (`getAll`) lê o storage na hora, sem cache em
 * memória. Isso é proposital: garante que, se o usuário recarregar a
 * página ou abrir em outra aba, os dados lidos são sempre os que estão
 * realmente persistidos.
 */
export function createLocalRepository<T extends { id: EntityId }>(
  collectionKey: string,
  adapter: StorageAdapter = defaultStorage
): Repository<T> {
  async function getAll(): Promise<T[]> {
    return (await adapter.get<T[]>(collectionKey)) ?? [];
  }

  async function getById(id: EntityId): Promise<T | null> {
    const all = await getAll();
    return all.find((item) => item.id === id) ?? null;
  }

  async function create(item: T): Promise<T> {
    const all = await getAll();
    all.push(item);
    await adapter.set(collectionKey, all);
    return item;
  }

  async function update(
    id: EntityId,
    patch: Partial<Omit<T, "id">>
  ): Promise<T | null> {
    const all = await getAll();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updated = { ...all[index], ...patch } as T;
    all[index] = updated;
    await adapter.set(collectionKey, all);
    return updated;
  }

  async function remove(id: EntityId): Promise<void> {
    const all = await getAll();
    await adapter.set(
      collectionKey,
      all.filter((item) => item.id !== id)
    );
  }

  async function clear(): Promise<void> {
    await adapter.remove(collectionKey);
  }

  async function replaceAll(items: T[]): Promise<void> {
    await adapter.set(collectionKey, items);
  }

  return { getAll, getById, create, update, remove, clear, replaceAll };
}
