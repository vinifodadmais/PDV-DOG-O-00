import { LocalStorageAdapter } from "./localStorageAdapter";
import type { StorageAdapter } from "./StorageAdapter";

/**
 * Instância única de storage usada por toda a aplicação.
 *
 * Hoje: localStorage.
 * Amanhã: troque a linha abaixo por, por exemplo,
 *   export const storage: StorageAdapter = new SupabaseAdapter();
 * e todo o app passa a persistir no Supabase sem outras mudanças.
 *
 * Fica em um arquivo próprio (em vez de em `index.ts`) para evitar
 * import circular com `repositories.ts`, que também depende desta
 * instância.
 */
export const storage: StorageAdapter = new LocalStorageAdapter();
