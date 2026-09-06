import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { listarMovimentacoesEstoque, listarProdutos } from "@/services";
import type {
  EntityId,
  IconName,
  MotivoMovimentacaoEstoque,
  MovimentacaoEstoque,
  Produto,
  TipoMovimentacaoEstoque,
} from "@/types";

const inputClassName =
  "rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

const ROTULOS_MOTIVO: Record<MotivoMovimentacaoEstoque, string> = {
  compra: "Compra",
  venda: "Venda",
  perda: "Perda",
  ajuste_manual: "Ajuste manual",
  cancelamento: "Cancelamento (devolução)",
  inicial: "Estoque inicial",
};

const ROTULOS_TIPO: Record<
  TipoMovimentacaoEstoque,
  { label: string; icon: IconName; className: string }
> = {
  entrada: {
    label: "Entrada",
    icon: "plus",
    className: "text-green-400 bg-green-400/10 border-green-400/30",
  },
  saida: {
    label: "Saída",
    icon: "minus",
    className: "text-brand-red-light bg-brand-red/10 border-brand-red/30",
  },
  ajuste: {
    label: "Ajuste",
    icon: "edit",
    className: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  },
};

function formatarQuantidade(movimentacao: MovimentacaoEstoque): string {
  if (movimentacao.tipo === "entrada") return `+${movimentacao.quantidade}`;
  if (movimentacao.tipo === "saida") return `-${movimentacao.quantidade}`;
  return movimentacao.quantidade >= 0
    ? `+${movimentacao.quantidade}`
    : `${movimentacao.quantidade}`;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function HistoricoTab() {
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroProduto, setFiltroProduto] = useState<EntityId | "todos">("todos");
  const [filtroTipo, setFiltroTipo] = useState<TipoMovimentacaoEstoque | "todos">("todos");

  async function carregar() {
    setCarregando(true);
    const [listaMovimentacoes, listaProdutos] = await Promise.all([
      listarMovimentacoesEstoque(),
      listarProdutos(),
    ]);
    setMovimentacoes(listaMovimentacoes);
    setProdutos(listaProdutos);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const produtosPorId = useMemo(() => {
    const mapa = new Map<EntityId, Produto>();
    produtos.forEach((produto) => mapa.set(produto.id, produto));
    return mapa;
  }, [produtos]);

  const movimentacoesFiltradas = useMemo(
    () =>
      movimentacoes.filter(
        (movimentacao) =>
          (filtroProduto === "todos" || movimentacao.produtoId === filtroProduto) &&
          (filtroTipo === "todos" || movimentacao.tipo === filtroTipo)
      ),
    [movimentacoes, filtroProduto, filtroTipo]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filtroProduto}
          onChange={(event) => setFiltroProduto(event.target.value)}
          className={cn(inputClassName, "max-w-[220px]")}
        >
          <option value="todos">Todos os produtos</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
            </option>
          ))}
        </select>

        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroTipo("todos")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filtroTipo === "todos"
                ? "border-brand-red bg-brand-red text-brand-white"
                : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
            )}
          >
            Todos
          </button>
          {(Object.keys(ROTULOS_TIPO) as TipoMovimentacaoEstoque[]).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipo(tipo)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filtroTipo === tipo
                  ? "border-brand-red bg-brand-red text-brand-white"
                  : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
              )}
            >
              {ROTULOS_TIPO[tipo].label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-charcoal-400">Carregando histórico...</p>
      ) : movimentacoesFiltradas.length === 0 ? (
        <p className="text-sm text-charcoal-400">
          {movimentacoes.length === 0
            ? "Nenhuma movimentação registrada ainda."
            : "Nenhuma movimentação encontrada para esse filtro."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal-800 bg-charcoal-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-800 text-xs uppercase tracking-wide text-charcoal-400">
                <th className="px-4 py-3 font-medium">Data/Hora</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Quantidade</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {movimentacoesFiltradas.map((movimentacao) => {
                const tipoInfo = ROTULOS_TIPO[movimentacao.tipo];
                const produto = produtosPorId.get(movimentacao.produtoId);
                return (
                  <tr key={movimentacao.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal-400">
                      {formatarDataHora(movimentacao.criadoEm)}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-white">
                      {produto?.nome ?? "Produto removido"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                          tipoInfo.className
                        )}
                      >
                        <Icon name={tipoInfo.icon} size={11} />
                        {tipoInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-brand-white">
                      {formatarQuantidade(movimentacao)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-300">
                      {ROTULOS_MOTIVO[movimentacao.motivo]}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-charcoal-400">
                      {movimentacao.observacao ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
