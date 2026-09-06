// Script de verificação da camada de dados (storage + services), alinhado
// ao catálogo REAL do Dogão da Praça (sem produtos/pedidos fictícios de
// teste). Roda em Node com um polyfill de localStorage.
//
// Uso: tsx scripts/test-persistence.mjs

import { LocalStoragePolyfill } from "./localStoragePolyfill.mjs";

let falhas = 0;
function assert(condicao, mensagem) {
  if (condicao) console.log(`  OK  ${mensagem}`);
  else {
    console.error(`FALHA  ${mensagem}`);
    falhas++;
  }
}

const localStorageReal = new LocalStoragePolyfill();
globalThis.window = { localStorage: localStorageReal };

const { ensureSeeded, storage, CONFIG_KEYS, obterNumeroSequencialAtual } = await import(
  "../src/storage/index.ts"
);
const { arredondarMoeda } = await import("../src/utils/currency.ts");
const {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  listarProdutos,
  criarProduto,
  atualizarProduto,
  excluirProduto,
  buscarProduto,
  listarProdutosComEstoqueBaixo,
  finalizarVenda,
  atualizarStatusPedido,
  PagamentoInsuficienteError,
  cancelarPedido,
  PedidoJaCanceladoError,
  listarPedidos,
  obterSessaoCaixaAberta,
  abrirCaixa,
  CaixaFechadoError,
  registrarSangria,
  registrarDespesa,
  obterResumoSessao,
  listarMovimentacoesPorSessao,
  fecharCaixa,
  registrarMovimentacaoEstoque,
  listarMovimentacoesPorProduto,
  EstoqueInsuficienteError,
  obterResumoDados,
  obterResumoVendasHoje,
  obterUltimosPedidos,
  gerarBackup,
  validarBackup,
  validarBackupDeTexto,
  restaurarBackup,
  BACKUP_FORMATO,
  BACKUP_VERSAO_ATUAL,
  limparTodosOsDados,
} = await import("../src/services/index.ts");

console.log("\n== 1. Seed inicial: catálogo real, sem itens de teste ==");
await ensureSeeded();
const categorias = await listarCategorias();
const produtos = await listarProdutos();
assert(categorias.length === 6, `6 categorias no catálogo real (encontrado: ${categorias.length})`);
assert(produtos.length === 55, `55 produtos no catálogo real (encontrado: ${produtos.length})`);

const nomesCategorias = categorias.map((c) => c.nome).join(" | ");
for (const esperado of ["Hot Dogs", "Lanches Prensados", "Salgados", "Bebidas", "Adicionais", "Doces"]) {
  assert(nomesCategorias.includes(esperado), `categoria "${esperado}" presente`);
}
for (const removido of ["Cachorros-quentes", "Porções"]) {
  assert(!nomesCategorias.includes(removido), `categoria de teste "${removido}" foi removida`);
}

const nomesProdutos = produtos.map((p) => p.nome);
assert(!nomesProdutos.includes("Dogão Simples"), "produto de teste 'Dogão Simples' foi removido");
assert(!nomesProdutos.includes("Dogão Completo"), "produto de teste 'Dogão Completo' foi removido");
assert(!nomesProdutos.includes("Batata Frita Porção"), "produto de teste 'Batata Frita Porção' foi removido");
assert(
  produtos.filter((p) => p.nome.startsWith("Água")).length === 1,
  "só existe 1 produto de água (a mineral), sem duplicata"
);
assert(
  produtos.find((p) => p.nome.includes("Água")).nome === "Água Mineral 500ml" &&
    produtos.find((p) => p.nome.includes("Água")).preco === 4,
  "a água que sobrou é a Mineral 500ml a R$4,00"
);

const bacon = produtos.find((p) => p.id === "produto-adicional-bacon");
assert(bacon && bacon.preco === 5, `adicional "Bacon" com preço correto (R$5,00) — encontrado: ${bacon?.preco}`);
const coxinha = produtos.find((p) => p.id === "produto-coxinha");
assert(coxinha && coxinha.preco === 1, `salgado "Coxinha" com preço correto (R$1,00) — encontrado: ${coxinha?.preco}`);
const esfihaGrande = produtos.find((p) => p.id === "produto-esfiha-grande");
assert(
  esfihaGrande && esfihaGrande.preco === 7,
  `salgado "Esfiha ... Grande" com preço correto (R$7,00) — encontrado: ${esfihaGrande?.preco}`
);

const resumoInicial = await obterResumoDados();
assert(resumoInicial.pedidos === 0, "nenhum pedido de teste — sistema começa zerado");
assert(resumoInicial.sessoesCaixa === 0, "nenhuma sessão de caixa de teste");
assert(resumoInicial.movimentacoesCaixa === 0, "nenhuma movimentação de caixa de teste");
assert(
  resumoInicial.movimentacoesEstoque === 55,
  `1 movimentação de estoque inicial por produto (55) — encontrado: ${resumoInicial.movimentacoesEstoque}`
);

console.log("\n== 2. ensureSeeded() de novo não duplica dados ==");
await ensureSeeded();
assert((await listarCategorias()).length === 6, "chamar ensureSeeded() de novo não duplica categorias");

console.log("\n== 3. CRUD de Categoria e Produto (com validações) ==");
const categoriaTeste = await criarCategoria({ nome: "Categoria Teste", cor: "#123456" });
await atualizarCategoria(categoriaTeste.id, { nome: "Categoria Teste 2" });
await excluirCategoria(categoriaTeste.id);
assert(!(await listarCategorias()).some((c) => c.id === categoriaTeste.id), "CRUD de categoria funciona normalmente");

let nomeVazioRejeitado = false;
try {
  await criarCategoria({ nome: "   ", cor: "#000" });
} catch {
  nomeVazioRejeitado = true;
}
assert(nomeVazioRejeitado, "categoria com nome vazio é rejeitada");

const produtoTeste = await criarProduto({ categoriaId: "categoria-bebidas", nome: "Produto Teste", preco: 9.9 });
await atualizarProduto(produtoTeste.id, { preco: 12.5 });
assert((await buscarProduto(produtoTeste.id)).preco === 12.5, "CRUD de produto funciona normalmente");

let estoqueNegativoRejeitado = false;
try {
  await atualizarProduto(produtoTeste.id, { estoqueAtual: -1 });
} catch {
  estoqueNegativoRejeitado = true;
}
assert(estoqueNegativoRejeitado, "produto com estoque negativo é rejeitado");
await excluirProduto(produtoTeste.id);

console.log("\n== 4. Estoque: entrada real + venda com baixa automática ==");
const dogEspecialAntes = await buscarProduto("produto-dog-especial");
assert(dogEspecialAntes.estoqueAtual === 0, "produto novo nasce com estoque 0 (não inventado)");

await registrarMovimentacaoEstoque({
  produtoId: "produto-dog-especial",
  tipo: "entrada",
  quantidade: 20,
  motivo: "compra",
  observacao: "Primeira compra de estoque real",
});
const dogEspecialDepois = await buscarProduto("produto-dog-especial");
assert(dogEspecialDepois.estoqueAtual === 20, `entrada de estoque real funciona (0 -> 20, encontrado: ${dogEspecialDepois.estoqueAtual})`);

console.log("\n== 5. Caixa: abrir, exigência para vender, sangria, despesa ==");
assert((await obterSessaoCaixaAberta()) === null, "nenhum caixa aberto no início");

let vendaSemCaixaRejeitada = false;
try {
  await finalizarVenda({
    itens: [{ produtoId: "produto-dog-especial", produtoNome: "Dog Especial", quantidade: 1, precoUnitario: 30 }],
    pagamentos: [{ forma: "pix", valor: 30 }],
  });
} catch (error) {
  vendaSemCaixaRejeitada = error instanceof CaixaFechadoError;
}
assert(vendaSemCaixaRejeitada, "venda é bloqueada sem caixa aberto");

const sessao = await abrirCaixa({ valorAbertura: 100, operador: "Teste" });
let duasSessoesBloqueadas = false;
try {
  await abrirCaixa({ valorAbertura: 50 });
} catch {
  duasSessoesBloqueadas = true;
}
assert(duasSessoesBloqueadas, "não permite duas sessões de caixa abertas ao mesmo tempo");

console.log("\n== 6. Vendas: dinheiro, Pix, débito, crédito, misto ==");
const vendaDinheiro = await finalizarVenda({
  itens: [{ produtoId: "produto-dog-especial", produtoNome: "Dog Especial", quantidade: 1, precoUnitario: 30 }],
  pagamentos: [{ forma: "dinheiro", valor: 50, troco: 20 }],
});
assert(vendaDinheiro.status === "recebido", "venda em dinheiro registrada com status 'recebido'");
assert(vendaDinheiro.pagamentos[0].troco === 20, "troco calculado e salvo corretamente");

await registrarMovimentacaoEstoque({ produtoId: "produto-coxinha", tipo: "entrada", quantidade: 50, motivo: "compra" });
const vendaPix = await finalizarVenda({
  itens: [{ produtoId: "produto-coxinha", produtoNome: "Coxinha", quantidade: 3, precoUnitario: 1 }],
  pagamentos: [{ forma: "pix", valor: 3 }],
});
assert(vendaPix.total === 3, "venda via Pix com total correto (3x R$1,00)");

await registrarMovimentacaoEstoque({ produtoId: "produto-adicional-bacon", tipo: "entrada", quantidade: 30, motivo: "compra" });
const vendaCredito = await finalizarVenda({
  itens: [{ produtoId: "produto-adicional-bacon", produtoNome: "Bacon", quantidade: 2, precoUnitario: 5 }],
  pagamentos: [{ forma: "credito", valor: 10 }],
});
assert(vendaCredito.pagamentos[0].forma === "credito", "venda no crédito registrada corretamente");

let excecaoPagamentoInsuficiente = false;
try {
  await finalizarVenda({
    itens: [{ produtoId: "produto-coxinha", produtoNome: "Coxinha", quantidade: 5, precoUnitario: 1 }],
    pagamentos: [{ forma: "debito", valor: 3 }],
  });
} catch (error) {
  excecaoPagamentoInsuficiente = error instanceof PagamentoInsuficienteError;
}
assert(excecaoPagamentoInsuficiente, "pagamento insuficiente é rejeitado");

const vendaMista = await finalizarVenda({
  itens: [{ produtoId: "produto-dog-especial", produtoNome: "Dog Especial", quantidade: 1, precoUnitario: 30 }],
  pagamentos: [
    { forma: "pix", valor: 20 },
    { forma: "dinheiro", valor: 10, troco: 0 },
  ],
});
assert(
  vendaMista.pagamentos.length === 2 && vendaMista.total === 30,
  "pagamento misto (Pix + Dinheiro) soma corretamente o total"
);

console.log("\n== 7. Estoque insuficiente bloqueia a venda (sem estoque negativo) ==");
let vendaSemEstoqueRejeitada = false;
try {
  await finalizarVenda({
    itens: [{ produtoId: "produto-dog-especial", produtoNome: "Dog Especial", quantidade: 9999, precoUnitario: 30 }],
    pagamentos: [{ forma: "pix", valor: 999999 }],
  });
} catch (error) {
  vendaSemEstoqueRejeitada = error instanceof EstoqueInsuficienteError;
}
assert(vendaSemEstoqueRejeitada, "venda maior que o estoque disponível é rejeitada");

console.log("\n== 8. Cancelamento: devolve estoque e estorna caixa ==");
const dogEspecialAntesCancelar = await buscarProduto("produto-dog-especial");
const resumoCaixaAntesCancelar = await obterResumoSessao(sessao.id);

await cancelarPedido(vendaDinheiro.id, "Teste de cancelamento");
const dogEspecialAposCancelar = await buscarProduto("produto-dog-especial");
assert(
  dogEspecialAposCancelar.estoqueAtual === dogEspecialAntesCancelar.estoqueAtual + 1,
  "cancelamento devolve o estoque do item cancelado"
);

const resumoCaixaAposCancelar = await obterResumoSessao(sessao.id);
assert(
  resumoCaixaAposCancelar.vendasDinheiro < resumoCaixaAntesCancelar.vendasDinheiro,
  "cancelamento estorna o valor no resumo do caixa"
);

let cancelarDuasVezesRejeitado = false;
try {
  await cancelarPedido(vendaDinheiro.id);
} catch (error) {
  cancelarDuasVezesRejeitado = error instanceof PedidoJaCanceladoError;
}
assert(cancelarDuasVezesRejeitado, "cancelar o mesmo pedido duas vezes é rejeitado");

console.log("\n== 9. Status do pedido (fluxo de cozinha) ==");
await atualizarStatusPedido(vendaPix.id, "em_preparo");
await atualizarStatusPedido(vendaPix.id, "pronto");
const pixFinal = await atualizarStatusPedido(vendaPix.id, "finalizado");
assert(pixFinal.status === "finalizado", "status do pedido avança corretamente pelo fluxo de cozinha");

console.log("\n== 10. Estoque mínimo (alerta) ==");
await registrarMovimentacaoEstoque({
  produtoId: "produto-esfiha-grande",
  tipo: "entrada",
  quantidade: 5,
  motivo: "compra",
});
await atualizarProduto("produto-esfiha-grande", { estoqueMinimo: 5 });
const emEstoqueBaixo = await listarProdutosComEstoqueBaixo();
assert(
  emEstoqueBaixo.some((p) => p.id === "produto-esfiha-grande"),
  "produto no limite do estoque mínimo aparece no alerta"
);

console.log("\n== 11. Sangria, despesa e fechamento de caixa ==");
const resumoAntesAjustes = await obterResumoSessao(sessao.id);
await registrarSangria({ sessaoCaixaId: sessao.id, valor: 15, motivo: "Sangria de teste" });
await registrarDespesa({ sessaoCaixaId: sessao.id, valor: 8, motivo: "Despesa de teste" });
const resumoAposAjustes = await obterResumoSessao(sessao.id);
assert(
  resumoAposAjustes.valorEsperado === arredondarMoeda(resumoAntesAjustes.valorEsperado - 15 - 8),
  "sangria e despesa reduzem o valor esperado do caixa corretamente"
);

const sessaoFechada = await fecharCaixa(sessao.id, resumoAposAjustes.valorEsperado);
assert(sessaoFechada.status === "fechada", "caixa fecha corretamente");
assert(
  sessaoFechada.valorFechamentoCalculado === resumoAposAjustes.valorEsperado,
  "valor calculado no fechamento bate com o resumo"
);
assert((await obterSessaoCaixaAberta()) === null, "nenhum caixa aberto após fechar");

let vendaAposFecharRejeitada = false;
try {
  await finalizarVenda({
    itens: [{ produtoId: "produto-coxinha", produtoNome: "Coxinha", quantidade: 1, precoUnitario: 1 }],
    pagamentos: [{ forma: "pix", valor: 1 }],
  });
} catch (error) {
  vendaAposFecharRejeitada = error instanceof CaixaFechadoError;
}
assert(vendaAposFecharRejeitada, "vendas ficam bloqueadas depois do caixa fechado, até abrir outro");

console.log("\n== 12. Dashboard: dados reais e estado vazio ==");
const resumoHoje = await obterResumoVendasHoje();
assert(resumoHoje.totalPedidos >= 3, `dashboard reflete os pedidos pagos de hoje (encontrado: ${resumoHoje.totalPedidos})`);
const ultimos = await obterUltimosPedidos(5);
assert(ultimos.length > 0 && ultimos[0].numero >= ultimos[ultimos.length - 1].numero, "últimos pedidos ordenados corretamente");

console.log("\n== 13. Backup: gerar, validar e restaurar ==");
const backup = await gerarBackup();
assert(backup.formato === BACKUP_FORMATO && backup.versao === BACKUP_VERSAO_ATUAL, "backup gerado com formato/versão corretos");
assert(backup.dados.produtos.length === 55, "backup contém os 55 produtos do catálogo real");

const validacaoOk = validarBackupDeTexto(JSON.stringify(backup));
assert(validacaoOk.valido, "backup gerado pelo próprio sistema é validado como correto");

const validacaoRuim = validarBackup({ formato: "outra-coisa" });
assert(!validacaoRuim.valido, "backup com formato incorreto é rejeitado");

console.log("\n== 14. Simulação de reload (localStorage novo) ==");
const dadosSalvos = localStorageReal.dump();
globalThis.window.localStorage = new LocalStoragePolyfill(dadosSalvos);
const produtosAposReload = await listarProdutos();
assert(produtosAposReload.length === 55, `produtos sobrevivem ao reload — encontrado: ${produtosAposReload.length}`);
const pedidosAposReload = await listarPedidos();
assert(pedidosAposReload.length === 4, `pedidos sobrevivem ao reload — encontrado: ${pedidosAposReload.length}`);

console.log("\n== 15. Restaurar backup (substitui tudo) ==");
await restaurarBackup(backup);
const resumoAposRestaurar = await obterResumoDados();
assert(resumoAposRestaurar.produtos === 55, "restaurar o backup volta para os 55 produtos do momento do backup");

console.log("\n== 16. Limpar todos os dados ==");
await limparTodosOsDados();
const resumoAposLimpar = await obterResumoDados();
const totalAposLimpar = Object.values(resumoAposLimpar).reduce((a, b) => a + b, 0);
assert(totalAposLimpar === 0, "limparTodosOsDados() zera tudo");

console.log("\n" + "=".repeat(50));
if (falhas > 0) {
  console.error(`${falhas} verificação(ões) falharam.`);
  process.exit(1);
} else {
  console.log("Todas as verificações passaram. Catálogo real + persistência confirmados.");
  process.exit(0);
}
