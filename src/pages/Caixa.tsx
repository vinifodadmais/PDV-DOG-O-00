import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StatCard } from "@/components/ui/StatCard";
import { AbrirCaixaModal, type AbrirCaixaValues } from "@/components/caixa/AbrirCaixaModal";
import {
  SangriaDespesaModal,
  type SangriaDespesaValues,
} from "@/components/caixa/SangriaDespesaModal";
import { FecharCaixaModal } from "@/components/caixa/FecharCaixaModal";
import {
  abrirCaixa,
  fecharCaixa,
  listarMovimentacoesPorSessao,
  listarSessoesCaixa,
  obterResumoSessao,
  obterSessaoCaixaAberta,
  registrarDespesa,
  registrarSangria,
  type ResumoCaixa,
} from "@/services/caixaSupabaseService";
import { formatarMoeda } from "@/utils/currency";
import { cn } from "@/utils/cn";
import type { MovimentacaoCaixa, SessaoCaixa } from "@/types";

const ROTULOS_ORIGEM: Record<string, string> = {
  venda: "Venda",
  sangria: "Sangria",
  despesa: "Despesa",
  reforco: "Reforço",
  cancelamento: "Estorno (cancelamento)",
  ajuste: "Ajuste",
};

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function Caixa() {
  const [sessao, setSessao] = useState<SessaoCaixa | null>(null);
  const [resumo, setResumo] = useState<ResumoCaixa | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoCaixa[]>([]);
  const [sessoesAnteriores, setSessoesAnteriores] = useState<SessaoCaixa[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalAbrirAberto, setModalAbrirAberto] = useState(false);
  const [modalSangriaAberto, setModalSangriaAberto] = useState(false);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [modalFecharAberto, setModalFecharAberto] = useState(false);
  const [sessaoFechada, setSessaoFechada] = useState<SessaoCaixa | null>(null);

  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const aberta = await obterSessaoCaixaAberta();
    setSessao(aberta);

    if (aberta) {
      const [resumoAtual, movs] = await Promise.all([
        obterResumoSessao(aberta.id),
        listarMovimentacoesPorSessao(aberta.id),
      ]);
      setResumo(resumoAtual);
      setMovimentacoes(movs);
      setSessoesAnteriores([]);
    } else {
      setResumo(null);
      setMovimentacoes([]);
      const todas = await listarSessoesCaixa();
      setSessoesAnteriores(todas.filter((s) => s.status === "fechada").slice(0, 5));
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleConfirmarAbertura(valores: AbrirCaixaValues) {
    setProcessando(true);
    setErro(null);
    try {
      await abrirCaixa(valores);
      setModalAbrirAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível abrir o caixa.");
    } finally {
      setProcessando(false);
    }
  }

  async function handleConfirmarSangria(valores: SangriaDespesaValues) {
    if (!sessao) return;
    setProcessando(true);
    setErro(null);
    try {
      await registrarSangria({ sessaoCaixaId: sessao.id, ...valores });
      setModalSangriaAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a sangria.");
    } finally {
      setProcessando(false);
    }
  }

  async function handleConfirmarDespesa(valores: SangriaDespesaValues) {
    if (!sessao) return;
    setProcessando(true);
    setErro(null);
    try {
      await registrarDespesa({ sessaoCaixaId: sessao.id, ...valores });
      setModalDespesaAberto(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar a despesa.");
    } finally {
      setProcessando(false);
    }
  }

  async function handleConfirmarFechamento(valorInformado: number) {
    if (!sessao) return;
    setProcessando(true);
    setErro(null);
    try {
      const fechada = await fecharCaixa(sessao.id, valorInformado);
      if (fechada) setSessaoFechada(fechada);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível fechar o caixa.");
    } finally {
      setProcessando(false);
    }
  }

  async function handleConcluirFechamento() {
    setModalFecharAberto(false);
    setSessaoFechada(null);
    await carregar();
  }

  if (carregando) {
    return <p className="text-sm text-charcoal-400">Carregando caixa...</p>;
  }

  // ---------- Nenhum caixa aberto ----------
  if (!sessao) {
    return (
      <div className="space-y-6">
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-charcoal-700 bg-charcoal-900/40 px-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-charcoal-800 text-brand-mustard">
            <Icon name="cash" size={26} />
          </div>
          <h2 className="display-title text-lg text-brand-white">Nenhum caixa aberto</h2>
          <p className="max-w-sm text-sm text-charcoal-400">
            Abra o caixa informando o valor inicial para começar a vender. Sem um caixa
            aberto, o PDV não permite finalizar vendas.
          </p>
          <button
            type="button"
            onClick={() => setModalAbrirAberto(true)}
            className="mt-2 rounded-md bg-brand-red px-5 py-2.5 text-sm font-bold text-brand-white transition-colors hover:bg-brand-red-dark"
          >
            Abrir Caixa
          </button>
        </div>

        {sessoesAnteriores.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-brand-white">
              Últimas sessões fechadas
            </h3>
            <div className="overflow-x-auto rounded-lg border border-charcoal-800 bg-charcoal-900">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-charcoal-800 text-xs uppercase tracking-wide text-charcoal-400">
                    <th className="px-4 py-3 font-medium">Aberta em</th>
                    <th className="px-4 py-3 font-medium">Fechada em</th>
                    <th className="px-4 py-3 font-medium">Esperado</th>
                    <th className="px-4 py-3 font-medium">Informado</th>
                    <th className="px-4 py-3 font-medium">Diferença</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-800">
                  {sessoesAnteriores.map((sessaoAnterior) => {
                    const diferenca =
                      (sessaoAnterior.valorFechamentoInformado ?? 0) -
                      (sessaoAnterior.valorFechamentoCalculado ?? 0);
                    return (
                      <tr key={sessaoAnterior.id}>
                        <td className="whitespace-nowrap px-4 py-3 text-charcoal-400">
                          {formatarDataHora(sessaoAnterior.abertoEm)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-charcoal-400">
                          {sessaoAnterior.fechadoEm ? formatarDataHora(sessaoAnterior.fechadoEm) : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-brand-white">
                          {formatarMoeda(sessaoAnterior.valorFechamentoCalculado ?? 0)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-brand-white">
                          {formatarMoeda(sessaoAnterior.valorFechamentoInformado ?? 0)}
                        </td>
                        <td
                          className={cn(
                            "px-4 py-3 tabular-nums font-medium",
                            diferenca === 0
                              ? "text-brand-mustard"
                              : diferenca > 0
                                ? "text-green-400"
                                : "text-brand-red-light"
                          )}
                        >
                          {diferenca > 0 ? "+" : ""}
                          {formatarMoeda(diferenca)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <AbrirCaixaModal
          open={modalAbrirAberto}
          processando={processando}
          erro={erro}
          onClose={() => {
            setModalAbrirAberto(false);
            setErro(null);
          }}
          onConfirmar={handleConfirmarAbertura}
        />
      </div>
    );
  }

  // ---------- Caixa aberto ----------
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-charcoal-800 bg-charcoal-900 px-4 py-3">
        <div>
          <p className="display-title text-base text-brand-white">
            Caixa aberto desde {formatarHora(sessao.abertoEm)}
          </p>
          <p className="text-xs text-charcoal-400">
            {sessao.operador ? `Operador: ${sessao.operador} · ` : ""}
            Valor inicial: {formatarMoeda(sessao.valorAbertura)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalSangriaAberto(true)}
            className="flex items-center gap-2 rounded-md border border-charcoal-700 px-3 py-2 text-sm font-medium text-charcoal-200 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            <Icon name="minus" size={15} />
            Nova Sangria
          </button>
          <button
            type="button"
            onClick={() => setModalDespesaAberto(true)}
            className="flex items-center gap-2 rounded-md border border-charcoal-700 px-3 py-2 text-sm font-medium text-charcoal-200 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            <Icon name="receipt" size={15} />
            Nova Despesa
          </button>
          <button
            type="button"
            onClick={() => setModalFecharAberto(true)}
            className="flex items-center gap-2 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark"
          >
            Fechar Caixa
          </button>
        </div>
      </div>

      {erro && (
        <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red-light">
          <Icon name="alert" size={16} className="shrink-0" />
          {erro}
        </p>
      )}

      {resumo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon="cash" label="Valor inicial" value={formatarMoeda(resumo.valorAbertura)} />
          <StatCard icon="cash" label="Vendas dinheiro" value={formatarMoeda(resumo.vendasDinheiro)} />
          <StatCard icon="cash" label="Vendas Pix" value={formatarMoeda(resumo.vendasPix)} />
          <StatCard icon="cash" label="Vendas débito" value={formatarMoeda(resumo.vendasDebito)} />
          <StatCard icon="cash" label="Vendas crédito" value={formatarMoeda(resumo.vendasCredito)} />
          <StatCard icon="minus" label="Sangrias" value={formatarMoeda(resumo.totalSangrias)} />
          <StatCard icon="receipt" label="Despesas" value={formatarMoeda(resumo.totalDespesas)} />
          <StatCard icon="cash" label="Valor esperado" value={formatarMoeda(resumo.valorEsperado)} />
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-white">Movimentações da sessão</h3>
        {movimentacoes.length === 0 ? (
          <p className="text-sm text-charcoal-400">Nenhuma movimentação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-charcoal-800 bg-charcoal-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-charcoal-800 text-xs uppercase tracking-wide text-charcoal-400">
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-800">
                {movimentacoes.map((movimentacao) => (
                  <tr key={movimentacao.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-charcoal-400">
                      {formatarHora(movimentacao.criadoEm)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-200">
                      {ROTULOS_ORIGEM[movimentacao.origem] ?? movimentacao.origem}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-3 tabular-nums font-semibold",
                        movimentacao.tipo === "entrada" ? "text-green-400" : "text-brand-red-light"
                      )}
                    >
                      {movimentacao.tipo === "entrada" ? "+" : "-"}
                      {formatarMoeda(movimentacao.valor)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-400">{movimentacao.motivo ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SangriaDespesaModal
        open={modalSangriaAberto}
        tipo="sangria"
        processando={processando}
        erro={erro}
        onClose={() => {
          setModalSangriaAberto(false);
          setErro(null);
        }}
        onConfirmar={handleConfirmarSangria}
      />

      <SangriaDespesaModal
        open={modalDespesaAberto}
        tipo="despesa"
        processando={processando}
        erro={erro}
        onClose={() => {
          setModalDespesaAberto(false);
          setErro(null);
        }}
        onConfirmar={handleConfirmarDespesa}
      />

      <FecharCaixaModal
        open={modalFecharAberto}
        sessao={sessao}
        resumo={resumo}
        processando={processando}
        erro={erro}
        sessaoFechada={sessaoFechada}
        onClose={() => {
          setModalFecharAberto(false);
          setErro(null);
        }}
        onConfirmarFechamento={handleConfirmarFechamento}
        onConcluir={handleConcluirFechamento}
      />
    </div>
  );
}
