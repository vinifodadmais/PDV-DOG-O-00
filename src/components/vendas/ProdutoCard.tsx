import { Icon } from "@/components/ui/Icon";
import { formatarMoeda } from "@/utils/currency";
import type { Produto } from "@/types";

interface ProdutoCardProps {
  produto: Produto;
  onAdicionar: (produto: Produto) => void;
}

/**
 * Card de produto no grid de venda. O card inteiro é o botão de adicionar
 * — em um balcão, quanto maior a área clicável, mais rápido o operador
 * consegue lançar os pedidos.
 */
export function ProdutoCard({ produto, onAdicionar }: ProdutoCardProps) {
  return (
    <button
      type="button"
      onClick={() => onAdicionar(produto)}
      className="flex flex-col overflow-hidden rounded-lg border border-charcoal-800 bg-charcoal-900 text-left transition-colors hover:border-brand-mustard/60 hover:bg-charcoal-800 active:scale-[0.98]"
    >
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-charcoal-800">
        {produto.imagemUrl ? (
          <img
            src={produto.imagemUrl}
            alt={produto.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <Icon name="image" size={26} className="text-charcoal-600" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-brand-white">
          {produto.nome}
        </p>
        <p className="text-sm font-bold text-brand-mustard">
          {formatarMoeda(produto.preco)}
        </p>
      </div>
    </button>
  );
}
