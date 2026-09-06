import { createLocalRepository } from "./createLocalRepository";
import { COLLECTIONS } from "./collections";
import type {
  Categoria,
  Produto,
  Pedido,
  SessaoCaixa,
  MovimentacaoCaixa,
  MovimentacaoEstoque,
} from "../types";

export const categoriaRepository = createLocalRepository<Categoria>(
  COLLECTIONS.categorias
);

export const produtoRepository = createLocalRepository<Produto>(
  COLLECTIONS.produtos
);

export const pedidoRepository = createLocalRepository<Pedido>(
  COLLECTIONS.pedidos
);

export const sessaoCaixaRepository = createLocalRepository<SessaoCaixa>(
  COLLECTIONS.sessoesCaixa
);

export const movimentacaoCaixaRepository = createLocalRepository<MovimentacaoCaixa>(
  COLLECTIONS.movimentacoesCaixa
);

export const movimentacaoEstoqueRepository = createLocalRepository<MovimentacaoEstoque>(
  COLLECTIONS.movimentacoesEstoque
);
