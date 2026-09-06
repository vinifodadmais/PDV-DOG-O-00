import { ImpressoraEscPosBuilder } from "./escpos";
import { formatarMoeda } from "./currency";
import type { FormaPagamento, Pedido, TipoConsumo } from "@/types";

/**
 * Largura padrão, em caracteres, para o papel de 58mm com a fonte
 * normal (Font A). 32 é o valor de referência usado por praticamente
 * toda impressora térmica ESC/POS de 58mm — mas o valor exato depende
 * da fonte/densidade configurada no firmware da impressora. Se, no
 * teste real com a Goldensky SMX-JP58H, as linhas saírem cortando ou
 * sobrando espaço, ajuste este número.
 */
export const LARGURA_PADRAO_58MM = 32;

export interface OpcoesRecibo {
  /** Caracteres por linha. Padrão: 32 (ver `LARGURA_PADRAO_58MM`). */
  largura?: number;
  /** Envia o comando de corte de papel ao final. Padrão: false (nem toda 58mm tem guilhotina). */
  cortarPapel?: boolean;
  /** Página de código ESC/POS (acentuação). Ver `ImpressoraEscPosBuilder.selecionarPaginaDeCodigo`. */
  paginaDeCodigo?: number;
}

const ROTULOS_FORMA: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  outro: "Outro",
};

/** Rótulo em maiúsculas pro cabeçalho do recibo — "Pedido: RETIRADA"/"ENTREGA". */
const ROTULOS_PEDIDO_RECIBO: Record<TipoConsumo, string> = {
  balcao: "RETIRADA",
  viagem: "VIAGEM",
  entrega: "ENTREGA",
};

function quebrarTexto(texto: string, largura: number): string[] {
  const palavras = texto.split(" ").filter(Boolean);
  const linhas: string[] = [];
  let atual = "";

  for (const palavra of palavras) {
    const candidato = atual ? `${atual} ${palavra}` : palavra;
    if (candidato.length > largura) {
      if (atual) linhas.push(atual);
      if (palavra.length > largura) {
        let resto = palavra;
        while (resto.length > largura) {
          linhas.push(resto.slice(0, largura));
          resto = resto.slice(largura);
        }
        atual = resto;
      } else {
        atual = palavra;
      }
    } else {
      atual = candidato;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length > 0 ? linhas : [""];
}

/**
 * Monta uma (ou mais, se não couber) linha(s) com um rótulo à esquerda
 * e um valor alinhado à direita — o padrão clássico de cupom fiscal
 * ("Subtotal .......... R$ 10,00").
 */
function linhaComValor(esquerda: string, direita: string, largura: number): string[] {
  if (esquerda.length + 1 + direita.length <= largura) {
    const espacos = largura - esquerda.length - direita.length;
    return [esquerda + " ".repeat(espacos) + direita];
  }

  const linhasEsquerda = quebrarTexto(esquerda, largura);
  const ultimaLinha = linhasEsquerda[linhasEsquerda.length - 1];
  const espacoRestante = largura - direita.length;

  if (ultimaLinha.length <= espacoRestante) {
    linhasEsquerda[linhasEsquerda.length - 1] =
      ultimaLinha + " ".repeat(espacoRestante - ultimaLinha.length) + direita;
  } else {
    linhasEsquerda.push(" ".repeat(Math.max(espacoRestante, 0)) + direita);
  }
  return linhasEsquerda;
}

function linhaSeparadora(largura: number, caractere = "-"): string {
  return caractere.repeat(largura);
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Monta os bytes ESC/POS do comprovante de um pedido — função pura, sem
 * nenhum acesso a hardware/USB, então é totalmente testável sem a
 * impressora física conectada.
 */
export function montarReciboEscPos(pedido: Pedido, opcoes: OpcoesRecibo = {}): Uint8Array {
  const largura = opcoes.largura ?? LARGURA_PADRAO_58MM;
  const builder = new ImpressoraEscPosBuilder();

  builder.inicializar();
  builder.selecionarPaginaDeCodigo(opcoes.paginaDeCodigo);

  builder.alinhar("centro");
  builder.negrito(true);
  builder.texto("DOGÃO DA PRAÇA");
  builder.negrito(false);
  builder.texto("Comprovante de pedido");
  builder.texto(linhaSeparadora(largura, "="));

  builder.alinhar("esquerda");
  builder.texto(`Pedido #${pedido.numero}`);
  builder.texto(formatarDataHora(pedido.createdAt));
  if (pedido.nomeCliente) {
    for (const linha of quebrarTexto(`Cliente: ${pedido.nomeCliente}`, largura)) builder.texto(linha);
  }
  builder.texto(`Pedido: ${ROTULOS_PEDIDO_RECIBO[pedido.tipoConsumo] ?? pedido.tipoConsumo}`);
  if (pedido.tipoConsumo === "entrega" && pedido.taxaEntrega > 0) {
    for (const linha of linhaComValor("Taxa de entrega", formatarMoeda(pedido.taxaEntrega), largura)) {
      builder.texto(linha);
    }
  }
  builder.texto(linhaSeparadora(largura));

  for (const item of pedido.itens) {
    const esquerda = `${item.quantidade}x ${item.produtoNome}`;
    const direita = formatarMoeda(item.subtotal);
    for (const linha of linhaComValor(esquerda, direita, largura)) builder.texto(linha);

    // Adicionais vinculados a este item — impressos logo abaixo, indentados,
    // nunca como uma linha de venda independente.
    const adicionais = item.adicionais ?? [];
    for (const adicional of adicionais) {
      const linhaAdicional = linhaComValor(
        `  + ${adicional.produtoNome}`,
        formatarMoeda(adicional.subtotal),
        largura
      );
      for (const linha of linhaAdicional) builder.texto(linha);
    }

    if (item.observacao) {
      for (const linha of quebrarTexto(`  Obs: ${item.observacao}`, largura)) builder.texto(linha);
    }

    if (adicionais.length > 0) {
      const totalItem = item.subtotal + adicionais.reduce((soma, a) => soma + a.subtotal, 0);
      for (const linha of linhaComValor("  Total do item", formatarMoeda(totalItem), largura)) {
        builder.texto(linha);
      }
    }
  }

  builder.texto(linhaSeparadora(largura));
  for (const linha of linhaComValor("Subtotal", formatarMoeda(pedido.subtotal), largura)) {
    builder.texto(linha);
  }
  if (pedido.desconto > 0) {
    for (const linha of linhaComValor("Desconto", `-${formatarMoeda(pedido.desconto)}`, largura)) {
      builder.texto(linha);
    }
  }
  if (pedido.tipoConsumo === "entrega" && pedido.taxaEntrega > 0) {
    for (const linha of linhaComValor("Entrega", formatarMoeda(pedido.taxaEntrega), largura)) {
      builder.texto(linha);
    }
  }

  builder.negrito(true);
  for (const linha of linhaComValor("TOTAL", formatarMoeda(pedido.total), largura)) {
    builder.texto(linha);
  }
  builder.negrito(false);

  builder.texto(linhaSeparadora(largura));
  builder.texto("Forma de pagamento:");
  let trocoTotal = 0;
  if (pedido.pagamentos.length === 0) {
    builder.texto("(nao registrado)");
  }
  for (const pagamento of pedido.pagamentos) {
    const rotulo = ROTULOS_FORMA[pagamento.forma] ?? pagamento.forma;
    for (const linha of linhaComValor(rotulo, formatarMoeda(pagamento.valor), largura)) {
      builder.texto(linha);
    }
    if (pagamento.troco) trocoTotal += pagamento.troco;
  }
  if (trocoTotal > 0) {
    for (const linha of linhaComValor("Troco", formatarMoeda(trocoTotal), largura)) {
      builder.texto(linha);
    }
  }

  if (pedido.observacoes) {
    builder.texto(linhaSeparadora(largura));
    for (const linha of quebrarTexto(`Obs: ${pedido.observacoes}`, largura)) builder.texto(linha);
  }

  builder.texto(linhaSeparadora(largura, "="));
  builder.alinhar("centro");
  builder.texto("Obrigado pela preferência!");
  builder.avancarLinhas(3);

  if (opcoes.cortarPapel) {
    builder.cortarPapel();
  } else {
    builder.avancarLinhas(1);
  }

  return builder.toBytes();
}
