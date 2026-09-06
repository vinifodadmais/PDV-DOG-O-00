import { categoriaRepository, produtoRepository } from "@/storage";
import { categoriaSupabaseRepository } from "./categoriaAdminService";
import { produtoSupabaseRepository } from "./produtoAdminService";

/**
 * Ferramenta de importação ÚNICA (localStorage -> Supabase). Nunca
 * apaga nada, local ou remoto. Os IDs locais (slugs, ex:
 * "categoria-hot-dogs") NÃO são UUID válidos, então cada linha ganha um
 * UUID novo (`crypto.randomUUID()`) — um mapa local->novo-UUID é
 * mantido só durante a importação, pra ligar corretamente
 * `product.category_id` à categoria recém-criada no Supabase.
 */

export interface PreviaMigracao {
  categoriasLocais: number;
  produtosLocais: number;
  categoriasNoSupabase: number;
  produtosNoSupabase: number;
  /** true se o Supabase já tem qualquer categoria ou produto — a tela deve avisar antes de prosseguir. */
  supabaseJaTemDados: boolean;
}

/** Levantamento "somente leitura" — não grava nada. Usado pra mostrar a prévia antes da confirmação. */
export async function obterPreviaMigracao(): Promise<PreviaMigracao> {
  const [categoriasLocais, produtosLocais, categoriasSupabase, produtosSupabase] = await Promise.all([
    categoriaRepository.getAll(),
    produtoRepository.getAll(),
    categoriaSupabaseRepository.getAll(),
    produtoSupabaseRepository.getAll(),
  ]);

  return {
    categoriasLocais: categoriasLocais.length,
    produtosLocais: produtosLocais.length,
    categoriasNoSupabase: categoriasSupabase.length,
    produtosNoSupabase: produtosSupabase.length,
    supabaseJaTemDados: categoriasSupabase.length > 0 || produtosSupabase.length > 0,
  };
}

export interface ResultadoMigracao {
  categoriasImportadas: number;
  produtosImportados: number;
  erros: string[];
}

/**
 * Executa a importação de verdade. Só deve ser chamada depois que a
 * tela mostrou `obterPreviaMigracao()` e o admin confirmou
 * explicitamente — esta função não pede confirmação sozinha, e roda
 * mesmo se `supabaseJaTemDados` for true (a decisão de avisar/bloquear
 * isso é da UI, não deste service).
 */
export async function importarCardapioLocalParaSupabase(): Promise<ResultadoMigracao> {
  const [categoriasLocais, produtosLocais] = await Promise.all([
    categoriaRepository.getAll(),
    produtoRepository.getAll(),
  ]);

  const mapaCategoriaIdLocalParaSupabase = new Map<string, string>();
  const erros: string[] = [];
  let categoriasImportadas = 0;
  let produtosImportados = 0;

  for (const categoria of categoriasLocais) {
    try {
      const criada = await categoriaSupabaseRepository.create({
        ...categoria,
        id: crypto.randomUUID(),
      });
      mapaCategoriaIdLocalParaSupabase.set(categoria.id, criada.id);
      categoriasImportadas++;
    } catch (error) {
      erros.push(
        `Categoria "${categoria.nome}": ${error instanceof Error ? error.message : "erro desconhecido"}`
      );
    }
  }

  for (const produto of produtosLocais) {
    const novaCategoriaId = mapaCategoriaIdLocalParaSupabase.get(produto.categoriaId);
    if (!novaCategoriaId) {
      erros.push(
        `Produto "${produto.nome}": a categoria de origem não foi importada com sucesso — produto pulado.`
      );
      continue;
    }
    try {
      await produtoSupabaseRepository.create({
        ...produto,
        id: crypto.randomUUID(),
        categoriaId: novaCategoriaId,
      });
      produtosImportados++;
    } catch (error) {
      erros.push(
        `Produto "${produto.nome}": ${error instanceof Error ? error.message : "erro desconhecido"}`
      );
    }
  }

  return { categoriasImportadas, produtosImportados, erros };
}
