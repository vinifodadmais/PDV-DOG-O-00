import {
  storage,
  CONFIG_KEYS,
  categoriaRepository,
  produtoRepository,
  pedidoRepository,
  sessaoCaixaRepository,
  movimentacaoCaixaRepository,
  movimentacaoEstoqueRepository,
  popularDadosDemonstracao,
} from "@/storage";

/**
 * Apaga TODOS os dados da aplicação (todas as coleções + sequências +
 * flag de seed). Útil para testes e para "começar do zero".
 */
export async function limparTodosOsDados(): Promise<void> {
  await Promise.all([
    categoriaRepository.clear(),
    produtoRepository.clear(),
    pedidoRepository.clear(),
    sessaoCaixaRepository.clear(),
    movimentacaoCaixaRepository.clear(),
    movimentacaoEstoqueRepository.clear(),
  ]);
  await storage.remove(CONFIG_KEYS.pedidoSequencia);
  await storage.remove(CONFIG_KEYS.seedVersao);
}

/**
 * Limpa tudo e recarrega os dados de demonstração originais.
 */
export async function restaurarDadosDemonstracao(): Promise<void> {
  await limparTodosOsDados();
  await popularDadosDemonstracao();
}

export interface ResumoDados {
  categorias: number;
  produtos: number;
  pedidos: number;
  sessoesCaixa: number;
  movimentacoesCaixa: number;
  movimentacoesEstoque: number;
}

/** Contagem rápida de cada coleção — usada para conferir a persistência. */
export async function obterResumoDados(): Promise<ResumoDados> {
  const [
    categorias,
    produtos,
    pedidos,
    sessoesCaixa,
    movimentacoesCaixa,
    movimentacoesEstoque,
  ] = await Promise.all([
    categoriaRepository.getAll(),
    produtoRepository.getAll(),
    pedidoRepository.getAll(),
    sessaoCaixaRepository.getAll(),
    movimentacaoCaixaRepository.getAll(),
    movimentacaoEstoqueRepository.getAll(),
  ]);

  return {
    categorias: categorias.length,
    produtos: produtos.length,
    pedidos: pedidos.length,
    sessoesCaixa: sessoesCaixa.length,
    movimentacoesCaixa: movimentacoesCaixa.length,
    movimentacoesEstoque: movimentacoesEstoque.length,
  };
}
