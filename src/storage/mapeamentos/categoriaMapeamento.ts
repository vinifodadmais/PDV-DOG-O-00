import type { MapeamentoTabela } from "@/storage/createSupabaseRepository";
import type { Categoria } from "@/types";

/**
 * Formato exato da tabela `public.categories` (ver supabase/schema.sql).
 * Nomes em inglês/snake_case — diferentes dos nomes locais em
 * português/camelCase, por isso o mapeamento explícito.
 */
export interface CategoriaRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const categoriaMapeamento: MapeamentoTabela<Categoria, CategoriaRow> = {
  paraLinha(categoria) {
    return {
      id: categoria.id,
      name: categoria.nome,
      color: categoria.cor,
      sort_order: categoria.ordem,
      active: categoria.ativo,
      created_at: categoria.createdAt,
      updated_at: categoria.updatedAt,
    };
  },

  paraLinhaParcial(patch) {
    const linha: Record<string, unknown> = {};
    if (patch.nome !== undefined) linha.name = patch.nome;
    if (patch.cor !== undefined) linha.color = patch.cor;
    if (patch.ordem !== undefined) linha.sort_order = patch.ordem;
    if (patch.ativo !== undefined) linha.active = patch.ativo;
    if (patch.updatedAt !== undefined) linha.updated_at = patch.updatedAt;
    return linha;
  },

  paraEntidade(row) {
    return {
      id: row.id,
      nome: row.name,
      cor: row.color,
      ordem: row.sort_order,
      ativo: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};
