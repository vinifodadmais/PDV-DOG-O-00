import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";

interface ConfirmacaoDestrutivaModalProps {
  open: boolean;
  processando: boolean;
  erro: string | null;
  /** Título da primeira tela (o aviso). */
  titulo: string;
  /** Conteúdo do aviso — o que exatamente será apagado/alterado. */
  aviso: ReactNode;
  /** Palavra que precisa ser digitada na segunda tela pra liberar o botão final. */
  palavraConfirmacao: string;
  /** Texto do botão final (ex: "Apagar Tudo", "Reiniciar Dados Locais"). */
  textoConfirmar: string;
  /** Texto do botão final enquanto a ação está em andamento. */
  textoProcessando: string;
  onClose: () => void;
  onConfirmar: () => void;
}

/**
 * Confirmação dupla reaproveitável para qualquer ação destrutiva do
 * sistema: duas etapas deliberadas (aviso -> digitar uma palavra de
 * confirmação) em vez de um `window.confirm()` só, que é fácil de
 * clicar sem realmente ler. Usada tanto por "Limpar todos os dados"
 * quanto por "Reiniciar dados locais" em Configurações.
 */
export function ConfirmacaoDestrutivaModal({
  open,
  processando,
  erro,
  titulo,
  aviso,
  palavraConfirmacao,
  textoConfirmar,
  textoProcessando,
  onClose,
  onConfirmar,
}: ConfirmacaoDestrutivaModalProps) {
  const [etapa, setEtapa] = useState<"aviso" | "confirmar">("aviso");
  const [textoDigitado, setTextoDigitado] = useState("");

  useEffect(() => {
    if (!open) return;
    setEtapa("aviso");
    setTextoDigitado("");
  }, [open]);

  const podeConfirmar = textoDigitado.trim().toUpperCase() === palavraConfirmacao;

  if (etapa === "aviso") {
    return (
      <Modal open={open} onClose={onClose} title={titulo}>
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2.5">
            <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-brand-red-light" />
            <div className="text-sm text-brand-red-light">{aviso}</div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setEtapa("confirmar")}
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark"
            >
              Continuar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirmar ação">
      <div className="space-y-4">
        <p className="text-sm text-charcoal-300">
          Para confirmar, digite <strong className="text-brand-white">{palavraConfirmacao}</strong> no
          campo abaixo.
        </p>
        <input
          type="text"
          value={textoDigitado}
          onChange={(event) => setTextoDigitado(event.target.value)}
          placeholder={palavraConfirmacao}
          autoFocus
          className="w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
        />

        {erro && (
          <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            {erro}
          </p>
        )}

        <div className="flex justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setEtapa("aviso")}
            disabled={processando}
            className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
          >
            Voltar
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={processando}
              className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={!podeConfirmar || processando}
              className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processando ? textoProcessando : textoConfirmar}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
