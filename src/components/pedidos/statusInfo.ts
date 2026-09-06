import type { StatusPedido } from "@/types";

export interface StatusInfo {
  emoji: string;
  label: string;
  corTexto: string;
  corFundo: string;
  corBorda: string;
}

export const STATUS_INFO: Record<StatusPedido, StatusInfo> = {
  aberto: {
    emoji: "⚪",
    label: "Aberto",
    corTexto: "text-charcoal-300",
    corFundo: "bg-charcoal-800",
    corBorda: "border-charcoal-700",
  },
  recebido: {
    emoji: "🟡",
    label: "Recebido",
    corTexto: "text-yellow-400",
    corFundo: "bg-yellow-400/10",
    corBorda: "border-yellow-400/30",
  },
  em_preparo: {
    emoji: "🔵",
    label: "Em preparo",
    corTexto: "text-blue-400",
    corFundo: "bg-blue-400/10",
    corBorda: "border-blue-400/30",
  },
  pronto: {
    emoji: "🟢",
    label: "Pronto",
    corTexto: "text-green-400",
    corFundo: "bg-green-400/10",
    corBorda: "border-green-400/30",
  },
  finalizado: {
    emoji: "⚫",
    label: "Finalizado",
    corTexto: "text-charcoal-200",
    corFundo: "bg-charcoal-700/50",
    corBorda: "border-charcoal-600",
  },
  cancelado: {
    emoji: "🔴",
    label: "Cancelado",
    corTexto: "text-brand-red-light",
    corFundo: "bg-brand-red/10",
    corBorda: "border-brand-red/30",
  },
};

/** Status que fazem parte do fluxo normal de cozinha (excluindo aberto/cancelado). */
export const STATUS_ALTERAVEIS: StatusPedido[] = [
  "recebido",
  "em_preparo",
  "pronto",
  "finalizado",
];

/** Todos os status usados nos filtros (excluindo "aberto", que não é um pedido "colocado"). */
export const STATUS_FILTRAVEIS: StatusPedido[] = [
  "recebido",
  "em_preparo",
  "pronto",
  "finalizado",
  "cancelado",
];
