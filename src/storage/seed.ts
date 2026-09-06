import { nowIso } from "../utils/date";
import { storage } from "./instance";
import { CONFIG_KEYS } from "./collections";
import {
  categoriaRepository,
  produtoRepository,
  pedidoRepository,
  sessaoCaixaRepository,
  movimentacaoCaixaRepository,
  movimentacaoEstoqueRepository,
} from "./repositories";
import type {
  Categoria,
  Produto,
  Pedido,
  SessaoCaixa,
  MovimentacaoCaixa,
  MovimentacaoEstoque,
} from "../types";

/**
 * Incremente ao mudar o formato/conteúdo da seed. `ensureSeeded` usa isso
 * apenas para saber se já rodou nesta versão — nunca para sobrescrever
 * dados reais que o usuário já tenha criado.
 */
const SEED_VERSAO = 5;

function buildCategorias(timestamp: string): Categoria[] {
  return [
    {
      id: "categoria-hot-dogs",
      nome: "🌭 Hot Dogs",
      cor: "#DC2626",
      ordem: 1,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "categoria-lanches-prensados",
      nome: "🥪 Lanches Prensados",
      cor: "#EA580C",
      ordem: 2,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "categoria-salgados",
      nome: "🥟 Salgados",
      cor: "#78716C",
      ordem: 3,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "categoria-bebidas",
      nome: "🥤 Bebidas",
      cor: "#2563EB",
      ordem: 4,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "categoria-adicionais",
      nome: "➕ Adicionais",
      cor: "#F5B301",
      ordem: 5,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "categoria-doces",
      nome: "🍰 Doces",
      cor: "#DB2777",
      ordem: 6,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function buildProdutos(timestamp: string): Produto[] {
  return [
    {
      id: "produto-agua-mineral",
      categoriaId: "categoria-bebidas",
      nome: "Água Mineral 500ml",
      preco: 4,
      custo: 1.5,
      unidade: "un",
      estoqueAtual: 50,
      estoqueMinimo: 15,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // ================================================================
    // Cardápio completo do Dogão da Praça.
    // Estoque não foi informado para estes itens, então começa em 0/0
    // (sem inventar quantidades) — ajuste em Estoque quando tiver os
    // números reais.
    // ================================================================

    // --- Lanches Prensados ---
    {
      id: "produto-x-burguer",
      categoriaId: "categoria-lanches-prensados",
      nome: "X-Burguer",
      descricao:
        "Hambúrguer, maionese, ketchup, mostarda, milho, tomate, mussarela, presunto.",
      preco: 25,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-x-salada-prensados",
      categoriaId: "categoria-lanches-prensados",
      nome: "X-Salada",
      descricao: "Hambúrguer, maionese, presunto, mussarela, tomate, milho, alface.",
      preco: 27,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-x-bacon",
      categoriaId: "categoria-lanches-prensados",
      nome: "X-Bacon",
      descricao:
        "Hambúrguer, maionese, bacon, presunto, mussarela, tomate, milho, Catupiry.",
      preco: 33,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-x-calabresa",
      categoriaId: "categoria-lanches-prensados",
      nome: "X-Calabresa",
      descricao: "Hambúrguer, maionese, calabresa, mussarela, tomate, milho, Catupiry.",
      preco: 33,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-x-egg",
      categoriaId: "categoria-lanches-prensados",
      nome: "X-Egg",
      descricao: "Hambúrguer, maionese, mussarela, presunto, tomate, milho, ovo.",
      preco: 30,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-moda-da-casa",
      categoriaId: "categoria-lanches-prensados",
      nome: "Moda da Casa",
      descricao:
        "Maionese, ketchup, milho, tomate, alface, hambúrguer, bacon, calabresa, ovo, mussarela, Catupiry.",
      preco: 36,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-x-frango",
      categoriaId: "categoria-lanches-prensados",
      nome: "X-Frango",
      descricao:
        "Pão, maionese, ketchup, Catupiry, milho, tomate, bacon, frango desfiado, mussarela.",
      preco: 33,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // --- Hot Dogs ---
    {
      id: "produto-dog-simples",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Simples",
      descricao: "1 salsicha, maionese, ketchup, mostarda, tomate, milho, batata palha.",
      preco: 14,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-simples-duplo",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Simples Duplo",
      descricao: "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha.",
      preco: 16,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-duplo-catupiry",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Duplo Catupiry",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, Catupiry.",
      preco: 18,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-duplo-mussarela",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Duplo Mussarela",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, mussarela.",
      preco: 18,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-duplo-cheddar",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Duplo Cheddar",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, cheddar.",
      preco: 18,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-duplo-cream-cheese",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Duplo Cream Cheese",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, cream cheese.",
      preco: 18,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-duplo-bacon",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Duplo Bacon",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, bacon.",
      preco: 23,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-duplo-calabresa",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Duplo Calabresa",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, calabresa.",
      preco: 23,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-dog-especial",
      categoriaId: "categoria-hot-dogs",
      nome: "Dog Especial",
      descricao:
        "2 salsichas, maionese, ketchup, mostarda, tomate, milho, batata palha, bacon, calabresa, Catupiry.",
      preco: 30,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // --- Bebidas (adicionadas à categoria "categoria-bebidas" já existente) ---
    {
      id: "produto-coca-cola-lata",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Coca-Cola Lata 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-taubaina-lata",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Taubaína Lata 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-guarana-antarctica-lata",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Guaraná Antarctica Lata 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-fanta-laranja-lata",
      categoriaId: "categoria-bebidas",
      nome: "Fanta Laranja Lata 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-fanta-uva-lata",
      categoriaId: "categoria-bebidas",
      nome: "Fanta Uva Lata 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-coca-cola-2l",
      categoriaId: "categoria-bebidas",
      nome: "Coca-Cola Garrafa 2L",
      preco: 18,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-suco-maracuja-500ml",
      categoriaId: "categoria-bebidas",
      nome: "Suco Natural 500ml - Maracujá",
      preco: 10,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-suco-abacaxi-500ml",
      categoriaId: "categoria-bebidas",
      nome: "Suco Natural 500ml - Abacaxi",
      preco: 10,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-suco-laranja-500ml",
      categoriaId: "categoria-bebidas",
      nome: "Suco Natural 500ml - Laranja",
      preco: 10,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-suco-goiaba-500ml",
      categoriaId: "categoria-bebidas",
      nome: "Suco Natural 500ml - Goiaba",
      preco: 10,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-sprite-lata",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Sprite Lata 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-vedete-taubaina-2l",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Vedete Taubaína Garrafa 2L",
      preco: 8,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-vedete-guarana-2l",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Vedete Guaraná Garrafa 2L",
      preco: 8,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-kuat-guarana-2l",
      categoriaId: "categoria-bebidas",
      nome: "Refrigerante Kuat Guaraná Garrafa 2L",
      preco: 8,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-budweiser-350ml",
      categoriaId: "categoria-bebidas",
      nome: "Cerveja Budweiser 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-skol-350ml",
      categoriaId: "categoria-bebidas",
      nome: "Cerveja Skol 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-original-350ml",
      categoriaId: "categoria-bebidas",
      nome: "Cerveja Original 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-crystal-350ml",
      categoriaId: "categoria-bebidas",
      nome: "Cerveja Crystal 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-brahma-350ml",
      categoriaId: "categoria-bebidas",
      nome: "Cerveja Brahma 350ml",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // --- Doces ---
    {
      id: "produto-trufas",
      categoriaId: "categoria-doces",
      nome: "Trufas",
      preco: 6,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-bolos-de-pote",
      categoriaId: "categoria-doces",
      nome: "Bolos de Pote",
      preco: 10,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // --- Salgados ---
    {
      id: "produto-coxinha",
      categoriaId: "categoria-salgados",
      nome: "Coxinha",
      preco: 1,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-risoles",
      categoriaId: "categoria-salgados",
      nome: "Risoles",
      preco: 1,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-bolinho-de-queijo",
      categoriaId: "categoria-salgados",
      nome: "Bolinho de Queijo",
      preco: 1,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-bolinho-caipira",
      categoriaId: "categoria-salgados",
      nome: "Bolinho Caipira",
      preco: 1,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-kibe",
      categoriaId: "categoria-salgados",
      nome: "Kibe",
      preco: 1,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-mini-churros",
      categoriaId: "categoria-salgados",
      nome: "Mini Churros",
      preco: 1,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-esfiha-grande",
      categoriaId: "categoria-salgados",
      nome: "Esfiha Frango ou Carne Assada Grande",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-coxinha-grande",
      categoriaId: "categoria-salgados",
      nome: "Coxinha Grande c/ ou sem Catupiry",
      preco: 7,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },

    // --- Adicionais de Ingredientes ---
    {
      id: "produto-adicional-salsicha",
      categoriaId: "categoria-adicionais",
      nome: "Salsicha",
      preco: 2,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-ovo",
      categoriaId: "categoria-adicionais",
      nome: "Ovo",
      preco: 3,
      unidade: "un",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-bacon",
      categoriaId: "categoria-adicionais",
      nome: "Bacon",
      preco: 5,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-calabresa",
      categoriaId: "categoria-adicionais",
      nome: "Calabresa",
      preco: 5,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-presunto",
      categoriaId: "categoria-adicionais",
      nome: "Presunto",
      preco: 5,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-mussarela",
      categoriaId: "categoria-adicionais",
      nome: "Mussarela",
      preco: 5,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-cheddar",
      categoriaId: "categoria-adicionais",
      nome: "Cheddar",
      preco: 3,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-catupiry",
      categoriaId: "categoria-adicionais",
      nome: "Catupiry",
      preco: 3,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "produto-adicional-cream-cheese",
      categoriaId: "categoria-adicionais",
      nome: "Cream Cheese",
      preco: 3,
      unidade: "porção",
      estoqueAtual: 0,
      estoqueMinimo: 0,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

/**
 * Sem pedidos de exemplo — eram fictícios, só para testar o sistema.
 * O sistema começa "zerado" de pedidos reais; o primeiro pedido de
 * verdade que você fizer vira o #1.
 */
function buildPedidos(_timestamp: string): Pedido[] {
  return [];
}

/**
 * Sem sessão de caixa nem movimentações de exemplo — mesma lógica do
 * `buildPedidos`: eram dados fictícios só para teste.
 */
function buildCaixa(_timestamp: string): {
  sessoes: SessaoCaixa[];
  movimentacoes: MovimentacaoCaixa[];
} {
  return { sessoes: [], movimentacoes: [] };
}

function buildMovimentacoesEstoque(
  produtos: Produto[],
  timestamp: string
): MovimentacaoEstoque[] {
  return produtos.map((produto, index) => ({
    id: `movimentacao-estoque-inicial-${index + 1}`,
    produtoId: produto.id,
    tipo: "entrada",
    quantidade: produto.estoqueAtual,
    motivo: "inicial",
    observacao: "Estoque inicial do cardápio",
    criadoEm: timestamp,
  }));
}

/**
 * Popula (ou repopula) as coleções com o cardápio real do Dogão da Praça
 * — categorias e produtos apenas, sem pedidos/caixa fictícios (removidos
 * porque eram só para teste). Substitui qualquer conteúdo existente, use
 * com cuidado — é chamada tanto pela semeadura automática quanto por
 * "restaurar dados de demonstração" no painel de sistema.
 */
export async function popularDadosDemonstracao(): Promise<void> {
  const timestamp = nowIso();

  const categorias = buildCategorias(timestamp);
  const produtos = buildProdutos(timestamp);
  const pedidos = buildPedidos(timestamp);
  const { sessoes, movimentacoes } = buildCaixa(timestamp);
  const movimentacoesEstoque = buildMovimentacoesEstoque(produtos, timestamp);

  await categoriaRepository.replaceAll(categorias);
  await produtoRepository.replaceAll(produtos);
  await pedidoRepository.replaceAll(pedidos);
  await sessaoCaixaRepository.replaceAll(sessoes);
  await movimentacaoCaixaRepository.replaceAll(movimentacoes);
  await movimentacaoEstoqueRepository.replaceAll(movimentacoesEstoque);

  await storage.set(CONFIG_KEYS.pedidoSequencia, pedidos.length);
  await storage.set(CONFIG_KEYS.seedVersao, SEED_VERSAO);
}

/**
 * Garante que existam dados para trabalhar na primeira execução do app,
 * sem nunca sobrescrever dados reais que o usuário já tenha criado.
 *
 * Regras:
 * - Se a seed já rodou nesta versão, não faz nada.
 * - Se já existem categorias (sinal de uso real), apenas marca a versão
 *   como semeada e não mexe em mais nada.
 * - Caso contrário (primeira execução mesmo), popula os dados de demo.
 */
export async function ensureSeeded(): Promise<void> {
  const versaoSalva = await storage.get<number>(CONFIG_KEYS.seedVersao);
  if (versaoSalva === SEED_VERSAO) return;

  const categoriasExistentes = await categoriaRepository.getAll();
  if (categoriasExistentes.length > 0) {
    await storage.set(CONFIG_KEYS.seedVersao, SEED_VERSAO);
    return;
  }

  await popularDadosDemonstracao();
}
