import { useState } from "react";
import { cn } from "@/utils/cn";
import { EstoqueTab } from "@/components/estoque/EstoqueTab";
import { HistoricoTab } from "@/components/estoque/HistoricoTab";

type Aba = "estoque" | "historico";

const ABAS: { id: Aba; label: string }[] = [
  { id: "estoque", label: "Estoque" },
  { id: "historico", label: "Histórico" },
];

export function Estoque() {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("estoque");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 border-b border-charcoal-800">
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            type="button"
            onClick={() => setAbaAtiva(aba.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              abaAtiva === aba.id
                ? "border-brand-mustard text-brand-white"
                : "border-transparent text-charcoal-400 hover:text-brand-white"
            )}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {abaAtiva === "estoque" && <EstoqueTab />}
      {abaAtiva === "historico" && <HistoricoTab />}
    </div>
  );
}
