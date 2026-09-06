import { pedidoRepository } from "@/storage";
import { pedidoFoiPago } from "./pedidoService";
import { arredondarMoeda } from "@/utils/currency";
import type { EntityId, Pedido } from "@/types";

/**
 * Compara datas pelo dia LOCAL (não UTC) — importante porque as vendas
 * são registradas com `toISOString()` (UTC), e o Brasil está atrás do
 * UTC. Comparar a data "hoje" corretamente evita que vendas do fim da
 * noite caiam no dia errado.
 */
function ehMesmoDia(iso: string, referencia: Date): boolean {
  const data = new Date(iso);
  return (
    data.getFullYear() === referencia.getFullYear() &&
    data.getMonth() === referencia.getMonth() &&
    data.getDate() === referencia.getDate()
  );
}

function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/** Pedidos que já foram pagos e não foram cancelados — a base de "vendas" reais. */
async function listarVendas(): Promise<Pedido[]> {
  const todos = await pedidoRepository.getAll();
  return todos.filter((pedido) => pedidoFoiPago(pedido.status));
}

export interface ResumoPorFormaPagamento {
  dinheiro: number;
  pix: number;
  debito: number;
  credito: number;
}

export interface ResumoVendasHoje {
  totalVendas: number;
  totalPedidos: number;
  /** null quando não há pedidos hoje (evita mostrar uma "média" de nada). */
  ticketMedio: number | null;
  porFormaPagamento: ResumoPorFormaPagamento;
}

/**
 * Resumo do dia corrente: vendas, pedidos, ticket médio e o total líquido
 * recebido em cada forma de pagamento (dinheiro já descontando o troco,
 * do mesmo jeito que o caixa calcula).
 */
export async function obterResumoVendasHoje(): Promise<ResumoVendasHoje> {
  const hoje = new Date();
  const vendas = await listarVendas();
  const vendasDeHoje = vendas.filter((pedido) => ehMesmoDia(pedido.createdAt, hoje));

  const totalVendas = arredondarMoeda(
    vendasDeHoje.reduce((soma, pedido) => soma + pedido.total, 0)
  );
  const totalPedidos = vendasDeHoje.length;
  const ticketMedio = totalPedidos > 0 ? arredondarMoeda(totalVendas / totalPedidos) : null;

  const porFormaPagamento: ResumoPorFormaPagamento = {
    dinheiro: 0,
    pix: 0,
    debito: 0,
    credito: 0,
  };

  const BUCKET_POR_FORMA: Partial<Record<string, keyof ResumoPorFormaPagamento>> = {
    dinheiro: "dinheiro",
    pix: "pix",
    debito: "debito",
    credito: "credito",
  };

  for (const pedido of vendasDeHoje) {
    for (const pagamento of pedido.pagamentos) {
      const bucket = BUCKET_POR_FORMA[pagamento.forma];
      if (!bucket) continue; // ignora "outro" ou qualquer forma desconhecida/corrompida
      const valorLiquido =
        pagamento.forma === "dinheiro"
          ? pagamento.valor - (pagamento.troco ?? 0)
          : pagamento.valor;
      porFormaPagamento[bucket] = arredondarMoeda(porFormaPagamento[bucket] + valorLiquido);
    }
  }

  return { totalVendas, totalPedidos, ticketMedio, porFormaPagamento };
}

export interface ProdutoMaisVendido {
  produtoId: EntityId;
  nome: string;
  quantidade: number;
  totalVendido: number;
}

/** Produtos mais vendidos hoje, ordenados por quantidade. */
export async function obterProdutosMaisVendidosHoje(
  limite = 5
): Promise<ProdutoMaisVendido[]> {
  const hoje = new Date();
  const vendas = await listarVendas();
  const vendasDeHoje = vendas.filter((pedido) => ehMesmoDia(pedido.createdAt, hoje));

  const porProduto = new Map<EntityId, ProdutoMaisVendido>();
  for (const pedido of vendasDeHoje) {
    for (const item of pedido.itens) {
      const atual = porProduto.get(item.produtoId) ?? {
        produtoId: item.produtoId,
        nome: item.produtoNome,
        quantidade: 0,
        totalVendido: 0,
      };
      atual.quantidade += item.quantidade;
      atual.totalVendido = arredondarMoeda(atual.totalVendido + item.subtotal);
      porProduto.set(item.produtoId, atual);
    }
  }

  return Array.from(porProduto.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite);
}

/** Os pedidos mais recentes, de qualquer status, para acompanhamento rápido. */
export async function obterUltimosPedidos(limite = 5): Promise<Pedido[]> {
  const todos = await pedidoRepository.getAll();
  return todos
    .slice()
    .sort((a, b) => b.numero - a.numero)
    .slice(0, limite);
}

export interface ResumoDia {
  data: string; // yyyy-mm-dd local
  label: string; // "Hoje" ou abreviação do dia da semana
  totalVendas: number;
  totalPedidos: number;
}

/** Vendas dos últimos 7 dias (incluindo hoje), do mais antigo para o mais recente. */
export async function obterResumoUltimos7Dias(): Promise<ResumoDia[]> {
  const vendas = await listarVendas();
  const hoje = new Date();
  const dias: ResumoDia[] = [];

  for (let i = 6; i >= 0; i--) {
    const data = new Date(hoje);
    data.setDate(data.getDate() - i);
    const vendasDoDia = vendas.filter((pedido) => ehMesmoDia(pedido.createdAt, data));

    dias.push({
      data: formatarDataLocal(data),
      label: i === 0 ? "Hoje" : data.toLocaleDateString("pt-BR", { weekday: "short" }),
      totalVendas: arredondarMoeda(
        vendasDoDia.reduce((soma, pedido) => soma + pedido.total, 0)
      ),
      totalPedidos: vendasDoDia.length,
    });
  }

  return dias;
}
