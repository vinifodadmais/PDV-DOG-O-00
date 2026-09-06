/**
 * Contrato de armazenamento usado por toda a aplicação.
 *
 * A ideia é que NENHUM componente, hook ou service converse diretamente
 * com `window.localStorage`. Em vez disso, todos usam esta interface.
 *
 * Quando o projeto migrar para Supabase, basta criar um novo arquivo
 * (ex: `supabaseAdapter.ts`) que implemente `StorageAdapter` e trocar
 * a instância exportada em `storage/index.ts`. Nenhum outro arquivo do
 * projeto precisará ser alterado.
 */
export interface StorageAdapter {
  /** Lê um valor pela chave. Retorna `null` se não existir. */
  get<T>(key: string): Promise<T | null>;

  /** Grava um valor na chave informada. */
  set<T>(key: string, value: T): Promise<void>;

  /** Remove o valor associado à chave. */
  remove(key: string): Promise<void>;

  /** Lista todas as chaves atualmente armazenadas sob um prefixo (opcional). */
  keys(prefix?: string): Promise<string[]>;

  /** Limpa todo o armazenamento gerenciado por este adapter. */
  clear(): Promise<void>;
}
