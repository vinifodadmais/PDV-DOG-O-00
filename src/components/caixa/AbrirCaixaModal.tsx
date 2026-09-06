import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";

export interface AbrirCaixaValues {
  valorAbertura: number;
  operador?: string;
  observacoes?: string;
}

interface AbrirCaixaModalProps {
  open: boolean;
  processando: boolean;
  erro: string | null;
  onClose: () => void;
  onConfirmar: (valores: AbrirCaixaValues) => void;
}

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";
const labelClassName = "mb-1.5 block text-xs font-medium text-charcoal-300";

export function AbrirCaixaModal({
  open,
  processando,
  erro,
  onClose,
  onConfirmar,
}: AbrirCaixaModalProps) {
  const [valorAbertura, setValorAbertura] = useState("");
  const [operador, setOperador] = useState("");
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (!open) return;
    setValorAbertura("");
    setOperador("");
    setObservacoes("");
  }, [open]);

  const valorNumero = Number(valorAbertura) || 0;
  const podeConfirmar = valorNumero >= 0 && valorAbertura !== "";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!podeConfirmar) return;
    onConfirmar({
      valorAbertura: valorNumero,
      operador: operador.trim() || undefined,
      observacoes: observacoes.trim() || undefined,
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Abrir Caixa">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="caixa-valor-abertura" className={labelClassName}>
            Valor inicial (R$)
          </label>
          <input
            id="caixa-valor-abertura"
            type="number"
            min={0}
            step={0.01}
            value={valorAbertura}
            onChange={(event) => setValorAbertura(event.target.value)}
            placeholder="0,00"
            autoFocus
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="caixa-operador" className={labelClassName}>
            Operador (opcional)
          </label>
          <input
            id="caixa-operador"
            type="text"
            value={operador}
            onChange={(event) => setOperador(event.target.value)}
            placeholder="Quem está abrindo o caixa"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="caixa-observacoes" className={labelClassName}>
            Observações (opcional)
          </label>
          <textarea
            id="caixa-observacoes"
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
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
            {processando ? "Abrindo..." : "Abrir Caixa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
