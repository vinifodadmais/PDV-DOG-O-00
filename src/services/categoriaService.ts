import { categoriaRepository, produtoRepository } from "@/storage";
import { generateId } from "@/utils/id";
import { nowIso } from "@/utils/date";
import type { Categoria, EntityId } from "@/types";

export async function listarCategorias(): Promise<Categoria[]> {
  const categorias = await categoriaRepository.getAll();
  return categorias.slice().sort((a, b) => a.ordem - b.ordem);
}

export async function listarCategoriasAtivas(): Promise<Categoria[]> {
  const categorias = await listarCategorias();
  return categorias.filter((categoria) => categoria.ativo);
}

export async function buscarCategoria(id: EntityId): Promise<Categoria | null> {
  return categoriaRepository.getById(id);
}

export interface NovaCategoriaInput {
  nome: string;
  cor: string;
  ordem?: number;
}

export async function criarCategoria(
  input: NovaCategoriaInput
): Promise<Categoria> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new Error("Informe o nome da categoria.");
  }

  const timestamp = nowIso();
  const existentes = await categoriaRepository.getAll();
  const maiorOrdem = existentes.reduce((max, c) => Math.max(max, c.ordem), 0);

  const categoria: Categoria = {
    id: generateId(),
    nome,
    cor: input.cor,
    ordem: input.ordem ?? maiorOrdem + 1,
    ativo: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return categoriaRepository.create(categoria);
}

export async function atualizarCategoria(
  id: EntityId,
  patch: Partial<Omit<Categoria, "id" | "createdAt">>
): Promise<Categoria | null> {
  if (patch.nome !== undefined && patch.nome.trim() === "") {
    throw new Error("O nome da categoria não pode ficar vazio.");
  }
  return categoriaRepository.update(id, { ...patch, updatedAt: nowIso() });
}

/**
 * Exclui a categoria, desde que não existam produtos vinculados a ela —
 * excluir nesse caso deixaria produtos "órfãos", apontando para uma
 * categoria inexistente. A tela deve capturar esse erro e orientar o
 * usuário a mover ou excluir os produtos primeiro.
 */
export async function excluirCategoria(id: EntityId): Promise<void> {
  const produtos = await produtoRepository.getAll();
  const emUso = produtos.some((produto) => produto.categoriaId === id);
  if (emUso) {
    throw new Error(
      "Existem produtos cadastrados nesta categoria. Mova ou exclua esses produtos antes de excluir a categoria."
    );
  }
  return categoriaRepository.remove(id);
}

/**
 * Troca a ordem de exibição entre uma categoria e a vizinha imediata
 * (acima ou abaixo), para permitir reordenar o cardápio pela lista.
 */
export async function moverCategoria(
  id: EntityId,
  direcao: "up" | "down"
): Promise<void> {
  const categorias = await listarCategorias();
  const index = categorias.findIndex((categoria) => categoria.id === id);
  if (index === -1) return;

  const alvoIndex = direcao === "up" ? index - 1 : index + 1;
  if (alvoIndex < 0 || alvoIndex >= categorias.length) return;

  const atual = categorias[index];
  const alvo = categorias[alvoIndex];

  await categoriaRepository.update(atual.id, {
    ordem: alvo.ordem,
    updatedAt: nowIso(),
  });
  await categoriaRepository.update(alvo.id, {
    ordem: atual.ordem,
    updatedAt: nowIso(),
  });
}
