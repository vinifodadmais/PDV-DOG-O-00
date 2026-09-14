// Testa a formatação do recibo térmico (largura, acentos, quebras de
// linha, troco, desconto, pagamento misto) sem precisar de nenhuma
// impressora conectada — `montarReciboEscPos` é uma função pura.
//
// Uso: tsx scripts/test-impressora.mjs

let falhas = 0;
function assert(condicao, mensagem) {
  if (condicao) console.log(`  OK  ${mensagem}`);
  else {
    console.error(`FALHA  ${mensagem}`);
    falhas++;
  }
}

const { montarReciboEscPos, LARGURA_PADRAO_58MM } = await import("../src/utils/recibo58mm.ts");
const { ImpressoraEscPosBuilder } = await import("../src/utils/escpos.ts");

// Decodifica os bytes de volta para string (Latin-1) só para inspecionar
// o resultado nos testes — a impressora real nunca faz esse passo.
function bytesParaTexto(bytes) {
  return Array.from(bytes)
    .map((b) => String.fromCharCode(b))
    .join("");
}

/**
 * Remove os comandos ESC/POS (ESC ..., GS ...) dos bytes, deixando só o
 * texto que realmente aparece impresso no papel — necessário para medir
 * a largura "visível" de cada linha corretamente nos testes (os bytes
 * de comando não contam como caracteres impressos).
 */
function apenasTextoVisivel(bytes) {
  const resultado = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b === 0x1b) {
      // ESC @ (2 bytes) | ESC t n / ESC a n / ESC E n (3 bytes)
      const cmd = bytes[i + 1];
      i += cmd === 0x40 ? 2 : 3;
      continue;
    }
    if (b === 0x1d) {
      // GS ! n / GS V n (3 bytes)
      i += 3;
      continue;
    }
    resultado.push(b);
    i++;
  }
  return bytesParaTexto(resultado);
}

function pedidoBase(overrides = {}) {
  return {
    id: "pedido-teste",
    numero: 42,
    status: "recebido",
    tipoConsumo: "balcao",
    statusPagamento: "pago",
    opcaoConsumo: "levar",
    itens: [
      { id: "i1", produtoId: "p1", produtoNome: "Dog Especial", quantidade: 2, precoUnitario: 30, subtotal: 60 },
    ],
    pagamentos: [{ id: "pg1", forma: "pix", valor: 60, criadoEm: new Date().toISOString() }],
    subtotal: 60,
    desconto: 0,
    total: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

console.log("\n== 1. Estrutura básica do recibo (ESC/POS) ==");
const bytesBase = montarReciboEscPos(pedidoBase());
const textoBase = bytesParaTexto(bytesBase);
assert(bytesBase[0] === 0x1b && bytesBase[1] === 0x40, "recibo começa com o comando de inicialização (ESC @)");
assert(textoBase.includes("Pedido #42"), "número do pedido aparece no recibo");
assert(textoBase.includes("Dog Especial"), "nome do produto aparece no recibo");
assert(textoBase.includes("60,00"), "valor do item aparece no recibo");
assert(textoBase.includes("TOTAL"), "linha de TOTAL aparece no recibo");
assert(textoBase.includes("Pix"), "forma de pagamento aparece no recibo");

console.log("\n== 2. Largura das linhas (papel de 58mm = 32 colunas) ==");
const linhasBase = apenasTextoVisivel(bytesBase).split("\n").filter(Boolean);
const linhasLongas = linhasBase.filter((l) => l.length > LARGURA_PADRAO_58MM);
assert(
  linhasLongas.length === 0,
  `nenhuma linha ultrapassa ${LARGURA_PADRAO_58MM} caracteres (encontradas ${linhasLongas.length} longas)`
);

console.log("\n== 3. Acentos e caracteres em português ==");
assert(textoBase.includes("DOG\xC3O DA PRA\xC7A"), "cabeçalho 'DOGÃO DA PRAÇA' está presente com os bytes de acentuação corretos (Ã, Ç)");
const pedidoComAcentos = pedidoBase({
  itens: [
    { id: "i1", produtoId: "p1", produtoNome: "Pão de Queijo com Catupiry", quantidade: 1, precoUnitario: 10, subtotal: 10 },
  ],
  observacoes: "Sem cebola, é alérgico",
});
const textoAcentos = bytesParaTexto(montarReciboEscPos(pedidoComAcentos));
assert(textoAcentos.includes("P\xE3o de Queijo"), "'ã' de 'Pão' é codificado corretamente (0xE3)");
assert(textoAcentos.includes("\xE9 al\xE9rgico"), "'é' na observação é codificado corretamente (0xE9)");

console.log("\n== 4. Quebra de linha de nome de produto longo ==");
const pedidoNomeLongo = pedidoBase({
  itens: [
    {
      id: "i1",
      produtoId: "p1",
      produtoNome: "Combo Gigante com Batata Frita Grande e Refrigerante 2 Litros",
      quantidade: 1,
      precoUnitario: 55,
      subtotal: 55,
    },
  ],
});
const bytesNomeLongo = montarReciboEscPos(pedidoNomeLongo);
const linhasNomeLongo = apenasTextoVisivel(bytesNomeLongo).split("\n").filter(Boolean);
assert(
  linhasNomeLongo.every((l) => l.length <= LARGURA_PADRAO_58MM),
  "nome de produto muito longo é quebrado em várias linhas, nenhuma ultrapassa a largura"
);
assert(
  linhasNomeLongo.some((l) => l.includes("55,00")),
  "o valor do item aparece mesmo com nome longo (numa linha própria, se necessário)"
);

console.log("\n== 5. Desconto aparece quando houver ==");
const pedidoComDesconto = pedidoBase({ desconto: 10, total: 50 });
const textoDesconto = bytesParaTexto(montarReciboEscPos(pedidoComDesconto));
assert(textoDesconto.includes("Desconto"), "linha de desconto aparece quando desconto > 0");
assert(/-R\$\s*10,00/.test(textoDesconto), "valor do desconto (R$10,00) aparece corretamente");

const pedidoSemDesconto = pedidoBase({ desconto: 0 });
const textoSemDesconto = bytesParaTexto(montarReciboEscPos(pedidoSemDesconto));
assert(!textoSemDesconto.includes("Desconto"), "linha de desconto NÃO aparece quando desconto = 0");

console.log("\n== 6. Troco aparece quando pagamento em dinheiro tiver troco ==");
const pedidoComTroco = pedidoBase({
  pagamentos: [{ id: "pg1", forma: "dinheiro", valor: 100, troco: 40, criadoEm: new Date().toISOString() }],
});
const textoTroco = bytesParaTexto(montarReciboEscPos(pedidoComTroco));
assert(textoTroco.includes("Troco"), "linha de troco aparece quando há troco");
assert(textoTroco.includes("40,00"), "valor do troco aparece corretamente");

const pedidoSemTroco = pedidoBase({
  pagamentos: [{ id: "pg1", forma: "pix", valor: 60, criadoEm: new Date().toISOString() }],
});
const textoSemTroco = bytesParaTexto(montarReciboEscPos(pedidoSemTroco));
assert(!textoSemTroco.includes("Troco"), "linha de troco NÃO aparece em pagamento sem troco (ex: Pix)");

console.log("\n== 7. Pagamento misto: todas as formas aparecem ==");
const pedidoMisto = pedidoBase({
  pagamentos: [
    { id: "pg1", forma: "pix", valor: 30, criadoEm: new Date().toISOString() },
    { id: "pg2", forma: "dinheiro", valor: 30, troco: 0, criadoEm: new Date().toISOString() },
  ],
});
const textoMisto = bytesParaTexto(montarReciboEscPos(pedidoMisto));
assert(textoMisto.includes("Pix") && textoMisto.includes("Dinheiro"), "as duas formas de pagamento (Pix e Dinheiro) aparecem no recibo misto");

console.log("\n== 8. Corte de papel é opcional (configurável) ==");
const bytesSemCorte = montarReciboEscPos(pedidoBase(), { cortarPapel: false });
const bytesComCorte = montarReciboEscPos(pedidoBase(), { cortarPapel: true });
function contemComandoCorte(bytes) {
  for (let i = 0; i < bytes.length - 2; i++) {
    if (bytes[i] === 0x1d && bytes[i + 1] === 0x56) return true;
  }
  return false;
}
assert(!contemComandoCorte(bytesSemCorte), "SEM a opção de cortar papel, o comando de corte não é enviado");
assert(contemComandoCorte(bytesComCorte), "COM a opção de cortar papel, o comando de corte (GS V) é enviado");

console.log("\n== 9. Builder ESC/POS: comandos básicos ==");
const bytesBuilder = new ImpressoraEscPosBuilder()
  .inicializar()
  .alinhar("centro")
  .negrito(true)
  .texto("TESTE")
  .negrito(false)
  .toBytes();
assert(bytesBuilder[0] === 0x1b && bytesBuilder[1] === 0x40, "inicializar() gera ESC @");
assert(
  Array.from(bytesBuilder).join(",").includes("27,97,1"),
  "alinhar('centro') gera ESC a 1"
);
assert(bytesParaTexto(bytesBuilder).includes("TESTE"), "texto() inclui o conteúdo escrito");

console.log("\n== 10. Nunca envia espaço não-quebrável (0xA0) — normalizado para espaço comum ==");
const bytesComMoeda = montarReciboEscPos(pedidoBase({ desconto: 5, total: 55 }));
const contemByteA0 = Array.from(bytesComMoeda).includes(0xa0);
assert(
  !contemByteA0,
  "o byte 0xA0 (espaço não-quebrável, que o Intl insere em 'R$ X,XX') nunca aparece nos bytes finais — evita risco de imprimir caractere errado dependendo da página de código da impressora"
);

console.log("\n" + "=".repeat(50));
if (falhas > 0) {
  console.error(`${falhas} verificação(ões) falharam.`);
  process.exit(1);
} else {
  console.log("Todas as verificações de formatação do recibo passaram.");
  process.exit(0);
}
