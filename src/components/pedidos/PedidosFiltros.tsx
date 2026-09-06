import { cn } from "@/utils/cn";
import { STATUS_INFO, STATUS_FILTRAVEIS } from "./statusInfo";
import type { StatusPedido } from "@/types";

export interface FiltrosPedidos {
  status: StatusPedido | "todos";
  dataDe: string;
  dataAte: string;
  numero: string;
}

export const FILTROS_PEDIDOS_INICIAIS: FiltrosPedidos = {
  status: "todos",
  dataDe: "",
  dataAte: "",
  numero: "",
};

interface PedidosFiltrosProps {
  filtros: FiltrosPedidos;
  onChange: (filtros: FiltrosPedidos) => void;
}

const campoClassName =
  "rounded-md border border-charcoal-700 bg-charcoal-800 px-2.5 py-1.5 text-xs text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";
const rotuloClassName = "mb-1 block text-[11px] font-medium text-charcoal-400";

export function PedidosFiltros({ filtros, onChange }: PedidosFiltrosProps) {
  function atualizar<K extends keyof FiltrosPedidos>(campo: K, valor: FiltrosPedidos[K]) {
    onChange({ ...filtros, [campo]: valor });
  }

  const temFiltroAtivo =
    filtros.status !== "todos" || filtros.dataDe !== "" || filtros.dataAte !== "" || filtros.numero !== "";

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <p className={rotuloClassName}>Status</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => atualizar("status", "todos")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filtros.status === "todos"
                ? "border-brand-red bg-brand-red text-brand-white"
                : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
            )}
          >
            Todos
          </button>
          {STATUS_FILTRAVEIS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => atualizar("status", status)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                filtros.status === status
                  ? "border-brand-red bg-brand-red text-brand-white"
                  : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
              )}
            >
              {STATUS_INFO[status].emoji} {STATUS_INFO[status].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div>
          <label htmlFor="filtro-data-de" className={rotuloClassName}>
            De
          </label>
          <input
            id="filtro-data-de"
            type="date"
            value={filtros.dataDe}
            onChange={(event) => atualizar("dataDe", event.target.value)}
            className={campoClassName}
          />
        </div>
        <div>
          <label htmlFor="filtro-data-ate" className={rotuloClassName}>
            Até
          </label>
          <input
            id="filtro-data-ate"
            type="date"
            value={filtros.dataAte}
            onChange={(event) => atualizar("dataAte", event.target.value)}
            className={campoClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="filtro-numero" className={rotuloClassName}>
          Número do pedido
        </label>
        <input
          id="filtro-numero"
          type="text"
          inputMode="numeric"
          value={filtros.numero}
          onChange={(event) => atualizar("numero", event.target.value)}
          placeholder="Ex: 12"
          className={cn(campoClassName, "w-28")}
        />
      </div>

      {temFiltroAtivo && (
        <button
          type="button"
          onClick={() => onChange(FILTROS_PEDIDOS_INICIAIS)}
          className="pb-1.5 text-xs font-medium text-charcoal-400 transition-colors hover:text-brand-red"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
