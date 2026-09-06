import type { EntityId } from "../types/common";

/**
 * Contrato de acesso a uma coleção de entidades (categorias, produtos,
 * pedidos...). Todo o resto do app (hooks, services, páginas) depende
 * apenas desta interface — nunca da implementação concreta.
 *
 * Hoje só existe `createLocalRepository` (baseado no `StorageAdapter` de
 * localStorage). Quando o projeto migrar para Supabase, a migração é
 * escrever um `createSupabaseRepository<T>` que implemente este mesmo
 * contrato (getAll → select, create → insert, etc.); nenhum service ou
 * página precisa mudar.
 */
export interface Repository<T extends { id: EntityId }> {
  getAll(): Promise<T[]>;
  getById(id: EntityId): Promise<T | null>;
  create(item: T): Promise<T>;
  update(id: EntityId, patch: Partial<Omit<T, "id">>): Promise<T | null>;
  remove(id: EntityId): Promise<void>;
  /** Remove todos os itens da coleção. */
  clear(): Promise<void>;
  /** Substitui todo o conteúdo da coleção (usado pela seed de demonstração). */
  replaceAll(items: T[]): Promise<void>;
}
