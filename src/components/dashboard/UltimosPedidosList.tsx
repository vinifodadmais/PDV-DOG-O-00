import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/pedidos/StatusBadge";
import { formatarMoeda } from "@/utils/currency";
import type { Pedido } from "@/types";

interface UltimosPedidosListProps {
  pedidos: Pedido[];
}

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function UltimosPedidosList({ pedidos }: UltimosPedidosListProps) {
  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Icon name="receipt" size={22} className="text-charcoal-600" />
        <p className="text-sm text-charcoal-400">Nenhum pedido registrado ainda.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-charcoal-800">
      {pedidos.map((pedido) => (
        <li
          key={pedido.id}
          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-brand-white">
              #{pedido.numero}{" "}
              <span className="font-normal text-charcoal-400">
                · {formatarHora(pedido.createdAt)}
              </span>
            </p>
            <p className="text-xs text-charcoal-400">{formatarMoeda(pedido.total)}</p>
          </div>
          <StatusBadge status={pedido.status} />
        </li>
      ))}
    </ul>
  );
}
