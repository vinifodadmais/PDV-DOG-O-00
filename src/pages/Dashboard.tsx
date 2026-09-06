import { useEffect, useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Resumo7DiasBars } from "@/components/dashboard/Resumo7DiasBars";
import { ProdutosMaisVendidosList } from "@/components/dashboard/ProdutosMaisVendidosList";
import { UltimosPedidosList } from "@/components/dashboard/UltimosPedidosList";
import { EstoqueBaixoList } from "@/components/dashboard/EstoqueBaixoList";
import {
  obterResumoVendasHoje,
  obterProdutosMaisVendidosHoje,
  obterUltimosPedidos,
  obterResumoUltimos7Dias,
  listarProdutosComEstoqueBaixo,
  type ResumoVendasHoje,
  type ProdutoMaisVendido,
  type ResumoDia,
} from "@/services";
import { formatarMoeda } from "@/utils/currency";
import type { Pedido, Produto } from "@/types";

/**
 * Dashboard "Início" do Dogão da Praça. Tudo aqui vem de dados reais do
 * storage (pedidos, produtos) — nada de números fictícios. Quando ainda
 * não há vendas, os cartões e listas mostram um estado vazio amigável em
 * vez de zeros sem contexto.
 */
export function Dashboard() {
  const [resumoHoje, setResumoHoje] = useState<ResumoVendasHoje | null>(null);
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<ProdutoMaisVendido[]>([]);
  const [ultimosPedidos, setUltimosPedidos] = useState<Pedido[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<Produto[]>([]);
  const [resumo7Dias, setResumo7Dias] = useState<ResumoDia[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const [resumo, maisVendidos, pedidos, estoqueBaixo, ultimos7Dias] = await Promise.all([
        obterResumoVendasHoje(),
        obterProdutosMaisVendidosHoje(5),
        obterUltimosPedidos(5),
        listarProdutosComEstoqueBaixo(),
        obterResumoUltimos7Dias(),
      ]);
      setResumoHoje(resumo);
      setProdutosMaisVendidos(maisVendidos);
      setUltimosPedidos(pedidos);
      setProdutosEstoqueBaixo(estoqueBaixo);
      setResumo7Dias(ultimos7Dias);
      setCarregando(false);
    }
    carregar();
  }, []);

  if (carregando || !resumoHoje) {
    return <p className="text-sm text-charcoal-400">Carregando dashboard...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="cash" label="Vendas hoje" value={formatarMoeda(resumoHoje.totalVendas)} />
        <StatCard icon="receipt" label="Pedidos hoje" value={resumoHoje.totalPedidos} />
        <StatCard
          icon="tag"
          label="Ticket médio"
          value={resumoHoje.ticketMedio !== null ? formatarMoeda(resumoHoje.ticketMedio) : "—"}
        />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon="cash"
          label="Dinheiro"
          value={formatarMoeda(resumoHoje.porFormaPagamento.dinheiro)}
        />
        <StatCard icon="cash" label="Pix" value={formatarMoeda(resumoHoje.porFormaPagamento.pix)} />
        <StatCard
          icon="cash"
          label="Débito"
          value={formatarMoeda(resumoHoje.porFormaPagamento.debito)}
        />
        <StatCard
          icon="cash"
          label="Crédito"
          value={formatarMoeda(resumoHoje.porFormaPagamento.credito)}
        />
      </div>

      {resumoHoje.totalPedidos === 0 && (
        <p className="rounded-md border border-dashed border-charcoal-700 bg-charcoal-900/40 px-4 py-3 text-sm text-charcoal-400">
          Nenhuma venda registrada hoje ainda. Assim que a primeira venda for
          finalizada no PDV, os números aqui atualizam automaticamente.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <DashboardCard icon="tag" title="Produtos mais vendidos hoje">
          <ProdutosMaisVendidosList produtos={produtosMaisVendidos} />
        </DashboardCard>
        <DashboardCard icon="alert" title="Estoque baixo">
          <EstoqueBaixoList produtos={produtosEstoqueBaixo} />
        </DashboardCard>
        <DashboardCard icon="receipt" title="Últimos pedidos">
          <UltimosPedidosList pedidos={ultimosPedidos} />
        </DashboardCard>
      </div>

      <DashboardCard icon="cash" title="Últimos 7 dias">
        <Resumo7DiasBars dias={resumo7Dias} />
      </DashboardCard>
    </div>
  );
}
