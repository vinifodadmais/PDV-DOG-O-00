import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { registrarMovimentacaoEstoque } from "@/services";
import type { EntityId, IconName, MotivoMovimentacaoEstoque, Produto, TipoMovimentacaoEstoque } from "@/types";

interface MovimentacaoFormModalProps {
  open: boolean;
  produtos: Produto[];
  produtoPreselecionadoId?: EntityId;
  onClose: () => void;
  onRegistrar: () => void | Promise<void>;
}

type DirecaoAjuste = "aumentar" | "diminuir";

const TIPOS: { id: TipoMovimentacaoEstoque; label: string; icon: IconName }[] = [
  { id: "entrada", label: "Entrada", icon: "plus" },
  { id: "saida", label: "Saída", icon: "minus" },
  { id: "ajuste", label: "Ajuste", icon: "edit" },
];

const MOTIVO_POR_TIPO: Record<TipoMovimentacaoEstoque, MotivoMovimentacaoEstoque> = {
  entrada: "compra",
  saida: "perda",
  ajuste: "ajuste_manual",
};

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";
const labelClassName = "mb-1.5 block text-xs font-medium text-charcoal-300";

export function MovimentacaoFormModal({
  open,
  produtos,
  produtoPreselecionadoId,
  onClose,
  onRegistrar,
}: MovimentacaoFormModalProps) {
  const [tipo, setTipo] = useState<TipoMovimentacaoEstoque>("entrada");
  const [direcaoAjuste, setDirecaoAjuste] = useState<DirecaoAjuste>("aumentar");
  const [produtoId, setProdutoId] = useState<EntityId>("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTipo("entrada");
    setDirecaoAjuste("aumentar");
    setProdutoId(produtoPreselecionadoId ?? produtos[0]?.id ?? "");
    setQuantidade("");
    setObservacao("");
    setErro(null);
  }, [open, produtoPreselecionadoId, produtos]);

  const produtoSelecionado = produtos.find((produto) => produto.id === produtoId) ?? null;
  const quantidadeNumero = Number(quantidade) || 0;

  const delta =
    tipo === "entrada"
      ? quantidadeNumero
      : tipo === "saida"
        ? -quantidadeNumero
        : direcaoAjuste === "aumentar"
          ? quantidadeNumero
          : -quantidadeNumero;

  const novoEstoquePreview = produtoSelecionado ? produtoSelecionado.estoqueAtual + delta : null;
  const estoqueFicariaNegativo = novoEstoquePreview !== null && novoEstoquePreview < 0;

  const podeSalvar =
    produtoId !== "" && quantidadeNumero > 0 && !estoqueFicariaNegativo;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!podeSalvar) return;

    setSalvando(true);
    setErro(null);
    try {
      await registrarMovimentacaoEstoque({
        produtoId,
        tipo,
        quantidade: delta,
        motivo: MOTIVO_POR_TIPO[tipo],
        observacao: observacao.trim() || undefined,
      });
      await onRegistrar();
      onClose();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a movimentação."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Movimentação de Estoque">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTipo(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border px-2 py-2.5 text-xs font-semibold transition-colors",
                tipo === item.id
                  ? "border-brand-red bg-brand-red/15 text-brand-white"
                  : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
              )}
            >
              <Icon name={item.icon} size={16} />
              {item.label}
            </button>
          ))}
        </div>

        {tipo === "ajuste" && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDirecaoAjuste("aumentar")}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                direcaoAjuste === "aumentar"
                  ? "border-brand-mustard bg-brand-mustard/10 text-brand-mustard"
                  : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
              )}
            >
              Aumentar estoque
            </button>
            <button
              type="button"
              onClick={() => setDirecaoAjuste("diminuir")}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                direcaoAjuste === "diminuir"
                  ? "border-brand-red bg-brand-red/10 text-brand-red-light"
                  : "border-charcoal-700 text-charcoal-300 hover:border-charcoal-500 hover:text-brand-white"
              )}
            >
              Diminuir estoque
            </button>
          </div>
        )}

        <div>
          <label htmlFor="movimentacao-produto" className={labelClassName}>
            Produto
          </label>
          <select
            id="movimentacao-produto"
            value={produtoId}
            onChange={(event) => setProdutoId(event.target.value)}
            className={inputClassName}
          >
            <option value="">Selecione...</option>
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome} (estoque: {produto.estoqueAtual} {produto.unidade})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="movimentacao-quantidade" className={labelClassName}>
            Quantidade
          </label>
          <input
            id="movimentacao-quantidade"
            type="number"
            min={1}
            step={1}
            value={quantidade}
            onChange={(event) => setQuantidade(event.target.value)}
            placeholder="0"
            className={inputClassName}
            autoFocus
          />
        </div>

        {produtoSelecionado && quantidadeNumero > 0 && (
          <div
            className={cn(
              "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
              estoqueFicariaNegativo
                ? "border-brand-red/40 bg-brand-red/10"
                : "border-charcoal-800 bg-charcoal-800/50"
            )}
          >
            <span className="text-charcoal-400">Novo estoque</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                estoqueFicariaNegativo ? "text-brand-red-light" : "text-brand-white"
              )}
            >
              {novoEstoquePreview} {produtoSelecionado.unidade}
            </span>
          </div>
        )}
        {estoqueFicariaNegativo && (
          <p className="flex items-center gap-1.5 text-xs text-brand-red-light">
            <Icon name="alert" size={13} className="shrink-0" />
            Essa operação deixaria o estoque negativo — não é permitido.
          </p>
        )}

        <div>
          <label htmlFor="movimentacao-observacao" className={labelClassName}>
            Observação (opcional)
          </label>
          <textarea
            id="movimentacao-observacao"
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            rows={2}
            placeholder="Ex: compra no atacadista, produto vencido..."
            className={inputClassName}
          />
        </div>

        {erro && (
          <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!podeSalvar || salvando}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
