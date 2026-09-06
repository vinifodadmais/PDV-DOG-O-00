import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MovimentacaoFormModal } from "./MovimentacaoFormModal";
import { listarProdutos } from "@/services";
import { cn } from "@/utils/cn";
import type { EntityId, Produto } from "@/types";

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

export function EstoqueTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoPreselecionado, setProdutoPreselecionado] = useState<EntityId | undefined>();

  async function carregar() {
    setCarregando(true);
    setProdutos(await listarProdutos());
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos
      .filter((produto) => termo.length === 0 || produto.nome.toLowerCase().includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [produtos, busca]);

  const produtosComEstoqueBaixo = useMemo(
    () => produtos.filter((produto) => produto.estoqueAtual <= produto.estoqueMinimo),
    [produtos]
  );

  function abrirNovaMovimentacao(produtoId?: EntityId) {
    setProdutoPreselecionado(produtoId);
    setModalAberto(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[200px] max-w-xs flex-1">
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
          />
        </div>

        <button
          type="button"
          onClick={() => abrirNovaMovimentacao(undefined)}
          disabled={produtos.length === 0}
          className="flex items-center gap-2 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
        >
          <Icon name="plus" size={16} />
          Nova Movimentação
        </button>
      </div>

      {produtosComEstoqueBaixo.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-brand-mustard/40 bg-brand-mustard/10 px-3 py-2 text-sm text-brand-mustard">
          <Icon name="alert" size={16} className="shrink-0" />
          {produtosComEstoqueBaixo.length} produto
          {produtosComEstoqueBaixo.length === 1 ? "" : "s"} com estoque no mínimo ou abaixo dele.
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-charcoal-400">Carregando estoque...</p>
      ) : produtosFiltrados.length === 0 ? (
        <p className="text-sm text-charcoal-400">Nenhum produto encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal-800 bg-charcoal-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-800 text-xs uppercase tracking-wide text-charcoal-400">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Estoque atual</th>
                <th className="px-4 py-3 font-medium">Estoque mínimo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {produtosFiltrados.map((produto) => {
                const estoqueBaixo = produto.estoqueAtual <= produto.estoqueMinimo;
                return (
                  <tr key={produto.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-white">{produto.nome}</p>
                      {!produto.ativo && (
                        <p className="text-xs text-charcoal-500">Produto inativo</p>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          estoqueBaixo ? "text-brand-red-light" : "text-brand-white"
                        )}
                      >
                        {produto.estoqueAtual} {produto.unidade}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-charcoal-400">
                      {produto.estoqueMinimo} {produto.unidade}
                    </td>
                    <td className="px-4 py-3">
                      {estoqueBaixo ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/40 bg-brand-red/10 px-2.5 py-1 text-xs font-medium text-brand-red-light">
                          <Icon name="alert" size={12} />
                          Estoque baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-charcoal-700 px-2.5 py-1 text-xs font-medium text-charcoal-300">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirNovaMovimentacao(produto.id)}
                        className="rounded-md border border-charcoal-700 px-3 py-1.5 text-xs font-medium text-charcoal-200 transition-colors hover:border-charcoal-500 hover:text-brand-white"
                      >
                        Movimentar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <MovimentacaoFormModal
        open={modalAberto}
        produtos={produtos.filter((produto) => produto.ativo)}
        produtoPreselecionadoId={produtoPreselecionado}
        onClose={() => setModalAberto(false)}
        onRegistrar={carregar}
      />
    </div>
  );
}
