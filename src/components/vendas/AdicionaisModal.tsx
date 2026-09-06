import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { formatarMoeda } from "@/utils/currency";
import type { ItemCarrinho } from "@/hooks/useCarrinho";
import type { Produto } from "@/types";

interface AdicionaisModalProps {
  open: boolean;
  item: ItemCarrinho | null;
  produtosAdicionais: Produto[];
  onClose: () => void;
  onAdicionar: (itemId: string, adicional: Produto) => void;
  onRemover: (itemId: string, adicionalProdutoId: string) => void;
  onSalvarObservacao: (itemId: string, texto: string) => void;
}

/**
 * Personalização de UM item do carrinho: escolher adicionais (produtos
 * reais da categoria "Adicionais", com baixa de estoque normal) e uma
 * observação de texto livre — ambos vinculados só a esta linha
 * específica, nunca ao pedido inteiro.
 */
export function AdicionaisModal({
  open,
  item,
  produtosAdicionais,
  onClose,
  onAdicionar,
  onRemover,
  onSalvarObservacao,
}: AdicionaisModalProps) {
  const [observacaoLocal, setObservacaoLocal] = useState("");

  useEffect(() => {
    if (open) setObservacaoLocal(item?.observacao ?? "");
  }, [open, item?.observacao, item?.id]);

  if (!item) return null;

  const idsSelecionados = new Set(item.adicionais.map((a) => a.produtoId));

  function handleFechar() {
    onSalvarObservacao(item!.id, observacaoLocal.trim());
    onClose();
  }

  function handleToggleAdicional(produto: Produto) {
    if (idsSelecionados.has(produto.id)) {
      onRemover(item!.id, produto.id);
    } else {
      onAdicionar(item!.id, produto);
    }
  }

  return (
    <Modal open={open} onClose={handleFechar} title={`Personalizar — ${item.nome}`}>
      <div className="space-y-4">
        {produtosAdicionais.length === 0 ? (
          <p className="text-sm text-charcoal-400">
            Nenhum adicional cadastrado ainda (categoria "Adicionais" vazia ou inativa).
          </p>
        ) : (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-400">
              Adicionais
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {produtosAdicionais.map((produto) => {
                const selecionado = idsSelecionados.has(produto.id);
                return (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => handleToggleAdicional(produto)}
                    className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${
                      selecionado
                        ? "border-brand-mustard bg-brand-mustard/10 text-brand-white"
                        : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          selecionado ? "border-brand-mustard bg-brand-mustard" : "border-charcoal-600"
                        }`}
                      >
                        {selecionado && <Icon name="check" size={11} className="text-charcoal-950" />}
                      </span>
                      {produto.nome}
                    </span>
                    <span className="tabular-nums text-brand-mustard">
                      +{formatarMoeda(produto.preco)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="item-observacao" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-charcoal-400">
            Observação (só deste item)
          </label>
          <textarea
            id="item-observacao"
            value={observacaoLocal}
            onChange={(event) => setObservacaoLocal(event.target.value)}
            placeholder="Ex: sem cebola, sem tomate, bem prensado..."
            rows={2}
            className="w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard"
          />
        </div>

        <div className="flex justify-end border-t border-charcoal-800 pt-3">
          <button
            type="button"
            onClick={handleFechar}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark"
          >
            Concluir
          </button>
        </div>
      </div>
    </Modal>
  );
}
