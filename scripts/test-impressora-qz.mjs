// Testa o fluxo de impressão via QZ Tray (services/impressoraService.ts
// + lib/qzTray.ts), usando o stub controlável de node_modules/qz-tray
// (não é o QZ Tray real — isso só você pode confirmar com o hardware).
//
// Uso: tsx scripts/test-impressora-qz.mjs

import { LocalStoragePolyfill } from "./localStoragePolyfill.mjs";

globalThis.window = { localStorage: new LocalStoragePolyfill() };

let falhas = 0;
function assert(condicao, mensagem) {
  if (condicao) console.log(`  OK  ${mensagem}`);
  else {
    console.error(`FALHA  ${mensagem}`);
    falhas++;
  }
}

const { __testHooks } = await import("qz-tray");
const { storage } = await import("../src/storage/index.ts");
const {
  obterStatusImpressora,
  conectarQzTray,
  definirImpressoraSelecionada,
  listarImpressorasDisponiveis,
  imprimirPedido,
  imprimirTeste,
  definirCortarPapel,
  obterPreferenciasImpressora,
} = await import("../src/services/impressoraService.ts");

function pedidoTeste() {
  return {
    id: "pedido-teste-qz",
    numero: 42,
    status: "recebido",
    tipoConsumo: "balcao",
    statusPagamento: "pago",
    opcaoConsumo: "levar",
    itens: [
      { id: "i1", produtoId: "p1", produtoNome: "Dog Especial", quantidade: 1, precoUnitario: 30, subtotal: 30 },
    ],
    pagamentos: [{ id: "pg1", forma: "pix", valor: 30, criadoEm: new Date().toISOString() }],
    subtotal: 30,
    desconto: 0,
    total: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

console.log("\n== 1. Sem impressora selecionada: erro claro, não tenta conectar/imprimir ==");
__testHooks.reset();
let erro1 = null;
try {
  await imprimirPedido(pedidoTeste());
} catch (error) {
  erro1 = error;
}
assert(erro1 !== null, "imprimirPedido() lança erro quando nenhuma impressora foi selecionada");
assert(erro1.message.includes("Nenhuma impressora selecionada"), `mensagem clara e específica (encontrada: "${erro1.message}")`);
assert(__testHooks.obterChamadasDeImpressao().length === 0, "nenhuma chamada de impressão foi feita ao QZ Tray");

console.log("\n== 2. QZ Tray fechado/indisponível: erro claro ==");
__testHooks.reset();
__testHooks.definirFalharConexao(true);
let erro2 = null;
try {
  await conectarQzTray();
} catch (error) {
  erro2 = error;
}
assert(erro2 !== null, "conectarQzTray() lança erro quando o QZ Tray não está rodando");
assert(erro2.message.includes("QZ Tray"), `mensagem menciona o QZ Tray (encontrada: "${erro2.message}")`);

console.log("\n== 3. Listar impressoras disponíveis ==");
__testHooks.reset();
__testHooks.definirImpressoras(["POS-58", "Microsoft Print to PDF"]);
const impressoras = await listarImpressorasDisponiveis();
assert(impressoras.includes("POS-58"), `lista de impressoras inclui a POS-58 (encontrado: ${JSON.stringify(impressoras)})`);
assert(impressoras.length === 2, "lista de impressoras tem o tamanho correto");

console.log("\n== 4. Selecionar impressora persiste corretamente ==");
await definirImpressoraSelecionada("POS-58");
const statusAposSelecionar = await obterStatusImpressora();
assert(statusAposSelecionar.impressoraSelecionada === "POS-58", "impressora selecionada é persistida e lida de volta corretamente");

console.log("\n== 5. Impressão de teste bem-sucedida envia RAW/base64, não HTML ==");
__testHooks.reset();
__testHooks.definirImpressoras(["POS-58"]);
await definirImpressoraSelecionada("POS-58");
await imprimirTeste();
const chamadas = __testHooks.obterChamadasDeImpressao();
assert(chamadas.length === 1, "exatamente 1 chamada de impressão foi feita");
const dadoEnviado = chamadas[0].data[0];
assert(dadoEnviado.type === "raw", "tipo de impressão é 'raw' (não HTML/página comum)");
assert(dadoEnviado.format === "base64", "formato é 'base64' (bytes binários ESC/POS, sem risco de corromper caracteres)");
const bytesDecodificados = Buffer.from(dadoEnviado.data, "base64");
assert(bytesDecodificados[0] === 0x1b && bytesDecodificados[1] === 0x40, "bytes decodificados começam com o comando ESC/POS de inicialização (ESC @)");
assert(bytesDecodificados.includes(Buffer.from("Item de teste")), "conteúdo do recibo de teste está presente nos bytes enviados");

console.log("\n== 6. Impressão de pedido real: venda continua íntegra mesmo se a impressão falhar ==");
__testHooks.reset();
__testHooks.definirImpressoras(["POS-58"]);
await definirImpressoraSelecionada("POS-58");
__testHooks.definirFalharImpressao(true);
const pedido = pedidoTeste();
let erroImpressao = null;
try {
  await imprimirPedido(pedido);
} catch (error) {
  erroImpressao = error;
}
assert(erroImpressao !== null, "erro de impressão é lançado claramente (não engolido silenciosamente)");
assert(pedido.id === "pedido-teste-qz" && pedido.total === 30, "o objeto do pedido não foi alterado/corrompido pela falha de impressão (a venda em si não é afetada)");

console.log("\n== 7. Depois de resolver a falha, reimpressão funciona normalmente ==");
__testHooks.definirFalharImpressao(false);
let erroReimpressao = null;
try {
  await imprimirPedido(pedido);
} catch (error) {
  erroReimpressao = error;
}
assert(erroReimpressao === null, "reimpressão funciona normalmente depois que a impressora volta");
assert(__testHooks.obterChamadasDeImpressao().length === 1, "a chamada de reimpressão foi enviada ao QZ Tray");

console.log("\n== 8. Preferências (cortar papel) continuam funcionando ==");
await definirCortarPapel(true);
const prefs = await obterPreferenciasImpressora();
assert(prefs.cortarPapel === true, "preferência de cortar papel persiste corretamente");
assert(prefs.impressoraSelecionada === "POS-58", "preferências incluem a impressora selecionada");

console.log("\n" + "=".repeat(50));
if (falhas > 0) {
  console.error(`${falhas} verificação(ões) falharam.`);
  process.exit(1);
} else {
  console.log("Todas as verificações do fluxo QZ Tray passaram.");
  process.exit(0);
}
