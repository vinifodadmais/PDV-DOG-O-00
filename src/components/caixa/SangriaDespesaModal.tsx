import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";

export interface SangriaDespesaValues {
  valor: number;
  motivo: string;
  observacao?: string;
}

interface SangriaDespesaModalProps {
  open: boolean;
  tipo: "sangria" | "despesa";
  processando: boolean;
  erro: string | null;
  onClose: () => void;
  onConfirmar: (valores: SangriaDespesaValues) => void;
}

const TEXTOS = {
  sangria: {
    titulo: "Nova Sangria",
    placeholderMotivo: "Ex: retirada para o cofre, troco do dia seguinte...",
    botao: "Registrar Sangria",
  },
  despesa: {
    titulo: "Nova Despesa",
    placeholderMotivo: "Ex: compra de gelo, entrega de ingredientes...",
    botao: "Registrar Despesa",
  },
};

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";
const labelClassName = "mb-1.5 block text-xs font-medium text-charcoal-300";

export function SangriaDespesaModal({
  open,
  tipo,
  processando,
  erro,
  onClose,
  onConfirmar,
}: SangriaDespesaModalProps) {
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!open) return;
    setValor("");
    setMotivo("");
    setObservacao("");
  }, [open, tipo]);

  const valorNumero = Number(valor) || 0;
  const podeConfirmar = valorNumero > 0 && motivo.trim().length > 0;
  const textos = TEXTOS[tipo];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!podeConfirmar) return;
    onConfirmar({
      valor: valorNumero,
      motivo: motivo.trim(),
      observacao: observacao.trim() || undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={textos.titulo}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="movimentacao-valor" className={labelClassName}>
            Valor (R$)
          </label>
          <input
            id="movimentacao-valor"
            type="number"
            min={0.01}
            step={0.01}
            value={valor}
            onChange={(event) => setValor(event.target.value)}
            placeholder="0,00"
            autoFocus
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="movimentacao-motivo" className={labelClassName}>
            Motivo
          </label>
          <input
            id="movimentacao-motivo"
            type="text"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            placeholder={textos.placeholderMotivo}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="movimentacao-observacao" className={labelClassName}>
            Observação (opcional)
          </label>
          <textarea
            id="movimentacao-observacao"
            value={observacao}
            onChange={(event) => setObservacao(event.target.value)}
            rows={2}
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
            disabled={!podeConfirmar || processando}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processando ? "Salvando..." : textos.botao}
          </button>
        </div>
      </form>
    </Modal>
  );
}
