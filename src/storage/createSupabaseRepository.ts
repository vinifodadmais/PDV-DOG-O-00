import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Repository } from "./Repository";
import type { EntityId } from "../types/common";

/**
 * ============================================================================
 * ATENÇÃO: esta implementação existe, mas AINDA NÃO está conectada a
 * nenhum service. `storage/repositories.ts` continua usando
 * `createLocalRepository` (localStorage) para tudo — nada mudou no
 * comportamento real do app nesta etapa. Isso é proposital: a troca de
 * fato (qual repositório cada service usa) é uma etapa futura, service
 * por service, com aprovação separada.
 * ============================================================================
 *
 * Espelha `createLocalRepository` (mesmo contrato `Repository<T>`), mas
 * faz queries reais numa tabela do Supabase em vez de ler/escrever um
 * array inteiro em uma chave do localStorage.
 *
 * Como os tipos de domínio do app são em português/camelCase (ex:
 * `Categoria.nome`) e as colunas do banco são em inglês/snake_case (ex:
 * `categories.name` — ver `supabase/schema.sql`), é preciso um
 * `mapeamento` explícito de ida e volta por entidade — não dá pra
 * converter automaticamente só trocando a "caixa" das letras, porque os
 * NOMES dos campos também mudam (idioma diferente).
 */

export interface MapeamentoTabela<T extends { id: EntityId }, Row extends { id: string }> {
  /** Entidade completa -> linha completa (usado em `create` e `replaceAll`). */
  paraLinha(item: T): Row;
  /** Patch parcial -> objeto parcial de colunas (usado em `update`, só envia o que veio no patch). */
  paraLinhaParcial(patch: Partial<Omit<T, "id">>): Record<string, unknown>;
  /** Linha do banco -> entidade do domínio. */
  paraEntidade(linha: Row): T;
}

/**
 * Cria um `Repository<T>` apoiado numa tabela do Supabase.
 *
 * Exemplo de uso (ilustrativo — NÃO instanciado em lugar nenhum ainda):
 * ```ts
 * const categoriaMapeamento: MapeamentoTabela<Categoria, CategoriaRow> = {
 *   paraLinha: (c) => ({ id: c.id, name: c.nome, color: c.cor, sort_order: c.ordem, active: c.ativo, ... }),
 *   paraLinhaParcial: (patch) => ({
 *     ...(patch.nome !== undefined && { name: patch.nome }),
 *     ...(patch.cor !== undefined && { color: patch.cor }),
 *     ...(patch.ordem !== undefined && { sort_order: patch.ordem }),
 *     ...(patch.ativo !== undefined && { active: patch.ativo }),
 *   }),
 *   paraEntidade: (row) => ({ id: row.id, nome: row.name, cor: row.color, ordem: row.sort_order, ativo: row.active, createdAt: row.created_at, updatedAt: row.updated_at }),
 * };
 * const categoriaSupabaseRepository = createSupabaseRepository("categories", categoriaMapeamento);
 * ```
 */
export function createSupabaseRepository<
  T extends { id: EntityId },
  Row extends { id: string } = { id: string },
>(
  tabela: string,
  mapeamento: MapeamentoTabela<T, Row>,
  client: SupabaseClient | null = supabase
): Repository<T> {
  function exigirCliente(): SupabaseClient {
    if (!client) {
      throw new Error(
        `Supabase não está configurado — não é possível acessar a tabela "${tabela}". ` +
          "Veja .env.example."
      );
    }
    return client;
  }

  async function getAll(): Promise<T[]> {
    const db = exigirCliente();
    const { data, error } = await db.from(tabela).select("*");
    if (error) throw error;
    return ((data ?? []) as Row[]).map(mapeamento.paraEntidade);
  }

  async function getById(id: EntityId): Promise<T | null> {
    const db = exigirCliente();
    const { data, error } = await db.from(tabela).select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapeamento.paraEntidade(data as Row) : null;
  }

  async function create(item: T): Promise<T> {
    const db = exigirCliente();
    const linha = mapeamento.paraLinha(item);
    const { data, error } = await db.from(tabela).insert(linha).select().single();
    if (error) throw error;
    return mapeamento.paraEntidade(data as Row);
  }

  async function update(id: EntityId, patch: Partial<Omit<T, "id">>): Promise<T | null> {
    const db = exigirCliente();
    const linhaParcial = mapeamento.paraLinhaParcial(patch);
    const { data, error } = await db
      .from(tabela)
      .update(linhaParcial)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapeamento.paraEntidade(data as Row) : null;
  }

  async function remove(id: EntityId): Promise<void> {
    const db = exigirCliente();
    const { error } = await db.from(tabela).delete().eq("id", id);
    if (error) throw error;
  }

  async function clear(): Promise<void> {
    const db = exigirCliente();
    // O Supabase/PostgREST não aceita DELETE sem alguma condição —
    // "id is not null" é sempre verdadeiro pra toda linha real, então
    // funciona como "apaga tudo".
    const { error } = await db.from(tabela).delete().not("id", "is", null);
    if (error) throw error;
  }

  async function replaceAll(items: T[]): Promise<void> {
    await clear();
    if (items.length === 0) return;
    const db = exigirCliente();
    const linhas = items.map(mapeamento.paraLinha);
    const { error } = await db.from(tabela).insert(linhas);
    if (error) throw error;
  }

  return { getAll, getById, create, update, remove, clear, replaceAll };
}
