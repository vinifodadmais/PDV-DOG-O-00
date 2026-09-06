import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  conectarQzTray,
  definirCortarPapel,
  definirImprimirAutomaticamente,
  definirImpressoraSelecionada,
  imprimirTeste,
  listarImpressorasDisponiveis,
  obterPreferenciasImpressora,
  obterStatusImpressora,
} from "@/services";

export function ImpressoraCard() {
  const [conectado, setConectado] = useState(false);
  const [impressoras, setImpressoras] = useState<string[]>([]);
  const [impressoraSelecionada, setImpressoraSelecionadaLocal] = useState<string | undefined>();
  const [cortarPapel, setCortarPapel] = useState(false);
  const [imprimirAutomaticamente, setImprimirAutomaticamente] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [conectando, setConectando] = useState(false);
  const [atualizandoLista, setAtualizandoLista] = useState(false);
  const [testando, setTestando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregar() {
    const [status, preferencias] = await Promise.all([
      obterStatusImpressora(),
      obterPreferenciasImpressora(),
    ]);
    setConectado(status.conectado);
    setImpressoraSelecionadaLocal(preferencias.impressoraSelecionada);
    setCortarPapel(preferencias.cortarPapel);
    setImprimirAutomaticamente(preferencias.imprimirAutomaticamente);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleAtualizarImpressoras() {
    setAtualizandoLista(true);
    setErro(null);
    try {
      const lista = await listarImpressorasDisponiveis();
      setImpressoras(lista);
      if (lista.length === 0) {
        setErro(
          "Nenhuma impressora encontrada pelo QZ Tray. Confira se a POS-58 está instalada no Windows (Dispositivos e Impressoras)."
        );
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível listar as impressoras.");
    } finally {
      setAtualizandoLista(false);
    }
  }

  async function handleConectar() {
    setConectando(true);
    setErro(null);
    setMensagem(null);
    try {
      await conectarQzTray();
      await carregar();
      await handleAtualizarImpressoras();
      setMensagem("Conectado ao QZ Tray.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível conectar ao QZ Tray.");
    } finally {
      setConectando(false);
    }
  }

  async function handleSelecionarImpressora(nome: string) {
    setImpressoraSelecionadaLocal(nome);
    await definirImpressoraSelecionada(nome);
  }

  async function handleTestar() {
    setTestando(true);
    setErro(null);
    setMensagem(null);
    try {
      await imprimirTeste();
      setMensagem("Página de teste enviada para a impressora.");
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível imprimir a página de teste."
      );
    } finally {
      setTestando(false);
    }
  }

  async function handleAlternarCortarPapel(valor: boolean) {
    setCortarPapel(valor);
    await definirCortarPapel(valor);
  }

  async function handleAlternarImprimirAuto(valor: boolean) {
    setImprimirAutomaticamente(valor);
    await definirImprimirAutomaticamente(valor);
  }

  return (
    <div className="rounded-lg border border-charcoal-800 bg-charcoal-900 p-4">
      <div className="flex items-start gap-3">
        <Icon name="printer" size={18} className="mt-0.5 shrink-0 text-brand-mustard" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-brand-white">
            Impressora térmica (Goldensky SMX-JP58H, 58mm)
          </h3>
          <p className="mt-1 text-xs text-charcoal-400">
            Conexão via QZ Tray — precisa do aplicativo QZ Tray instalado e aberto no computador
            do caixa (ícone na bandeja do Windows). A POS-58 continua instalada normalmente como
            impressora do Windows.
          </p>
        </div>
      </div>

      {carregando ? (
        <p className="mt-3 text-xs text-charcoal-400">Carregando...</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={
                conectado
                  ? "h-2 w-2 rounded-full bg-green-400"
                  : "h-2 w-2 rounded-full bg-charcoal-600"
              }
            />
            <span className="text-xs text-charcoal-300">
              {conectado
                ? impressoraSelecionada
                  ? `Conectado ao QZ Tray · impressora: ${impressoraSelecionada}`
                  : "Conectado ao QZ Tray · nenhuma impressora selecionada"
                : "QZ Tray não conectado"}
            </span>
          </div>

          {erro && (
            <p className="mt-2 flex items-start gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
              <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
              {erro}
            </p>
          )}
          {mensagem && (
            <p className="mt-2 flex items-center gap-2 rounded-md border border-brand-mustard/40 bg-brand-mustard/10 px-3 py-2 text-xs text-brand-mustard">
              <Icon name="check" size={14} className="shrink-0" />
              {mensagem}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!conectado ? (
              <button
                type="button"
                onClick={handleConectar}
                disabled={conectando}
                className="rounded-md bg-brand-red px-3 py-2 text-xs font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
              >
                {conectando ? "Conectando..." : "Conectar ao QZ Tray"}
              </button>
            ) : (
              <>
                <select
                  value={impressoraSelecionada ?? ""}
                  onChange={(event) => handleSelecionarImpressora(event.target.value)}
                  className="rounded-md border border-charcoal-700 bg-charcoal-800 px-2.5 py-2 text-xs text-brand-white focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard"
                >
                  <option value="" disabled>
                    Selecione a impressora...
                  </option>
                  {impressoras.map((nome) => (
                    <option key={nome} value={nome}>
                      {nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAtualizarImpressoras}
                  disabled={atualizandoLista}
                  className="rounded-md border border-charcoal-700 px-3 py-2 text-xs font-semibold text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
                >
                  {atualizandoLista ? "Atualizando..." : "Atualizar impressoras"}
                </button>
                <button
                  type="button"
                  onClick={handleTestar}
                  disabled={testando || !impressoraSelecionada}
                  className="rounded-md bg-brand-red px-3 py-2 text-xs font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {testando ? "Imprimindo..." : "Testar impressão"}
                </button>
              </>
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-charcoal-800 pt-3">
            <label className="flex items-center gap-2 text-xs text-charcoal-200">
              <input
                type="checkbox"
                checked={imprimirAutomaticamente}
                onChange={(event) => handleAlternarImprimirAuto(event.target.checked)}
                className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-800 text-brand-red focus:ring-brand-mustard"
              />
              Imprimir automaticamente ao finalizar uma venda
            </label>
            <label className="flex items-center gap-2 text-xs text-charcoal-200">
              <input
                type="checkbox"
                checked={cortarPapel}
                onChange={(event) => handleAlternarCortarPapel(event.target.checked)}
                className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-800 text-brand-red focus:ring-brand-mustard"
              />
              Cortar o papel automaticamente (só se a impressora tiver guilhotina)
            </label>
          </div>
        </>
      )}
    </div>
  );
}
