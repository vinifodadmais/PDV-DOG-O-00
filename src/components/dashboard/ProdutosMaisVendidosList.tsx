import { Icon } from "@/components/ui/Icon";
import type { ProdutoMaisVendido } from "@/services";

interface ProdutosMaisVendidosListProps {
  produtos: ProdutoMaisVendido[];
}

export function ProdutosMaisVendidosList({ produtos }: ProdutosMaisVendidosListProps) {
  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Icon name="tag" size={22} className="text-charcoal-600" />
        <p className="text-sm text-charcoal-400">Nenhuma venda hoje ainda.</p>
      </div>
    );
  }

  const maiorQuantidade = produtos[0].quantidade;

  return (
    <ul className="space-y-2.5">
      {produtos.map((produto, index) => (
        <li key={produto.produtoId} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-charcoal-800 text-xs font-bold text-brand-mustard">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm text-brand-white">{produto.nome}</p>
              <p className="shrink-0 text-xs font-semibold tabular-nums text-charcoal-300">
                {produto.quantidade}x
              </p>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-charcoal-800">
              <div
                className="h-full rounded-full bg-brand-mustard"
                style={{ width: `${(produto.quantidade / maiorQuantidade) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
