import { createSupabaseRepository } from "@/storage/createSupabaseRepository";
import { categoriaMapeamento, type CategoriaRow } from "@/storage/mapeamentos/categoriaMapeamento";
import type { Categoria, EntityId } from "@/types";

/**
 * Repositório Supabase de categorias, usado SOMENTE pelo módulo
 * administrativo. O PDV operacional (Vendas, etc.) continua usando o
 * `categoriaRepository` local — ver decisão registrada na etapa
 * anterior (acoplamento com estoque impede trocar agora com segurança).
 */
export const categoriaSupabaseRepository = createSupabaseRepository<Categoria, CategoriaRow>(
  "categories",
  categoriaMapeamento
);

export async function listarCategoriasAdmin(): Promise<Categoria[]> {
  const todas = await categoriaSupabaseRepository.getAll();
  return todas.slice().sort((a, b) => a.ordem - b.ordem);
}

export interface NovaCategoriaAdminInput {
  nome: string;
  cor: string;
  ordem?: number;
}

export async function criarCategoriaAdmin(input: NovaCategoriaAdminInput): Promise<Categoria> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome da categoria.");
  }

  const existentes = await categoriaSupabaseRepository.getAll();
  const maiorOrdem = existentes.reduce((max, c) => Math.max(max, c.ordem), 0);
  const timestamp = new Date().toISOString();

  return categoriaSupabaseRepository.create({
    id: crypto.randomUUID(),
    nome,
    cor: input.cor,
    ordem: input.ordem ?? maiorOrdem + 1,
    ativo: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

/**
 * Atualiza uma categoria. Não existe função de exclusão física aqui de
 * propósito — a interface administrativa só desativa (`ativo: false`),
 * nunca apaga (pedido explícito, evita quebrar produtos que referenciam
 * a categoria e preserva histórico).
 */
export async function atualizarCategoriaAdmin(
  id: EntityId,
  patch: Partial<Omit<Categoria, "id" | "createdAt">>
): Promise<Categoria | null> {
  if (patch.nome !== undefined && patch.nome.trim() === "") {
    throw new Error("O nome da categoria não pode ficar vazio.");
  }
  return categoriaSupabaseRepository.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/** Troca a ordem entre a categoria e a vizinha (acima/abaixo) — mesma lógica de `moverCategoria` local. */
export async function moverCategoriaAdmin(id: EntityId, direcao: "up" | "down"): Promise<void> {
  const categorias = await listarCategoriasAdmin();
  const index = categorias.findIndex((categoria) => categoria.id === id);
  if (index === -1) return;

  const alvoIndex = direcao === "up" ? index - 1 : index + 1;
  if (alvoIndex < 0 || alvoIndex >= categorias.length) return;

  const atual = categorias[index];
  const alvo = categorias[alvoIndex];
  const timestamp = new Date().toISOString();

  await categoriaSupabaseRepository.update(atual.id, { ordem: alvo.ordem, updatedAt: timestamp });
  await categoriaSupabaseRepository.update(alvo.id, { ordem: atual.ordem, updatedAt: timestamp });
}
