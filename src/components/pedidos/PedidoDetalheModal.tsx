import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "./StatusBadge";
import { StatusSelect } from "./StatusSelect";
import { formatarMoeda } from "@/utils/currency";
import type { Pedido, StatusPedido } from "@/types";

interface PedidoDetalheModalProps {
  open: boolean;
  pedido: Pedido | null;
  processando: boolean;
  erro: string | null;
  onClose: () => void;
  onAlterarStatus: (novoStatus: Exclude<StatusPedido, "cancelado">) => void;
  onCancelar: () => void;
  onImprimir?: () => void;
  imprimindo?: boolean;
}

const ROTULOS_FORMA: Record<string, string> = {
  dinheiro: "💵 Dinheiro",
  pix: "📱 Pix",
  debito: "💳 Débito",
  credito: "💳 Crédito",
  outro: "Outro",
};

const ROTULOS_TIPO_CONSUMO: Record<string, string> = {
  balcao: "Balcão",
  viagem: "Viagem",
  entrega: "Entrega",
};

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });
}

export function PedidoDetalheModal({
  open,
  pedido,
  processando,
  erro,
  onClose,
  onAlterarStatus,
  onCancelar,
  onImprimir,
  imprimindo = false,
}: PedidoDetalheModalProps) {
  if (!open || !pedido) return null;

  const quantidadeTotal = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);

  return (
    <Modal open={open} onClose={onClose} title={`Pedido #${pedido.numero}`} widthClassName="max-w-lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-charcoal-400">{formatarDataHora(pedido.createdAt)}</p>
            <p className="text-xs text-charcoal-400">
              {ROTULOS_TIPO_CONSUMO[pedido.tipoConsumo] ?? pedido.tipoConsumo}
            </p>
          </div>
          <StatusBadge status={pedido.status} />
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-400">
            Itens
          </h4>
          <ul className="divide-y divide-charcoal-800 rounded-md border border-charcoal-800">
            {pedido.itens.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="text-brand-white">
                    {item.quantidade}x {item.produtoNome}
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {formatarMoeda(item.precoUnitario)} un.
                  </p>
                </div>
                <p className="font-semibold tabular-nums text-brand-white">
                  {formatarMoeda(item.subtotal)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-right text-xs text-charcoal-400">
            {quantidadeTotal} item{quantidadeTotal === 1 ? "" : "s"} no total
          </p>
        </div>

        <div className="space-y-1 rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3 text-sm">
          <div className="flex justify-between text-charcoal-300">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatarMoeda(pedido.subtotal)}</span>
          </div>
          {pedido.desconto > 0 && (
            <div className="flex justify-between text-charcoal-300">
              <span>Desconto</span>
              <span className="tabular-nums text-brand-red-light">
                - {formatarMoeda(pedido.desconto)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-charcoal-700 pt-1.5 text-base font-bold text-brand-white">
            <span className="display-title">Total</span>
            <span className="tabular-nums">{formatarMoeda(pedido.total)}</span>
          </div>
        </div>

        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal-400">
            Pagamento
          </h4>
          {pedido.pagamentos.length === 0 ? (
            <p className="text-sm text-charcoal-400">Nenhum pagamento registrado.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {pedido.pagamentos.map((pagamento) => (
                <li key={pagamento.id} className="flex justify-between text-charcoal-300">
                  <span>{ROTULOS_FORMA[pagamento.forma] ?? pagamento.forma}</span>
                  <span className="tabular-nums">
                    {formatarMoeda(pagamento.valor)}
                    {pagamento.troco ? ` (troco ${formatarMoeda(pagamento.troco)})` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pedido.observacoes && (
          <div>
            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal-400">
              Observações
            </h4>
            <p className="text-sm text-charcoal-300">{pedido.observacoes}</p>
          </div>
        )}

        {erro && (
          <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            <Icon name="alert" size={14} className="shrink-0" />
            {erro}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-charcoal-800 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-charcoal-400">Status:</span>
            <StatusSelect
              value={pedido.status}
              disabled={processando}
              onChange={onAlterarStatus}
            />
          </div>
          <div className="flex items-center gap-2">
            {onImprimir && (
              <button
                type="button"
                onClick={onImprimir}
                disabled={imprimindo}
                className="flex items-center gap-1.5 rounded-md border border-charcoal-700 px-3 py-1.5 text-xs font-medium text-charcoal-200 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
              >
                <Icon name="printer" size={14} />
                {imprimindo ? "Imprimindo..." : "Imprimir"}
              </button>
            )}
            {pedido.status !== "cancelado" && (
              <button
                type="button"
                onClick={onCancelar}
                disabled={processando}
                className="rounded-md border border-brand-red/40 px-3 py-1.5 text-xs font-medium text-brand-red-light transition-colors hover:bg-brand-red/10 disabled:opacity-50"
              >
                Cancelar Pedido
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
