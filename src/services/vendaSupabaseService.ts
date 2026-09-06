import { supabase } from "@/lib/supabase";
import type { EntityId, FormaPagamento, ItemPedido, Pagamento, Pedido, TipoConsumo } from "@/types";

/**
 * ============================================================================
 * Finalização de venda via RPC atômica (`public.finalize_sale`). A RPC é
 * a ÚNICA autoridade sobre preço, subtotal e total — este service nunca
 * envia esses valores como "verdade", só o que o operador realmente
 * escolheu (produto, quantidade, adicionais, pagamentos, desconto
 * solicitado). Os valores oficiais usados no recibo/confirmação vêm de
 * volta da própria RPC, não do que foi enviado.
 *
 * Fase 5: adicionais são enviados aninhados dentro de cada item — a RPC
 * valida/precifica/baixa estoque de cada adicional exatamente como faz
 * pro produto principal, e grava a linha dele em `sale_items` com
 * `parent_sale_item_id` apontando pra linha do item pai. Este service
 * reconstrói essa relação de volta em `ItemPedido.adicionais` a partir
 * do array plano que a RPC devolve.
 *
 * Estoque e caixa continuam integrados na mesma transação (Fases 3/4,
 * sem mudança de comportamento).
 * ============================================================================
 */

export interface AdicionalVendaSupabaseInput {
  produtoId: EntityId;
  quantidade: number;
}

export interface ItemVendaSupabaseInput {
  produtoId: EntityId;
  quantidade: number;
  observacao?: string;
  adicionais?: AdicionalVendaSupabaseInput[];
}

export interface PagamentoVendaSupabaseInput {
  forma: FormaPagamento;
  valor: number;
  troco?: number;
}

export interface FinalizarVendaSupabaseInput {
  clientRequestId: string;
  itens: ItemVendaSupabaseInput[];
  pagamentos: PagamentoVendaSupabaseInput[];
  tipoConsumo?: TipoConsumo;
  desconto?: number;
  observacoes?: string;
  /** Nome do cliente — opcional. */
  nomeCliente?: string;
  /** Taxa de entrega — só tem efeito de verdade quando tipoConsumo é "entrega" (a RPC também garante isso do lado do banco). */
  taxaEntrega?: number;
}

export class VendaNaoConfirmadaError extends Error {
  constructor(mensagemOriginal: string) {
    super(
      `A venda não foi confirmada pelo Supabase — nada foi registrado. Detalhe: ${mensagemOriginal}`
    );
    this.name = "VendaNaoConfirmadaError";
  }
}

function exigirSupabase() {
  if (!supabase) {
    throw new VendaNaoConfirmadaError("Supabase não está configurado (veja .env.example).");
  }
  return supabase;
}

/** Uma linha de `sale_items` como a RPC devolve — pai ou adicional (tanto faz, é o mesmo formato). */
interface LinhaItemResolvido {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number | string;
  quantity: number | string;
  note: string | null;
  subtotal: number | string;
  parent_sale_item_id: string | null;
}

interface RespostaFinalizeSale {
  sale_id: string;
  order_number: number;
  status: string;
  created_at: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  items: LinhaItemResolvido[];
  customer_name: string | null;
  delivery_fee: number | string;
}

/** Reconstrói a árvore (item pai + seus adicionais) a partir da lista PLANA que a RPC devolve. */
function reconstruirItensComAdicionais(linhas: LinhaItemResolvido[]): ItemPedido[] {
  const pais = linhas.filter((linha) => linha.parent_sale_item_id === null);
  return pais.map((pai) => {
    const adicionaisDoPai = linhas.filter((linha) => linha.parent_sale_item_id === pai.id);
    return {
      id: pai.id,
      produtoId: pai.product_id,
      produtoNome: pai.product_name,
      quantidade: Number(pai.quantity),
      precoUnitario: Number(pai.unit_price),
      subtotal: Number(pai.subtotal),
      observacao: pai.note ?? undefined,
      adicionais: adicionaisDoPai.map((adicional) => ({
        id: adicional.id,
        produtoId: adicional.product_id,
        produtoNome: adicional.product_name,
        quantidade: Number(adicional.quantity),
        precoUnitario: Number(adicional.unit_price),
        subtotal: Number(adicional.subtotal),
      })),
    };
  });
}

/**
 * Finaliza uma venda pela RPC `finalize_sale`. Só retorna com sucesso se
 * o Supabase confirmou de verdade — nunca finge sucesso local.
 */
export async function finalizarVendaSupabase(
  input: FinalizarVendaSupabaseInput
): Promise<Pedido> {
  const client = exigirSupabase();

  const payloadItens = input.itens.map((item) => ({
    product_id: item.produtoId,
    quantity: item.quantidade,
    note: item.observacao ?? null,
    adicionais: (item.adicionais ?? []).map((adicional) => ({
      product_id: adicional.produtoId,
      quantity: adicional.quantidade,
    })),
  }));

  const payloadPagamentos = input.pagamentos.map((pagamento) => ({
    payment_method: pagamento.forma,
    amount: pagamento.valor,
    change_amount: pagamento.troco ?? null,
  }));

  const { data, error } = await client.rpc("finalize_sale", {
    p_client_request_id: input.clientRequestId,
    p_consumption_type: input.tipoConsumo ?? "balcao",
    p_discount: input.desconto ?? 0,
    p_notes: input.observacoes ?? null,
    p_items: payloadItens,
    p_payments: payloadPagamentos,
    p_customer_name: input.nomeCliente?.trim() || null,
    p_delivery_fee: input.taxaEntrega ?? 0,
  });

  if (error) {
    throw new VendaNaoConfirmadaError(error.message);
  }

  const linha = (Array.isArray(data) ? data[0] : data) as RespostaFinalizeSale | undefined;
  if (!linha) {
    throw new VendaNaoConfirmadaError("Resposta vazia da RPC finalize_sale.");
  }

  const itens = reconstruirItensComAdicionais(linha.items);

  const pagamentos: Pagamento[] = input.pagamentos.map((pagamento, index) => ({
    id: `${linha.sale_id}-pagamento-${index}`,
    forma: pagamento.forma,
    valor: pagamento.valor,
    troco: pagamento.troco,
    criadoEm: linha.created_at,
  }));

  return {
    id: linha.sale_id,
    numero: linha.order_number,
    status: linha.status as Pedido["status"],
    tipoConsumo: input.tipoConsumo ?? "balcao",
    itens,
    pagamentos,
    subtotal: Number(linha.subtotal),
    desconto: Number(linha.discount),
    taxaEntrega: Number(linha.delivery_fee),
    total: Number(linha.total),
    nomeCliente: linha.customer_name ?? undefined,
    observacoes: input.observacoes,
    createdAt: linha.created_at,
    updatedAt: linha.created_at,
  };
}
