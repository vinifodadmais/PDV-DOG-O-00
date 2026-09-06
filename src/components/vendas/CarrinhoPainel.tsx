import { Icon } from "@/components/ui/Icon";
import { formatarMoeda } from "@/utils/currency";
import { CarrinhoItemRow } from "./CarrinhoItemRow";
import type { UseCarrinhoResult } from "@/hooks/useCarrinho";

interface CarrinhoPainelProps {
  carrinho: UseCarrinhoResult;
  onFinalizar: () => void;
  /** Abre o modal de personalização (adicionais/observação) para uma linha específica. */
  onPersonalizar: (itemId: string) => void;
  desabilitado?: boolean;
  mensagemDesabilitado?: string;
}

const campoClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-2.5 py-1.5 text-xs text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

export function CarrinhoPainel({
  carrinho,
  onFinalizar,
  onPersonalizar,
  desabilitado = false,
  mensagemDesabilitado,
}: CarrinhoPainelProps) {
  const {
    itens,
    desconto,
    tipoConsumo,
    taxaEntrega,
    nomeCliente,
    subtotal,
    total,
    quantidadeTotal,
    aumentarQuantidade,
    diminuirQuantidade,
    removerItem,
    definirDesconto,
    definirTipoConsumo,
    definirTaxaEntrega,
    definirNomeCliente,
    limparCarrinho,
  } = carrinho;

  const carrinhoVazio = itens.length === 0;

  return (
    <aside
      className="flex w-[380px] shrink-0 flex-col rounded-lg border border-charcoal-800 bg-charcoal-900"
      aria-label="Carrinho de venda"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-charcoal-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon name="sale" size={18} className="text-brand-mustard" />
          <h2 className="display-title text-base text-brand-white">Carrinho</h2>
          {quantidadeTotal > 0 && (
            <span className="rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-bold text-brand-white">
              {quantidadeTotal}
            </span>
          )}
        </div>
        {!carrinhoVazio && (
          <button
            type="button"
            onClick={limparCarrinho}
            className="text-xs font-medium text-charcoal-400 transition-colors hover:text-brand-red"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {carrinhoVazio ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <Icon name="sale" size={28} className="text-charcoal-700" />
            <p className="text-sm text-charcoal-400">Carrinho vazio</p>
            <p className="text-xs text-charcoal-500">
              Clique em um produto para adicionar
            </p>
          </div>
        ) : (
          <ul>
            {itens.map((item) => (
              <CarrinhoItemRow
                key={item.id}
                item={item}
                onAumentar={aumentarQuantidade}
                onDiminuir={diminuirQuantidade}
                onRemover={removerItem}
                onPersonalizar={onPersonalizar}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-charcoal-800 px-4 py-3">
        <div>
          <label htmlFor="carrinho-cliente" className="mb-1 block text-xs font-medium text-charcoal-300">
            Cliente
          </label>
          <input
            id="carrinho-cliente"
            type="text"
            value={nomeCliente}
            onChange={(event) => definirNomeCliente(event.target.value)}
            placeholder="Nome do cliente (opcional)"
            className={campoClassName}
          />
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-charcoal-300">Tipo do pedido</p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => definirTipoConsumo("balcao")}
              className={
                tipoConsumo === "balcao"
                  ? "rounded-md bg-brand-mustard px-2 py-1.5 text-xs font-semibold text-charcoal-950"
                  : "rounded-md border border-charcoal-700 px-2 py-1.5 text-xs font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
              }
            >
              Retirada/Balcão
            </button>
            <button
              type="button"
              onClick={() => definirTipoConsumo("entrega")}
              className={
                tipoConsumo === "entrega"
                  ? "rounded-md bg-brand-mustard px-2 py-1.5 text-xs font-semibold text-charcoal-950"
                  : "rounded-md border border-charcoal-700 px-2 py-1.5 text-xs font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
              }
            >
              Entrega
            </button>
          </div>
        </div>

        {tipoConsumo === "entrega" && (
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="carrinho-taxa-entrega" className="text-xs font-medium text-charcoal-300">
              Taxa de entrega (R$)
            </label>
            <input
              id="carrinho-taxa-entrega"
              type="number"
              min={0}
              step={0.01}
              value={taxaEntrega === 0 ? "" : taxaEntrega}
              onChange={(event) => definirTaxaEntrega(Number(event.target.value))}
              placeholder="0,00"
              className={`${campoClassName} w-28 text-right`}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <label htmlFor="carrinho-desconto" className="text-xs font-medium text-charcoal-300">
            Desconto (R$)
          </label>
          <input
            id="carrinho-desconto"
            type="number"
            min={0}
            max={subtotal}
            step={0.01}
            value={desconto === 0 ? "" : desconto}
            onChange={(event) => definirDesconto(Number(event.target.value))}
            placeholder="0,00"
            disabled={carrinhoVazio}
            className={`${campoClassName} w-28 text-right disabled:opacity-50`}
          />
        </div>

        <div className="space-y-1 border-t border-charcoal-800 pt-3 text-sm">
          <div className="flex items-center justify-between text-charcoal-300">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatarMoeda(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-charcoal-300">
            <span>Desconto</span>
            <span className="tabular-nums text-brand-red-light">
              {desconto > 0 ? `- ${formatarMoeda(desconto)}` : formatarMoeda(0)}
            </span>
          </div>
          {tipoConsumo === "entrega" && (
            <div className="flex items-center justify-between text-charcoal-300">
              <span>Taxa de entrega</span>
              <span className="tabular-nums">{formatarMoeda(taxaEntrega)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-charcoal-800 pt-2 text-base font-bold text-brand-white">
            <span className="display-title">Total</span>
            <span className="tabular-nums">{formatarMoeda(total)}</span>
          </div>
        </div>

        {desabilitado && mensagemDesabilitado && (
          <p className="flex items-start gap-1.5 rounded-md border border-brand-mustard/30 bg-brand-mustard/10 px-2.5 py-2 text-[11px] text-brand-mustard">
            <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
            {mensagemDesabilitado}
          </p>
        )}

        <button
          type="button"
          onClick={onFinalizar}
          disabled={carrinhoVazio || desabilitado}
          className="w-full rounded-md bg-brand-red py-3 text-sm font-bold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Finalizar Venda
        </button>
      </div>
    </aside>
  );
}
