import { useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";
import { ImportarBackupModal } from "@/components/configuracoes/ImportarBackupModal";
import { ConfirmacaoDestrutivaModal } from "@/components/configuracoes/ConfirmacaoDestrutivaModal";
import { ImpressoraCard } from "@/components/configuracoes/ImpressoraCard";
import { useResumoDados } from "@/hooks/useResumoDados";
import { useAuth } from "@/contexts/AuthContext";
import {
  gerarBackup,
  nomeArquivoBackup,
  validarBackupDeTexto,
  restaurarBackup,
  limparTodosOsDados,
  restaurarDadosDemonstracao,
  type Backup,
  type ResumoBackup,
} from "@/services";
import { baixarArquivoTexto, lerArquivoComoTexto } from "@/utils/file";

export function Configuracoes() {
  const { isAdmin } = useAuth();
  const { resumo, carregando, recarregar } = useResumoDados();

  const [mensagem, setMensagem] = useState<string | null>(null);

  // Exportar
  const [exportando, setExportando] = useState(false);

  // Importar
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  const [backupValidado, setBackupValidado] = useState<Backup | null>(null);
  const [resumoBackup, setResumoBackup] = useState<ResumoBackup | null>(null);
  const [processandoImportacao, setProcessandoImportacao] = useState(false);
  const [erroImportacao, setErroImportacao] = useState<string | null>(null);

  // Reiniciar dados locais (confirmação dupla — era "Restaurar dados de
  // demonstração", renomeado: hoje recarrega o catálogo local real e
  // zera pedidos/estoque/caixa LOCAIS, não é mais "dado fictício").
  const [modalReiniciarAberto, setModalReiniciarAberto] = useState(false);
  const [processandoReinicio, setProcessandoReinicio] = useState(false);
  const [erroReinicio, setErroReinicio] = useState<string | null>(null);

  // Limpar tudo (confirmação dupla)
  const [modalLimparAberto, setModalLimparAberto] = useState(false);
  const [processandoLimpeza, setProcessandoLimpeza] = useState(false);
  const [erroLimpeza, setErroLimpeza] = useState<string | null>(null);

  async function handleExportarBackup() {
    setMensagem(null);
    setExportando(true);
    try {
      const backup = await gerarBackup();
      baixarArquivoTexto(nomeArquivoBackup(), JSON.stringify(backup, null, 2));
      setMensagem("Backup exportado com sucesso.");
    } finally {
      setExportando(false);
    }
  }

  function handleClicarImportar() {
    inputArquivoRef.current?.click();
  }

  async function handleArquivoSelecionado(event: ChangeEvent<HTMLInputElement>) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;

    setMensagem(null);
    setErroImportacao(null);
    setBackupValidado(null);
    setResumoBackup(null);

    try {
      const texto = await lerArquivoComoTexto(arquivo);
      const resultado = validarBackupDeTexto(texto);
      if (!resultado.valido) {
        setErroImportacao(resultado.erro ?? "Arquivo de backup inválido.");
      } else {
        setBackupValidado(resultado.backup ?? null);
        setResumoBackup(resultado.resumo ?? null);
      }
    } catch (error) {
      setErroImportacao(
        error instanceof Error ? error.message : "Não foi possível ler o arquivo."
      );
    } finally {
      setModalImportarAberto(true);
    }
  }

  async function handleConfirmarImportacao() {
    if (!backupValidado) return;
    setProcessandoImportacao(true);
    setErroImportacao(null);
    try {
      await restaurarBackup(backupValidado);
      setModalImportarAberto(false);
      setMensagem("Backup restaurado com sucesso.");
      await recarregar();
    } catch (error) {
      setErroImportacao(
        error instanceof Error ? error.message : "Não foi possível restaurar o backup."
      );
    } finally {
      setProcessandoImportacao(false);
    }
  }

  function handleFecharModalImportar() {
    if (processandoImportacao) return;
    setModalImportarAberto(false);
    setBackupValidado(null);
    setResumoBackup(null);
    setErroImportacao(null);
  }

  async function handleConfirmarReinicio() {
    setProcessandoReinicio(true);
    setErroReinicio(null);
    try {
      await restaurarDadosDemonstracao();
      setModalReiniciarAberto(false);
      setMensagem("Dados locais reiniciados (catálogo local recarregado; pedidos, estoque e caixa locais zerados).");
      await recarregar();
    } catch (error) {
      setErroReinicio(
        error instanceof Error ? error.message : "Não foi possível reiniciar os dados locais."
      );
    } finally {
      setProcessandoReinicio(false);
    }
  }

  async function handleConfirmarLimpeza() {
    setProcessandoLimpeza(true);
    setErroLimpeza(null);
    try {
      await limparTodosOsDados();
      setModalLimparAberto(false);
      setMensagem("Todos os dados locais foram apagados.");
      await recarregar();
    } catch (error) {
      setErroLimpeza(
        error instanceof Error ? error.message : "Não foi possível limpar os dados."
      );
    } finally {
      setProcessandoLimpeza(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="display-title text-lg text-brand-white">Dados do sistema</h2>
        <p className="text-sm text-charcoal-400">
          Contagens lidas agora mesmo do armazenamento local do navegador.
        </p>
      </div>

      {mensagem && (
        <p className="flex items-center gap-2 rounded-md border border-brand-mustard/40 bg-brand-mustard/10 px-3 py-2 text-sm text-brand-mustard">
          <Icon name="check" size={16} className="shrink-0" />
          {mensagem}
        </p>
      )}

      {carregando || !resumo ? (
        <p className="text-sm text-charcoal-400">Carregando dados...</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard icon="box" label="Categorias" value={resumo.categorias} />
          <StatCard icon="box" label="Produtos" value={resumo.produtos} />
          <StatCard icon="receipt" label="Pedidos" value={resumo.pedidos} />
          <StatCard icon="cash" label="Sessões de caixa" value={resumo.sessoesCaixa} />
          <StatCard
            icon="cash"
            label="Movimentações de caixa"
            value={resumo.movimentacoesCaixa}
          />
          <StatCard
            icon="box"
            label="Movimentações de estoque"
            value={resumo.movimentacoesEstoque}
          />
        </div>
      )}

      {/* Backup */}
      <div className="rounded-lg border border-charcoal-800 bg-charcoal-900 p-4">
        <div className="flex items-start gap-3">
          <Icon name="receipt" size={18} className="mt-0.5 shrink-0 text-brand-mustard" />
          <div>
            <h3 className="text-sm font-semibold text-brand-white">Backup local</h3>
            <p className="mt-1 text-xs text-charcoal-400">
              Como os dados ficam só no navegador (localStorage), exporte um backup
              regularmente para não correr risco de perda. Tudo funciona offline —
              o arquivo fica salvo no seu computador.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportarBackup}
            disabled={exportando}
            className="rounded-md bg-brand-red px-3 py-2 text-xs font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
          >
            {exportando ? "Gerando..." : "Exportar Backup"}
          </button>
          <button
            type="button"
            onClick={handleClicarImportar}
            className="rounded-md border border-charcoal-700 px-3 py-2 text-xs font-semibold text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            Importar Backup
          </button>
          <input
            ref={inputArquivoRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleArquivoSelecionado}
          />
        </div>
      </div>

      {/* Impressora térmica */}
      <ImpressoraCard />

      {/* Ações administrativas destrutivas — só para admin */}
      {isAdmin && (
        <>
          <div className="rounded-lg border border-dashed border-charcoal-700 bg-charcoal-900/40 p-4">
            <div className="flex items-start gap-3">
              <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-brand-mustard" />
              <div>
                <h3 className="text-sm font-semibold text-brand-white">Dados locais</h3>
                <p className="mt-1 text-xs text-charcoal-400">
                  Recarrega o catálogo local (produtos/categorias salvos neste navegador) e
                  zera pedidos, estoque e caixa locais. Não afeta o Supabase nem apaga vendas
                  reais registradas lá. Só para administradores.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setModalReiniciarAberto(true)}
                className="rounded-md border border-charcoal-700 px-3 py-2 text-xs font-semibold text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
              >
                Reiniciar dados locais
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-brand-red/30 bg-brand-red/5 p-4">
            <div className="flex items-start gap-3">
              <Icon name="alert" size={18} className="mt-0.5 shrink-0 text-brand-red-light" />
              <div>
                <h3 className="text-sm font-semibold text-brand-red-light">Zona de perigo</h3>
                <p className="mt-1 text-xs text-charcoal-400">
                  Apaga permanentemente todos os dados LOCAIS (produtos, categorias, pedidos,
                  estoque e caixas salvos neste navegador). Não afeta o Supabase. Exporte um
                  backup antes, se tiver dúvida. Só para administradores.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setModalLimparAberto(true)}
                className="rounded-md border border-brand-red/50 px-3 py-2 text-xs font-semibold text-brand-red-light transition-colors hover:bg-brand-red/10"
              >
                Limpar todos os dados locais
              </button>
            </div>
          </div>
        </>
      )}

      <ImportarBackupModal
        open={modalImportarAberto}
        resumo={resumoBackup}
        processando={processandoImportacao}
        erro={erroImportacao}
        onClose={handleFecharModalImportar}
        onConfirmar={handleConfirmarImportacao}
      />

      <ConfirmacaoDestrutivaModal
        open={modalReiniciarAberto}
        processando={processandoReinicio}
        erro={erroReinicio}
        titulo="Reiniciar dados locais"
        palavraConfirmacao="REINICIAR"
        textoConfirmar="Reiniciar Dados Locais"
        textoProcessando="Reiniciando..."
        aviso={
          <>
            <p className="font-semibold">Isso recarrega o catálogo local e zera pedidos/estoque/caixa locais.</p>
            <p className="mt-1">
              Produtos e categorias salvos neste navegador voltam ao catálogo padrão do Dogão
              da Praça. Pedidos, estoque e sessões de caixa <strong>locais</strong> são
              apagados. <strong>O Supabase não é afetado</strong> — vendas, estoque e caixa
              reais continuam intactos lá.
            </p>
          </>
        }
        onClose={() => {
          setModalReiniciarAberto(false);
          setErroReinicio(null);
        }}
        onConfirmar={handleConfirmarReinicio}
      />

      <ConfirmacaoDestrutivaModal
        open={modalLimparAberto}
        processando={processandoLimpeza}
        erro={erroLimpeza}
        titulo="Limpar todos os dados locais"
        palavraConfirmacao="APAGAR"
        textoConfirmar="Apagar Tudo"
        textoProcessando="Apagando..."
        aviso={
          <>
            <p className="font-semibold">Isso apaga TUDO que está salvo neste navegador, permanentemente.</p>
            <p className="mt-1">
              Produtos, categorias, pedidos, estoque, sessões de caixa e todas as
              movimentações <strong>locais</strong> serão apagados. Essa ação{" "}
              <strong>não pode ser desfeita</strong>. O Supabase não é afetado. Se tiver
              dúvida, exporte um backup antes de continuar.
            </p>
          </>
        }
        onClose={() => {
          setModalLimparAberto(false);
          setErroLimpeza(null);
        }}
        onConfirmar={handleConfirmarLimpeza}
      />
    </div>
  );
}
