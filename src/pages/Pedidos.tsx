import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/pedidos/StatusBadge";
import { StatusSelect } from "@/components/pedidos/StatusSelect";
import {
  PedidosFiltros,
  FILTROS_PEDIDOS_INICIAIS,
  type FiltrosPedidos,
} from "@/components/pedidos/PedidosFiltros";
import { PedidoDetalheModal } from "@/components/pedidos/PedidoDetalheModal";
import { atualizarStatusPedido, cancelarPedido, imprimirPedido, listarPedidos } from "@/services";
import { formatarMoeda } from "@/utils/currency";
import type { Pedido, StatusPedido } from "@/types";

const ROTULOS_FORMA_CURTO: Record<string, string> = {
  dinheiro: "💵",
  pix: "📱",
  debito: "💳D",
  credito: "💳C",
  outro: "💠",
};

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function resumoProdutos(pedido: Pedido): string {
  const texto = pedido.itens.map((item) => `${item.quantidade}x ${item.produtoNome}`).join(", ");
  return texto.length > 60 ? `${texto.slice(0, 57)}...` : texto;
}

function quantidadeTotalPedido(pedido: Pedido): number {
  return pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);
}

/**
 * Só oferece o seletor rápido de status na linha da tabela para pedidos
 * que ainda estão "em andamento" — finalizado/cancelado ficam só com a
 * opção de ver detalhes (onde a correção manual continua disponível).
 */
function statusEditavelNaLinha(status: StatusPedido): boolean {
  return status === "recebido" || status === "em_preparo" || status === "pronto";
}

export function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosPedidos>(FILTROS_PEDIDOS_INICIAIS);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [imprimindoId, setImprimindoId] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const todos = await listarPedidos();
    setPedidos(todos.slice().sort((a, b) => b.numero - a.numero));
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const pedidoSelecionado = useMemo(
    () => pedidos.find((pedido) => pedido.id === pedidoSelecionadoId) ?? null,
    [pedidos, pedidoSelecionadoId]
  );

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      if (filtros.status !== "todos" && pedido.status !== filtros.status) return false;

      if (filtros.numero.trim() && !String(pedido.numero).includes(filtros.numero.trim())) {
        return false;
      }

      const dataPedido = pedido.createdAt.slice(0, 10);
      if (filtros.dataDe && dataPedido < filtros.dataDe) return false;
      if (filtros.dataAte && dataPedido > filtros.dataAte) return false;

      return true;
    });
  }, [pedidos, filtros]);

  async function handleAlterarStatus(
    pedido: Pedido,
    novoStatus: Exclude<StatusPedido, "cancelado">
  ) {
    setProcessando(true);
    setErro(null);
    try {
      await atualizarStatusPedido(pedido.id, novoStatus);
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível atualizar o status."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function handleCancelar(pedido: Pedido) {
    const avisoEstoque =
      pedido.status !== "aberto"
        ? " O estoque será devolvido e o caixa ajustado, se aplicável."
        : "";
    const confirmado = window.confirm(
      `Cancelar o pedido #${pedido.numero}?${avisoEstoque}`
    );
    if (!confirmado) return;

    const motivo = window.prompt("Motivo do cancelamento (opcional):") ?? undefined;

    setProcessando(true);
    setErro(null);
    try {
      await cancelarPedido(pedido.id, motivo || undefined);
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível cancelar o pedido."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function handleImprimir(pedido: Pedido) {
    setImprimindoId(pedido.id);
    setErro(null);
    try {
      await imprimirPedido(pedido);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível imprimir o comprovante."
      );
    } finally {
      setImprimindoId(null);
    }
  }

  return (
    <div className="space-y-4">
      <PedidosFiltros filtros={filtros} onChange={setFiltros} />

      {erro && (
        <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red-light">
          <Icon name="alert" size={16} className="shrink-0" />
          {erro}
        </p>
      )}

      <p className="text-sm text-charcoal-400">
        {pedidosFiltrados.length} pedido{pedidosFiltrados.length === 1 ? "" : "s"}
      </p>

      {carregando ? (
        <p className="text-sm text-charcoal-400">Carregando pedidos...</p>
      ) : pedidosFiltrados.length === 0 ? (
        <p className="text-sm text-charcoal-400">
          {pedidos.length === 0
            ? "Nenhum pedido registrado ainda."
            : "Nenhum pedido encontrado para esse filtro."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal-800 bg-charcoal-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-800 text-xs uppercase tracking-wide text-charcoal-400">
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Horário</th>
                <th className="px-4 py-3 font-medium">Produtos</th>
                <th className="px-4 py-3 font-medium">Qtd.</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {pedidosFiltrados.map((pedido) => (
                <tr
                  key={pedido.id}
                  onClick={() => setPedidoSelecionadoId(pedido.id)}
                  className="cursor-pointer transition-colors hover:bg-charcoal-800/40"
                >
                  <td className="px-4 py-3 font-semibold text-brand-white">
                    #{pedido.numero}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal-400">
                    {formatarHora(pedido.createdAt)}
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-charcoal-300">
                    {resumoProdutos(pedido)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-charcoal-300">
                    {quantidadeTotalPedido(pedido)}
                  </td>
                  <td className="px-4 py-3 tabular-nums font-medium text-brand-white">
                    {formatarMoeda(pedido.total)}
                  </td>
                  <td className="px-4 py-3 text-charcoal-300">
                    {pedido.pagamentos.length === 0
                      ? "—"
                      : pedido.pagamentos
                          .map((pagamento) => ROTULOS_FORMA_CURTO[pagamento.forma] ?? pagamento.forma)
                          .join(" ")}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={pedido.status} />
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      {statusEditavelNaLinha(pedido.status) && (
                        <StatusSelect
                          value={pedido.status}
                          disabled={processando}
                          onChange={(novoStatus) => handleAlterarStatus(pedido, novoStatus)}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => handleImprimir(pedido)}
                        disabled={imprimindoId === pedido.id}
                        className="rounded-md border border-charcoal-700 p-1.5 text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
                        aria-label={`Imprimir pedido #${pedido.numero}`}
                        title="Imprimir comprovante"
                      >
                        <Icon name="printer" size={14} />
                      </button>
                      {pedido.status !== "cancelado" && (
                        <button
                          type="button"
                          onClick={() => handleCancelar(pedido)}
                          disabled={processando}
                          className="rounded-md border border-charcoal-700 px-2.5 py-1 text-xs font-medium text-charcoal-300 transition-colors hover:border-brand-red hover:text-brand-red-light disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PedidoDetalheModal
        open={pedidoSelecionadoId !== null}
        pedido={pedidoSelecionado}
        processando={processando}
        erro={erro}
        onClose={() => {
          setPedidoSelecionadoId(null);
          setErro(null);
        }}
        onAlterarStatus={(novoStatus) =>
          pedidoSelecionado && handleAlterarStatus(pedidoSelecionado, novoStatus)
        }
        onCancelar={() => pedidoSelecionado && handleCancelar(pedidoSelecionado)}
        onImprimir={() => pedidoSelecionado && handleImprimir(pedidoSelecionado)}
        imprimindo={pedidoSelecionado !== null && imprimindoId === pedidoSelecionado.id}
      />
    </div>
  );
}
