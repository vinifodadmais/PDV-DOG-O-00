import { useCallback, useEffect, useMemo, useState } from "react";
import type { EntityId, OpcaoConsumoLocal, Produto, StatusPagamento, TipoConsumo } from "@/types";
import { arredondarMoeda } from "@/utils/currency";

export interface AdicionalCarrinho {
  produtoId: EntityId;
  nome: string;
  precoUnitario: number;
}

export interface ItemCarrinho {
  /** Identidade da LINHA do carrinho — não é o produtoId. É o que permite
   *  dois "X-Burguer" coexistirem como linhas distintas, cada um com seus
   *  próprios adicionais/observação. */
  id: string;
  produtoId: EntityId;
  nome: string;
  precoUnitario: number;
  quantidade: number;
  imagemUrl?: string;
  adicionais: AdicionalCarrinho[];
  observacao?: string;
}

export interface UseCarrinhoResult {
  itens: ItemCarrinho[];
  desconto: number;
  /** "balcao" (Retirada) por padrão — não muda o comportamento de vendas existente. */
  tipoConsumo: TipoConsumo;
  /** Sempre 0 quando tipoConsumo !== "entrega" — forçado automaticamente ao trocar de tipo. */
  taxaEntrega: number;
  /** Nome do cliente — opcional, string vazia é válida. */
  nomeCliente: string;
  /** "nao_pago" por padrão — o operador confirma/ajusta antes de finalizar. */
  statusPagamento: StatusPagamento;
  /** "levar" por padrão — o operador confirma/ajusta antes de finalizar. */
  opcaoConsumo: OpcaoConsumoLocal;
  subtotal: number;
  total: number;
  quantidadeTotal: number;
  /** Adiciona um produto "puro" (sem adicionais/observação) — mescla com uma linha igual já existente. */
  adicionarProduto: (produto: Produto) => void;
  aumentarQuantidade: (itemId: string) => void;
  diminuirQuantidade: (itemId: string) => void;
  removerItem: (itemId: string) => void;
  /** Adiciona um adicional a uma linha específica do carrinho. */
  adicionarAdicionalAoItem: (itemId: string, adicional: Produto) => void;
  /** Remove um adicional (pelo produtoId dele) de uma linha específica. */
  removerAdicionalDoItem: (itemId: string, adicionalProdutoId: EntityId) => void;
  /** Define a observação de uma linha específica (ex: "sem cebola"). */
  definirObservacaoDoItem: (itemId: string, texto: string) => void;
  definirDesconto: (valor: number) => void;
  definirTipoConsumo: (tipo: TipoConsumo) => void;
  definirTaxaEntrega: (valor: number) => void;
  definirNomeCliente: (texto: string) => void;
  definirStatusPagamento: (status: StatusPagamento) => void;
  definirOpcaoConsumo: (opcao: OpcaoConsumoLocal) => void;
  limparCarrinho: () => void;
}

/** Total de uma linha = preço do produto × quantidade + soma dos adicionais. */
function calcularSubtotalItem(item: Pick<ItemCarrinho, "precoUnitario" | "quantidade" | "adicionais">): number {
  const totalAdicionais = item.adicionais.reduce((soma, adicional) => soma + adicional.precoUnitario, 0);
  return item.precoUnitario * item.quantidade + totalAdicionais * item.quantidade;
}

/**
 * Estado e regras do carrinho de venda. Vive só em memória (React state)
 * enquanto o operador monta o pedido.
 */
export function useCarrinho(): UseCarrinhoResult {
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [desconto, setDesconto] = useState(0);
  const [tipoConsumo, setTipoConsumo] = useState<TipoConsumo>("balcao");
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [nomeCliente, setNomeCliente] = useState("");
  // Padrões conforme especificado: venda começa "Não pago" e "Levar"; o
  // operador confirma ou troca antes de finalizar.
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>("nao_pago");
  const [opcaoConsumo, setOpcaoConsumo] = useState<OpcaoConsumoLocal>("levar");

  const subtotal = useMemo(
    () => itens.reduce((soma, item) => soma + calcularSubtotalItem(item), 0),
    [itens]
  );

  const quantidadeTotal = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade, 0),
    [itens]
  );

  // Taxa de entrega soma DEPOIS do desconto, nunca dentro do subtotal
  // dos produtos — mesma fórmula usada em finalize_sale (subtotal -
  // desconto + taxa), pra nunca divergir do que o Supabase calcula.
  const total = Math.max(subtotal - desconto, 0) + taxaEntrega;

  // Se o subtotal cair abaixo do desconto aplicado (item removido/reduzido),
  // reajusta o desconto para nunca deixar o total negativo "por baixo dos panos".
  useEffect(() => {
    setDesconto((atual) => Math.min(atual, subtotal));
  }, [subtotal]);

  const adicionarProduto = useCallback((produto: Produto) => {
    setItens((atual) => {
      // Só mescla com uma linha "pura" já existente (sem adicionais, sem
      // observação) do mesmo produto — uma linha customizada nunca se
      // mistura com outra, mesmo que seja o mesmo produto base.
      const existente = atual.find(
        (item) =>
          item.produtoId === produto.id &&
          item.adicionais.length === 0 &&
          !item.observacao
      );
      if (existente) {
        return atual.map((item) =>
          item.id === existente.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [
        ...atual,
        {
          id: crypto.randomUUID(),
          produtoId: produto.id,
          nome: produto.nome,
          precoUnitario: produto.preco,
          quantidade: 1,
          imagemUrl: produto.imagemUrl,
          adicionais: [],
        },
      ];
    });
  }, []);

  const aumentarQuantidade = useCallback((itemId: string) => {
    setItens((atual) =>
      atual.map((item) => (item.id === itemId ? { ...item, quantidade: item.quantidade + 1 } : item))
    );
  }, []);

  const diminuirQuantidade = useCallback((itemId: string) => {
    setItens((atual) =>
      atual.map((item) =>
        item.id === itemId ? { ...item, quantidade: Math.max(item.quantidade - 1, 1) } : item
      )
    );
  }, []);

  const removerItem = useCallback((itemId: string) => {
    setItens((atual) => atual.filter((item) => item.id !== itemId));
  }, []);

  const adicionarAdicionalAoItem = useCallback((itemId: string, adicional: Produto) => {
    setItens((atual) =>
      atual.map((item) =>
        item.id === itemId
          ? {
              ...item,
              adicionais: [
                ...item.adicionais,
                { produtoId: adicional.id, nome: adicional.nome, precoUnitario: adicional.preco },
              ],
            }
          : item
      )
    );
  }, []);

  const removerAdicionalDoItem = useCallback((itemId: string, adicionalProdutoId: EntityId) => {
    setItens((atual) =>
      atual.map((item) =>
        item.id === itemId
          ? { ...item, adicionais: item.adicionais.filter((a) => a.produtoId !== adicionalProdutoId) }
          : item
      )
    );
  }, []);

  const definirObservacaoDoItem = useCallback((itemId: string, texto: string) => {
    setItens((atual) =>
      atual.map((item) => (item.id === itemId ? { ...item, observacao: texto || undefined } : item))
    );
  }, []);

  const definirDesconto = useCallback(
    (valor: number) => {
      const seguro = Number.isFinite(valor) ? valor : 0;
      setDesconto(Math.min(Math.max(seguro, 0), subtotal));
    },
    [subtotal]
  );

  const definirTipoConsumo = useCallback((tipo: TipoConsumo) => {
    setTipoConsumo(tipo);
    // Trocar pra qualquer tipo que não seja "entrega" sempre zera a taxa —
    // nunca deixa uma taxa "esquecida" de uma seleção anterior.
    if (tipo !== "entrega") {
      setTaxaEntrega(0);
    }
    // "Comer aqui" não faz sentido pra um pedido de entrega — o botão
    // correspondente fica desabilitado na tela (ver CarrinhoPainel), e
    // aqui garantimos que uma seleção anterior de "comer_aqui" não fique
    // "esquecida" (ativa, porém com o botão desabilitado) ao trocar pra
    // entrega. Mesmo padrão da taxa de entrega acima.
    if (tipo === "entrega") {
      setOpcaoConsumo((atual) => (atual === "comer_aqui" ? "levar" : atual));
    }
  }, []);

  const definirTaxaEntrega = useCallback((valor: number) => {
    const seguro = Number.isFinite(valor) ? arredondarMoeda(valor) : 0;
    setTaxaEntrega(Math.max(seguro, 0));
  }, []);

  const definirNomeCliente = useCallback((texto: string) => {
    setNomeCliente(texto);
  }, []);

  const definirStatusPagamento = useCallback((status: StatusPagamento) => {
    setStatusPagamento(status);
  }, []);

  const definirOpcaoConsumo = useCallback((opcao: OpcaoConsumoLocal) => {
    setOpcaoConsumo(opcao);
  }, []);

  const limparCarrinho = useCallback(() => {
    setItens([]);
    setDesconto(0);
    setTipoConsumo("balcao");
    setTaxaEntrega(0);
    setNomeCliente("");
    setStatusPagamento("nao_pago");
    setOpcaoConsumo("levar");
  }, []);

  return {
    itens,
    desconto,
    tipoConsumo,
    taxaEntrega,
    nomeCliente,
    statusPagamento,
    opcaoConsumo,
    subtotal,
    total,
    quantidadeTotal,
    adicionarProduto,
    aumentarQuantidade,
    diminuirQuantidade,
    removerItem,
    adicionarAdicionalAoItem,
    removerAdicionalDoItem,
    definirObservacaoDoItem,
    definirDesconto,
    definirTipoConsumo,
    definirTaxaEntrega,
    definirNomeCliente,
    definirStatusPagamento,
    definirOpcaoConsumo,
    limparCarrinho,
  };
}
