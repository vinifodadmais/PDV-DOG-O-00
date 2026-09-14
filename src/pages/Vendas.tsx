import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ProdutoCard } from "@/components/vendas/ProdutoCard";
import { CategoriaPills } from "@/components/vendas/CategoriaPills";
import { CarrinhoPainel } from "@/components/vendas/CarrinhoPainel";
import { AdicionaisModal } from "@/components/vendas/AdicionaisModal";
import { PagamentoModal } from "@/components/vendas/PagamentoModal";
import { AbrirCaixaModal, type AbrirCaixaValues } from "@/components/caixa/AbrirCaixaModal";
import { useCarrinho } from "@/hooks/useCarrinho";
import {
  imprimirPedido,
  obterImprimirAutomaticamente,
  type NovoPagamentoInput,
} from "@/services";
import { listarCategoriasAtivasSupabase, listarProdutosAtivosSupabase } from "@/services/catalogoPdvService";
import { finalizarVendaSupabase } from "@/services/vendaSupabaseService";
import { abrirCaixa, obterSessaoCaixaAberta } from "@/services/caixaSupabaseService";
import type { Categoria, Pedido, Produto, SessaoCaixa } from "@/types";

/**
 * Texto usado para identificar a categoria de adicionais — comparação
 * por "contém" (não igualdade exata) porque o nome real no cadastro
 * inclui um emoji de prefixo (ex: "➕ Adicionais").
 */
const NOME_CATEGORIA_ADICIONAIS = "Adicionais";

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

export function Vendas() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sessaoCaixa, setSessaoCaixa] = useState<SessaoCaixa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [processandoPagamento, setProcessandoPagamento] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [pedidoFinalizado, setPedidoFinalizado] = useState<Pedido | null>(null);

  // Impressão do comprovante (automática após a venda, e sob demanda via "Reimprimir")
  const [statusImpressao, setStatusImpressao] = useState<"ocioso" | "imprimindo" | "sucesso" | "erro">(
    "ocioso"
  );
  const [erroImpressao, setErroImpressao] = useState<string | null>(null);

  // Abrir caixa direto desta tela, quando nenhum estiver aberto ainda.
  const [modalAbrirCaixaAberto, setModalAbrirCaixaAberto] = useState(false);
  const [processandoAbertura, setProcessandoAbertura] = useState(false);
  const [erroAbertura, setErroAbertura] = useState<string | null>(null);

  const carrinho = useCarrinho();

  // Personalização (adicionais/observação) de uma linha específica do carrinho.
  const [itemPersonalizandoId, setItemPersonalizandoId] = useState<string | null>(null);

  // Gerado uma vez por tentativa de venda (ao abrir o pagamento) e
  // reaproveitado em qualquer retry — é o que garante que um duplo
  // clique ou uma nova tentativa após falha de rede nunca cria uma
  // venda duplicada (a RPC finalize_sale é idempotente por esse valor).
  const [clientRequestId, setClientRequestId] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErroCatalogo(null);

    // Cardápio (categorias/produtos) agora vem do Supabase — Fase 1 da
    // migração. Se falhar (sem internet, Supabase indisponível...), NÃO
    // caímos silenciosamente pro cardápio local: mostramos um erro claro
    // e bloqueamos a tela, para nunca vender com dados desatualizados
    // sem o operador saber.
    try {
      const [listaProdutos, listaCategorias] = await Promise.all([
        listarProdutosAtivosSupabase(),
        listarCategoriasAtivasSupabase(),
      ]);
      setProdutos(listaProdutos);
      setCategorias(listaCategorias);
    } catch (error) {
      setErroCatalogo(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o cardápio do Supabase."
      );
    }

    // Caixa continua 100% local nesta fase (Fase 4 da migração).
    const sessao = await obterSessaoCaixaAberta();
    setSessaoCaixa(sessao);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriaAdicionais = useMemo(
    () => categorias.find((categoria) => categoria.nome.includes(NOME_CATEGORIA_ADICIONAIS)),
    [categorias]
  );

  // "Adicionais" não é uma categoria de venda normal — some das pílulas e
  // da grade principal, mas os produtos continuam existindo/ativos no
  // Supabase (só ficam acessíveis via "Personalizar" no carrinho).
  const categoriasVisiveis = useMemo(
    () => categorias.filter((categoria) => !categoria.nome.includes(NOME_CATEGORIA_ADICIONAIS)),
    [categorias]
  );

  const produtosAdicionaisDisponiveis = useMemo(
    () =>
      categoriaAdicionais
        ? produtos.filter((produto) => produto.categoriaId === categoriaAdicionais.id)
        : [],
    [produtos, categoriaAdicionais]
  );

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos
      .filter((produto) => produto.categoriaId !== categoriaAdicionais?.id)
      .filter((produto) => {
        const combinaCategoria =
          categoriaFiltro === "todas" || produto.categoriaId === categoriaFiltro;
        const combinaBusca =
          termo.length === 0 || produto.nome.toLowerCase().includes(termo);
        return combinaCategoria && combinaBusca;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [produtos, busca, categoriaFiltro, categoriaAdicionais]);

  async function handleConfirmarAberturaCaixa(valores: AbrirCaixaValues) {
    setProcessandoAbertura(true);
    setErroAbertura(null);
    try {
      const sessao = await abrirCaixa(valores);
      setSessaoCaixa(sessao);
      setModalAbrirCaixaAberto(false);
    } catch (error) {
      setErroAbertura(
        error instanceof Error ? error.message : "Não foi possível abrir o caixa."
      );
    } finally {
      setProcessandoAbertura(false);
    }
  }

  function handleAbrirPagamento() {
    if (carrinho.itens.length === 0) return;
    setErroPagamento(null);
    setPedidoFinalizado(null);
    // Uma nova venda (carrinho novo) sempre ganha um client_request_id
    // novo — só é reaproveitado dentro da MESMA tentativa (ver retry no
    // catch de handleConfirmarPagamento).
    setClientRequestId(crypto.randomUUID());
    setModalPagamentoAberto(true);
  }

  async function tentarImprimir(pedido: Pedido) {
    setStatusImpressao("imprimindo");
    setErroImpressao(null);
    try {
      await imprimirPedido(pedido);
      setStatusImpressao("sucesso");
    } catch (error) {
      setStatusImpressao("erro");
      setErroImpressao(
        error instanceof Error ? error.message : "Não foi possível imprimir o comprovante."
      );
    }
  }

  async function handleConfirmarPagamento(pagamentos: NovoPagamentoInput[]) {
    if (!clientRequestId) return; // não deveria acontecer (gerado ao abrir o modal)

    setProcessandoPagamento(true);
    setErroPagamento(null);
    try {
      // Fase 2: a venda é registrada no Supabase (RPC finalize_sale,
      // atômica) ANTES de qualquer tentativa de impressão — se a RPC não
      // confirmar, nada é impresso e nenhuma venda "falsa" é fingida.
      // Preço/subtotal/total são calculados pelo banco, não confiamos no
      // que o carrinho local calculou (isso é só uma prévia visual).
      const pedido = await finalizarVendaSupabase({
        clientRequestId,
        itens: carrinho.itens.map((item) => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          observacao: item.observacao,
          adicionais: item.adicionais.map((adicional) => ({
            produtoId: adicional.produtoId,
            quantidade: 1,
          })),
        })),
        pagamentos,
        desconto: carrinho.desconto,
        tipoConsumo: carrinho.tipoConsumo,
        taxaEntrega: carrinho.taxaEntrega,
        nomeCliente: carrinho.nomeCliente.trim() || undefined,
        statusPagamento: carrinho.statusPagamento,
        opcaoConsumo: carrinho.opcaoConsumo,
      });
      setPedidoFinalizado(pedido);
      carrinho.limparCarrinho();

      setStatusImpressao("ocioso");
      setErroImpressao(null);
      const deveImprimirAutomaticamente = await obterImprimirAutomaticamente();
      if (deveImprimirAutomaticamente) {
        await tentarImprimir(pedido);
      }
    } catch (error) {
      // NÃO limpa `clientRequestId` aqui de propósito: se o operador
      // clicar em "Finalizar" de novo pra tentar outra vez, a RPC recebe
      // o MESMO id — se a venda anterior na verdade tinha sido gravada
      // (e só a resposta que se perdeu por causa da rede), o Supabase
      // devolve a venda já existente em vez de criar uma segunda.
      setErroPagamento(
        error instanceof Error ? error.message : "Não foi possível finalizar a venda."
      );
    } finally {
      setProcessandoPagamento(false);
    }
  }

  function handleFecharModalPagamento() {
    if (processandoPagamento) return;
    setModalPagamentoAberto(false);
    setErroPagamento(null);
    setPedidoFinalizado(null);
  }

  function handleNovaVenda() {
    setModalPagamentoAberto(false);
    setPedidoFinalizado(null);
    setErroPagamento(null);
    setStatusImpressao("ocioso");
    setErroImpressao(null);
    setClientRequestId(null);
  }

  function handleReimprimir() {
    if (pedidoFinalizado) tentarImprimir(pedidoFinalizado);
  }

  if (carregando) {
    return <p className="text-sm text-charcoal-400">Carregando produtos...</p>;
  }

  // Sem conexão com o Supabase, não mostramos um cardápio desatualizado
  // nem caímos de volta pro localStorage silenciosamente — bloqueia com
  // uma mensagem clara e permite tentar de novo.
  if (erroCatalogo) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-brand-red/40 bg-charcoal-900/40 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-charcoal-800 text-brand-red-light">
          <Icon name="alert" size={26} />
        </div>
        <h2 className="display-title text-lg text-brand-white">
          Não foi possível carregar o cardápio
        </h2>
        <p className="max-w-sm text-sm text-charcoal-400">{erroCatalogo}</p>
        <p className="max-w-sm text-xs text-charcoal-500">
          O cardápio oficial agora vem do Supabase — verifique sua conexão com a internet.
        </p>
        <button
          type="button"
          onClick={carregar}
          className="mt-2 rounded-md bg-brand-red px-5 py-2.5 text-sm font-bold text-brand-white transition-colors hover:bg-brand-red-dark"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Sem caixa aberto, o PDV não deixa nem começar a montar uma venda —
  // evita o usuário montar um carrinho inteiro só para descobrir, na hora
  // de pagar, que precisa abrir o caixa primeiro.
  if (!sessaoCaixa) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-charcoal-700 bg-charcoal-900/40 px-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-charcoal-800 text-brand-mustard">
          <Icon name="cash" size={26} />
        </div>
        <h2 className="display-title text-lg text-brand-white">Nenhum caixa aberto</h2>
        <p className="max-w-sm text-sm text-charcoal-400">
          Abra o caixa informando o valor inicial para começar a vender.
        </p>
        <button
          type="button"
          onClick={() => setModalAbrirCaixaAberto(true)}
          className="mt-2 rounded-md bg-brand-red px-5 py-2.5 text-sm font-bold text-brand-white transition-colors hover:bg-brand-red-dark"
        >
          Abrir Caixa
        </button>

        <AbrirCaixaModal
          open={modalAbrirCaixaAberto}
          processando={processandoAbertura}
          erro={erroAbertura}
          onClose={() => {
            setModalAbrirCaixaAberto(false);
            setErroAbertura(null);
          }}
          onConfirmar={handleConfirmarAberturaCaixa}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Área principal: busca, categorias e grid de produtos */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="relative shrink-0">
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500"
          />
          <input
            type="text"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Pesquisar produto..."
            className={`${inputClassName} pl-9 pr-3`}
            autoFocus
          />
        </div>

        <div className="shrink-0">
          <CategoriaPills
            categorias={categoriasVisiveis}
            categoriaSelecionada={categoriaFiltro}
            onSelecionar={setCategoriaFiltro}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-1 pr-1">
          {produtosFiltrados.length === 0 ? (
            <p className="text-sm text-charcoal-400">
              {produtos.length === 0
                ? "Nenhum produto ativo cadastrado. Cadastre produtos em Produtos."
                : "Nenhum produto encontrado para esse filtro."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {produtosFiltrados.map((produto) => (
                <ProdutoCard
                  key={produto.id}
                  produto={produto}
                  onAdicionar={carrinho.adicionarProduto}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Área direita: carrinho */}
      <CarrinhoPainel
        carrinho={carrinho}
        onFinalizar={handleAbrirPagamento}
        onPersonalizar={setItemPersonalizandoId}
      />

      <AdicionaisModal
        open={itemPersonalizandoId !== null}
        item={carrinho.itens.find((item) => item.id === itemPersonalizandoId) ?? null}
        produtosAdicionais={produtosAdicionaisDisponiveis}
        onClose={() => setItemPersonalizandoId(null)}
        onAdicionar={carrinho.adicionarAdicionalAoItem}
        onRemover={carrinho.removerAdicionalDoItem}
        onSalvarObservacao={carrinho.definirObservacaoDoItem}
      />

      <PagamentoModal
        open={modalPagamentoAberto}
        total={carrinho.total}
        processando={processandoPagamento}
        erro={erroPagamento}
        pedidoFinalizado={pedidoFinalizado}
        statusPagamento={carrinho.statusPagamento}
        opcaoConsumo={carrinho.opcaoConsumo}
        statusImpressao={statusImpressao}
        erroImpressao={erroImpressao}
        onClose={handleFecharModalPagamento}
        onConfirmarPagamento={handleConfirmarPagamento}
        onNovaVenda={handleNovaVenda}
        onReimprimir={handleReimprimir}
      />
    </div>
  );
}
