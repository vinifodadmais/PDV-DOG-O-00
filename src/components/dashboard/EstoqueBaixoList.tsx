import { Icon } from "@/components/ui/Icon";
import type { Produto } from "@/types";

interface EstoqueBaixoListProps {
  produtos: Produto[];
}

export function EstoqueBaixoList({ produtos }: EstoqueBaixoListProps) {
  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Icon name="check" size={22} className="text-green-400" />
        <p className="text-sm text-charcoal-400">Nenhum produto com estoque baixo.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {produtos.map((produto) => (
        <li key={produto.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate text-brand-white">{produto.nome}</span>
          <span className="shrink-0 font-semibold tabular-nums text-brand-red-light">
            {produto.estoqueAtual}/{produto.estoqueMinimo} {produto.unidade}
          </span>
        </li>
      ))}
    </ul>
  );
}
