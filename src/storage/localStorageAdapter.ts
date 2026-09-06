import type { StorageAdapter } from "./StorageAdapter";

/**
 * Prefixo aplicado a todas as chaves gravadas no localStorage,
 * evitando colisão com outras aplicações rodando na mesma origem.
 */
const NAMESPACE = "dogao-da-praca";

function namespacedKey(key: string): string {
  return `${NAMESPACE}:${key}`;
}

/**
 * Implementação de StorageAdapter usando `window.localStorage`.
 *
 * A API é assíncrona (retorna Promises) mesmo o localStorage sendo síncrono,
 * de propósito: assim o restante do app já é escrito "como se" o storage
 * pudesse ser remoto, e a troca futura para Supabase não exige refatorar
 * quem consome este adapter.
 */
export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = window.localStorage.getItem(namespacedKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`[storage] Falha ao ler a chave "${key}":`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      window.localStorage.setItem(namespacedKey(key), JSON.stringify(value));
    } catch (error) {
      console.error(`[storage] Falha ao gravar a chave "${key}":`, error);
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(namespacedKey(key));
  }

  async keys(prefix = ""): Promise<string[]> {
    const fullPrefix = namespacedKey(prefix);
    const result: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        result.push(key.slice(NAMESPACE.length + 1));
      }
    }

    return result;
  }

  async clear(): Promise<void> {
    const allKeys = await this.keys();
    allKeys.forEach((key) => window.localStorage.removeItem(namespacedKey(key)));
  }
}
