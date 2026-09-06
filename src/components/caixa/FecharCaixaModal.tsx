import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/utils/cn";
import { formatarMoeda } from "@/utils/currency";
import type { ResumoCaixa } from "@/services";
import type { SessaoCaixa } from "@/types";

interface FecharCaixaModalProps {
  open: boolean;
  sessao: SessaoCaixa | null;
  resumo: ResumoCaixa | null;
  processando: boolean;
  erro: string | null;
  sessaoFechada: SessaoCaixa | null;
  onClose: () => void;
  onConfirmarFechamento: (valorInformado: number) => void;
  onConcluir: () => void;
}

function LinhaResumo({
  label,
  valor,
  destaque = false,
  negativo = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
  negativo?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between text-sm",
        destaque && "border-t border-charcoal-800 pt-2 text-base font-bold"
      )}
    >
      <span className={destaque ? "text-brand-white display-title" : "text-charcoal-300"}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-semibold",
          destaque ? "text-brand-white" : negativo ? "text-brand-red-light" : "text-charcoal-200"
        )}
      >
        {negativo && valor > 0 ? "- " : ""}
        {formatarMoeda(valor)}
      </span>
    </div>
  );
}

export function FecharCaixaModal({
  open,
  resumo,
  processando,
  erro,
  sessaoFechada,
  onClose,
  onConfirmarFechamento,
  onConcluir,
}: FecharCaixaModalProps) {
  const [valorInformado, setValorInformado] = useState("");

  useEffect(() => {
    if (!open) return;
    setValorInformado("");
  }, [open]);

  const valorInformadoNumero = Number(valorInformado) || 0;
  const diferenca = resumo ? valorInformadoNumero - resumo.valorEsperado : 0;
  const podeFechar = valorInformado !== "" && valorInformadoNumero >= 0;

  function handleConfirmar() {
    if (!podeFechar) return;
    onConfirmarFechamento(valorInformadoNumero);
  }

  // Tela de confirmação, depois que o caixa foi fechado com sucesso.
  if (sessaoFechada) {
    const diferencaFinal =
      (sessaoFechada.valorFechamentoInformado ?? 0) -
      (sessaoFechada.valorFechamentoCalculado ?? 0);

    return (
      <Modal open={open} onClose={onConcluir} title="Caixa fechado" widthClassName="max-w-md">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-mustard/15 text-brand-mustard">
            <Icon name="check" size={28} />
          </div>
          <p className="display-title text-lg text-brand-white">Sessão encerrada</p>

          <div className="w-full space-y-1.5 rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3 text-left text-sm">
            <LinhaResumo label="Valor esperado" valor={sessaoFechada.valorFechamentoCalculado ?? 0} />
            <LinhaResumo label="Valor informado" valor={sessaoFechada.valorFechamentoInformado ?? 0} />
            <div className="flex items-center justify-between border-t border-charcoal-700 pt-1.5 text-sm font-semibold">
              <span className="text-charcoal-300">Diferença</span>
              <span
                className={cn(
                  "tabular-nums",
                  diferencaFinal === 0
                    ? "text-brand-mustard"
                    : diferencaFinal > 0
                      ? "text-green-400"
                      : "text-brand-red-light"
                )}
              >
                {diferencaFinal > 0 ? "+" : ""}
                {formatarMoeda(diferencaFinal)}
              </span>
            </div>
          </div>

          <p className="text-xs text-charcoal-400">
            Nenhuma nova venda pode ser feita até abrir outro caixa.
          </p>

          <button
            type="button"
            onClick={onConcluir}
            className="w-full rounded-md bg-brand-red py-3 text-sm font-bold uppercase tracking-wide text-brand-white transition-colors hover:bg-brand-red-dark"
          >
            OK
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Fechar Caixa" widthClassName="max-w-md">
      <div className="space-y-4">
        {resumo && (
          <div className="space-y-1.5 rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3">
            <LinhaResumo label="Valor inicial" valor={resumo.valorAbertura} />
            <LinhaResumo label="💵 Vendas em dinheiro" valor={resumo.vendasDinheiro} />
            <LinhaResumo label="📱 Vendas Pix" valor={resumo.vendasPix} />
            <LinhaResumo label="💳 Vendas débito" valor={resumo.vendasDebito} />
            <LinhaResumo label="💳 Vendas crédito" valor={resumo.vendasCredito} />
            <LinhaResumo label="Sangrias" valor={resumo.totalSangrias} negativo />
            <LinhaResumo label="Despesas" valor={resumo.totalDespesas} negativo />
            <LinhaResumo label="Valor esperado" valor={resumo.valorEsperado} destaque />
          </div>
        )}

        <div>
          <label htmlFor="valor-informado" className="mb-1.5 block text-xs font-medium text-charcoal-300">
            Valor informado (contado no caixa)
          </label>
          <input
            id="valor-informado"
            type="number"
            min={0}
            step={0.01}
            value={valorInformado}
            onChange={(event) => setValorInformado(event.target.value)}
            placeholder="0,00"
            autoFocus
            className="w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard"
          />
        </div>

        {valorInformado !== "" && resumo && (
          <div className="flex items-center justify-between rounded-md border border-charcoal-800 px-3 py-2 text-sm">
            <span className="text-charcoal-400">Diferença</span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                diferenca === 0
                  ? "text-brand-mustard"
                  : diferenca > 0
                    ? "text-green-400"
                    : "text-brand-red-light"
              )}
            >
              {diferenca > 0 ? "+" : ""}
              {formatarMoeda(diferenca)}
            </span>
          </div>
        )}

        {erro && (
          <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
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
            onClick={handleConfirmar}
            disabled={!podeFechar || processando}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processando ? "Fechando..." : "Fechar Caixa"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
