import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import {
  importarCardapioLocalParaSupabase,
  obterPreviaMigracao,
  type PreviaMigracao,
  type ResultadoMigracao,
} from "@/services/admin/migracaoCardapioService";

interface ImportarCardapioModalProps {
  open: boolean;
  onClose: () => void;
  /** Chamado depois de uma importação bem-sucedida, pra recarregar as listas por trás do modal. */
  onImportado: () => void;
}

export function ImportarCardapioModal({ open, onClose, onImportado }: ImportarCardapioModalProps) {
  const [previa, setPrevia] = useState<PreviaMigracao | null>(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoMigracao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmando(false);
    setImportando(false);
    setResultado(null);
    setErro(null);
    setCarregandoPrevia(true);

    obterPreviaMigracao()
      .then(setPrevia)
      .catch((error) => {
        setErro(error instanceof Error ? error.message : "Não foi possível ler a prévia da importação.");
      })
      .finally(() => setCarregandoPrevia(false));
  }, [open]);

  async function handleConfirmar() {
    setImportando(true);
    setErro(null);
    try {
      const resultadoImportacao = await importarCardapioLocalParaSupabase();
      setResultado(resultadoImportacao);
      onImportado();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível importar o cardápio.");
    } finally {
      setImportando(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar cardápio local para o Supabase">
      <div className="space-y-4">
        {carregandoPrevia ? (
          <p className="text-sm text-charcoal-400">Verificando dados...</p>
        ) : resultado ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 rounded-md border border-brand-mustard/40 bg-brand-mustard/10 px-3 py-2 text-sm text-brand-mustard">
              <Icon name="check" size={16} className="shrink-0" />
              Importação concluída.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3">
                <p className="text-xs text-charcoal-400">Categorias importadas</p>
                <p className="text-lg font-semibold text-brand-white">
                  {resultado.categoriasImportadas}
                </p>
              </div>
              <div className="rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3">
                <p className="text-xs text-charcoal-400">Produtos importados</p>
                <p className="text-lg font-semibold text-brand-white">
                  {resultado.produtosImportados}
                </p>
              </div>
            </div>
            {resultado.erros.length > 0 && (
              <div className="rounded-md border border-brand-red/40 bg-brand-red/10 p-3">
                <p className="mb-1.5 text-xs font-semibold text-brand-red-light">
                  {resultado.erros.length} item(ns) com erro:
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-brand-red-light">
                  {resultado.erros.map((linha, index) => (
                    <li key={index}>• {linha}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-charcoal-300">
              Lê as categorias e produtos salvos localmente neste navegador e cria uma cópia deles
              no Supabase. <strong className="text-brand-white">Nunca apaga nada</strong> — nem
              local, nem no Supabase.
            </p>

            {previa && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3">
                  <p className="text-xs text-charcoal-400">Serão importadas</p>
                  <p className="text-lg font-semibold text-brand-white">
                    {previa.categoriasLocais} categoria{previa.categoriasLocais === 1 ? "" : "s"}
                  </p>
                  <p className="text-lg font-semibold text-brand-white">
                    {previa.produtosLocais} produto{previa.produtosLocais === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-md border border-charcoal-800 bg-charcoal-800/50 p-3">
                  <p className="text-xs text-charcoal-400">Já existem no Supabase</p>
                  <p className="text-lg font-semibold text-brand-white">
                    {previa.categoriasNoSupabase} categoria
                    {previa.categoriasNoSupabase === 1 ? "" : "s"}
                  </p>
                  <p className="text-lg font-semibold text-brand-white">
                    {previa.produtosNoSupabase} produto{previa.produtosNoSupabase === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            )}

            {previa?.supabaseJaTemDados && (
              <div className="flex items-start gap-2.5 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2.5">
                <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-brand-red-light" />
                <p className="text-sm text-brand-red-light">
                  O Supabase já tem dados no cardápio. Importar de novo vai <strong>duplicar</strong>{" "}
                  categorias/produtos (não há como distinguir "já veio daqui" de "criado direto no
                  Supabase"). Confira o Table Editor do Supabase antes de continuar, se tiver dúvida.
                </p>
              </div>
            )}

            {erro && (
              <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
                <Icon name="alert" size={14} className="shrink-0" />
                {erro}
              </p>
            )}

            {!confirmando ? (
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
                  onClick={() => setConfirmando(true)}
                  disabled={carregandoPrevia || !previa || previa.categoriasLocais === 0}
                  className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="space-y-3 rounded-md border border-charcoal-700 bg-charcoal-800/50 p-3">
                <p className="text-sm text-brand-white">
                  Confirma importar {previa?.categoriasLocais} categoria(s) e {previa?.produtosLocais}{" "}
                  produto(s) para o Supabase agora?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmando(false)}
                    disabled={importando}
                    className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmar}
                    disabled={importando}
                    className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
                  >
                    {importando ? "Importando..." : "Sim, importar agora"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
