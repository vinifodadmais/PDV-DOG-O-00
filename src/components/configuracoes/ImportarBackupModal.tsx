import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import type { ResumoBackup } from "@/services";

interface ImportarBackupModalProps {
  open: boolean;
  resumo: ResumoBackup | null;
  processando: boolean;
  erro: string | null;
  onClose: () => void;
  onConfirmar: () => void;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function ImportarBackupModal({
  open,
  resumo,
  processando,
  erro,
  onClose,
  onConfirmar,
}: ImportarBackupModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Importar Backup">
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2.5">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-brand-red-light" />
          <p className="text-sm font-semibold text-brand-red-light">
            Isso substituirá os dados atuais. Todos os produtos, categorias, pedidos,
            estoque e caixas salvos agora serão apagados e trocados pelo conteúdo
            deste arquivo.
          </p>
        </div>

        {resumo && (
          <div className="space-y-1 rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3 text-sm">
            <p className="mb-2 text-xs text-charcoal-400">
              Backup gerado em {formatarDataHora(resumo.geradoEm)}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-charcoal-300">
              <div className="flex justify-between">
                <span>Categorias</span>
                <span className="font-medium tabular-nums text-brand-white">
                  {resumo.categorias}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Produtos</span>
                <span className="font-medium tabular-nums text-brand-white">
                  {resumo.produtos}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pedidos</span>
                <span className="font-medium tabular-nums text-brand-white">
                  {resumo.pedidos}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sessões de caixa</span>
                <span className="font-medium tabular-nums text-brand-white">
                  {resumo.sessoesCaixa}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Movim. de caixa</span>
                <span className="font-medium tabular-nums text-brand-white">
                  {resumo.movimentacoesCaixa}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Movim. de estoque</span>
                <span className="font-medium tabular-nums text-brand-white">
                  {resumo.movimentacoesEstoque}
                </span>
              </div>
            </div>
          </div>
        )}

        {erro && (
          <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            <Icon name="alert" size={14} className="shrink-0" />
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
            onClick={onConfirmar}
            disabled={processando || !resumo}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {processando ? "Restaurando..." : "Substituir e Restaurar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
