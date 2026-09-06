import { cn } from "@/utils/cn";
import { STATUS_INFO } from "./statusInfo";
import type { StatusPedido } from "@/types";

interface StatusBadgeProps {
  status: StatusPedido;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const info = STATUS_INFO[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium",
        info.corFundo,
        info.corBorda,
        info.corTexto
      )}
    >
      <span aria-hidden="true">{info.emoji}</span>
      {info.label}
    </span>
  );
}
