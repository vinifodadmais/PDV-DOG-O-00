import { STATUS_INFO, STATUS_ALTERAVEIS } from "./statusInfo";
import type { StatusPedido } from "@/types";

interface StatusSelectProps {
  value: StatusPedido;
  disabled?: boolean;
  onChange: (novoStatus: Exclude<StatusPedido, "cancelado">) => void;
}

/**
 * Dropdown para alterar o status "de cozinha" do pedido. Nunca oferece
 * "cancelado" como opção — cancelar tem seu próprio botão, com
 * confirmação e devolução de estoque/caixa.
 */
export function StatusSelect({ value, disabled, onChange }: StatusSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled || value === "cancelado"}
      onChange={(event) => onChange(event.target.value as Exclude<StatusPedido, "cancelado">)}
      onClick={(event) => event.stopPropagation()}
      className="rounded-md border border-charcoal-700 bg-charcoal-800 px-2 py-1.5 text-xs text-brand-white focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard disabled:opacity-50"
    >
      {value === "aberto" && (
        <option value="aberto">
          {STATUS_INFO.aberto.emoji} {STATUS_INFO.aberto.label}
        </option>
      )}
      {value === "cancelado" && (
        <option value="cancelado">
          {STATUS_INFO.cancelado.emoji} {STATUS_INFO.cancelado.label}
        </option>
      )}
      {STATUS_ALTERAVEIS.map((status) => (
        <option key={status} value={status}>
          {STATUS_INFO[status].emoji} {STATUS_INFO[status].label}
        </option>
      ))}
    </select>
  );
}
