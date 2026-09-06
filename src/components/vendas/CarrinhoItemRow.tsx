import { Icon } from "@/components/ui/Icon";
import { formatarMoeda } from "@/utils/currency";
import type { ItemCarrinho } from "@/hooks/useCarrinho";

interface CarrinhoItemRowProps {
  item: ItemCarrinho;
  onAumentar: (itemId: string) => void;
  onDiminuir: (itemId: string) => void;
  onRemover: (itemId: string) => void;
  onPersonalizar: (itemId: string) => void;
}

/** Preço unitário do produto + soma dos adicionais (por unidade). */
function precoUnitarioComAdicionais(item: ItemCarrinho): number {
  return item.precoUnitario + item.adicionais.reduce((soma, a) => soma + a.precoUnitario, 0);
}

export function CarrinhoItemRow({
  item,
  onAumentar,
  onDiminuir,
  onRemover,
  onPersonalizar,
}: CarrinhoItemRowProps) {
  const totalItem = precoUnitarioComAdicionais(item) * item.quantidade;

  return (
    <li className="border-b border-charcoal-800 py-2.5 last:border-0">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-800">
          {item.imagemUrl ? (
            <img src={item.imagemUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon name="image" size={14} className="text-charcoal-600" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-brand-white">{item.nome}</p>
          <p className="text-xs text-charcoal-400">{formatarMoeda(item.precoUnitario)} un.</p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onDiminuir(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded border border-charcoal-700 text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
            aria-label={`Diminuir quantidade de ${item.nome}`}
          >
            <Icon name="minus" size={12} />
          </button>
          <span className="w-5 text-center text-sm font-medium tabular-nums text-brand-white">
            {item.quantidade}
          </span>
          <button
            type="button"
            onClick={() => onAumentar(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded border border-charcoal-700 text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
            aria-label={`Aumentar quantidade de ${item.nome}`}
          >
            <Icon name="plus" size={12} />
          </button>
        </div>

        <p className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-brand-white">
          {formatarMoeda(totalItem)}
        </p>

        <button
          type="button"
          onClick={() => onRemover(item.id)}
          className="shrink-0 rounded p-1 text-charcoal-500 transition-colors hover:text-brand-red"
          aria-label={`Remover ${item.nome} do carrinho`}
        >
          <Icon name="trash" size={14} />
        </button>
      </div>

      {/* Adicionais vinculados a ESTA linha — nunca tratados como venda independente */}
      {item.adicionais.length > 0 && (
        <ul className="ml-11 mt-1.5 space-y-0.5">
          {item.adicionais.map((adicional) => (
            <li
              key={adicional.produtoId}
              className="flex items-center justify-between text-xs text-charcoal-300"
            >
              <span>+ {adicional.nome}</span>
              <span className="tabular-nums">{formatarMoeda(adicional.precoUnitario)}</span>
            </li>
          ))}
        </ul>
      )}

      {item.observacao && (
        <p className="ml-11 mt-1 text-xs italic text-charcoal-400">Obs: {item.observacao}</p>
      )}

      <button
        type="button"
        onClick={() => onPersonalizar(item.id)}
        className="ml-11 mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-mustard transition-colors hover:text-brand-mustard/80"
      >
        <Icon name="plus" size={11} />
        {item.adicionais.length > 0 || item.observacao ? "Editar adicionais/observação" : "Adicionar adicional / observação"}
      </button>
    </li>
  );
}
