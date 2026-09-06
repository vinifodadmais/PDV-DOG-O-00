import { cn } from "@/utils/cn";
import type { Categoria } from "@/types";

interface CategoriaPillsProps {
  categorias: Categoria[];
  categoriaSelecionada: string;
  onSelecionar: (categoriaId: string) => void;
}

/**
 * Filtro de categorias em pílulas horizontais — mais rápido de clicar
 * durante o atendimento do que um <select>, e permite ver todas as
 * categorias de uma vez.
 */
export function CategoriaPills({
  categorias,
  categoriaSelecionada,
  onSelecionar,
}: CategoriaPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onSelecionar("todas")}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
          categoriaSelecionada === "todas"
            ? "border-brand-red bg-brand-red text-brand-white"
            : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
        )}
      >
        Todas
      </button>

      {categorias.map((categoria) => {
        const ativa = categoriaSelecionada === categoria.id;
        return (
          <button
            key={categoria.id}
            type="button"
            onClick={() => onSelecionar(categoria.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              ativa
                ? "border-transparent text-brand-white"
                : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
            )}
            style={ativa ? { backgroundColor: categoria.cor } : undefined}
          >
            {categoria.nome}
          </button>
        );
      })}
    </div>
  );
}
