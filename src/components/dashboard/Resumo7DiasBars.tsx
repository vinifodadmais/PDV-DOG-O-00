import { formatarMoeda } from "@/utils/currency";
import type { ResumoDia } from "@/services";

interface Resumo7DiasBarsProps {
  dias: ResumoDia[];
}

/**
 * Mini gráfico de barras feito só com divs (sem lib de gráficos) — o
 * suficiente para mostrar a tendência da semana sem exagerar na
 * visualização.
 */
export function Resumo7DiasBars({ dias }: Resumo7DiasBarsProps) {
  const semVendas = dias.every((dia) => dia.totalVendas === 0);
  const maiorVenda = Math.max(...dias.map((dia) => dia.totalVendas), 1);

  if (semVendas) {
    return (
      <p className="py-6 text-center text-sm text-charcoal-400">
        Nenhuma venda registrada nos últimos 7 dias.
      </p>
    );
  }

  return (
    <div className="flex h-40 items-end gap-3 px-1">
      {dias.map((dia) => {
        const alturaPercentual =
          dia.totalVendas > 0 ? Math.max((dia.totalVendas / maiorVenda) * 100, 6) : 0;
        return (
          <div key={dia.data} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums text-charcoal-300">
              {dia.totalVendas > 0 ? formatarMoeda(dia.totalVendas) : ""}
            </span>
            <div className="flex h-28 w-full items-end overflow-hidden rounded-t-md bg-charcoal-800">
              <div
                className="w-full rounded-t-md bg-brand-mustard"
                style={{ height: `${alturaPercentual}%` }}
              />
            </div>
            <span className="text-[11px] text-charcoal-400">{dia.label}</span>
          </div>
        );
      })}
    </div>
  );
}
