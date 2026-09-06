# Dogão da Praça — PDV (fundação do frontend)

Base do sistema de vendas (PDV) para uso particular da lanchonete
**Dogão da Praça**. Esta etapa contém **apenas a fundação**: estrutura de
pastas, layout e navegação. Nenhuma funcionalidade de vendas, estoque ou
caixa foi implementada ainda — cada página mostra um placeholder "Em
construção".

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Sem backend, sem autenticação, sem bibliotecas de UI/roteamento externas

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse o endereço mostrado no terminal (padrão: http://localhost:5173).

Na primeira execução, a aplicação semeia automaticamente dados de
demonstração (categorias, produtos, pedidos, uma sessão de caixa e
movimentações de estoque) — veja `src/storage/seed.ts`. A tela **Início**
mostra a contagem de cada coleção lida direto do storage; recarregar a
página (F5) e ver os mesmos números confirma que a persistência está
funcionando.

Para checar erros de tipo sem rodar o build completo:

```bash
npm run lint
```

Para rodar o teste automatizado da camada de dados (seed, CRUD via
services, e persistência através de um "reload" simulado):

```bash
npm run test:persistence
```

Para gerar a build de produção:

```bash
npm run build
npm run preview
```

## Estrutura de pastas

```
src/
  components/
    layout/     -> Sidebar, Header, MainLayout (casca visual da aplicação)
    ui/         -> Peças reutilizáveis (Icon, Logo, StatCard, PagePlaceholder...)
  pages/        -> Uma página por rota do sistema
  hooks/        -> Hooks de dados (useLocalStorage, useResumoDados)
  services/     -> Regras de negócio: categoriaService, produtoService,
                   pedidoService, caixaService, estoqueService, sistemaService
  storage/      -> Camada de persistência (ver seção abaixo)
  types/        -> Tipos de domínio: Categoria, Produto, Pedido, ItemPedido,
                   Pagamento, SessaoCaixa, MovimentacaoCaixa, MovimentacaoEstoque
  utils/        -> Funções utilitárias pequenas (cn, generateId, nowIso)
scripts/
  test-persistence.mjs   -> Teste automatizado da camada de dados (Node)
  localStoragePolyfill.mjs -> Polyfill mínimo usado só pelo teste acima
```

## Camada de dados (storage/ + services/)

Nenhum componente ou página fala com `window.localStorage` diretamente.
O fluxo é sempre:

```
página/hook  →  service (regra de negócio)  →  repository  →  StorageAdapter
```

- **`StorageAdapter`** (`storage/StorageAdapter.ts`): contrato genérico de
  chave/valor (`get`, `set`, `remove`, `keys`, `clear`). Hoje implementado
  por `LocalStorageAdapter`.
- **`Repository<T>`** (`storage/Repository.ts`): contrato de coleção
  (`getAll`, `getById`, `create`, `update`, `remove`, `clear`,
  `replaceAll`). Implementado hoje por `createLocalRepository`, que guarda
  cada coleção como um array em uma chave do `StorageAdapter`.
- Um repositório tipado existe para cada entidade: `categoriaRepository`,
  `produtoRepository`, `pedidoRepository`, `sessaoCaixaRepository`,
  `movimentacaoCaixaRepository`, `movimentacaoEstoqueRepository`
  (`storage/repositories.ts`).
- Os **services** (`services/*.ts`) são a única camada que os hooks/páginas
  devem chamar. Eles usam os repositórios e adicionam regra de negócio
  (ex: `estoqueService.registrarMovimentacaoEstoque` também atualiza
  `produto.estoqueAtual`; `pedidoService.criarPedido` gera o número
  sequencial do pedido).

### Migração futura para Supabase

1. Criar `storage/supabaseAdapter.ts` implementando `StorageAdapter`
   **ou**, mais realisticamente para um banco relacional, criar
   `storage/createSupabaseRepository.ts` implementando `Repository<T>`
   diretamente com queries do Supabase (select/insert/update/delete).
2. Trocar as instâncias em `storage/repositories.ts` para usar a nova
   factory no lugar de `createLocalRepository`.

Como `services/`, `hooks/` e `pages/` só conhecem as interfaces
(`StorageAdapter` / `Repository<T>`), nenhum desses arquivos precisa ser
reescrito.

### Dados de demonstração

`storage/seed.ts` define os dados iniciais (4 categorias, 8 produtos, 2
pedidos de exemplo, 1 sessão de caixa fechada e as movimentações
correspondentes). `ensureSeeded()` roda automaticamente no início da
aplicação (`src/main.tsx`) e só popula dados se o storage estiver
realmente vazio — nunca sobrescreve dados reais que você já tenha criado.

Na tela **Início** há dois botões para facilitar testes:
- **Restaurar dados de demonstração**: apaga tudo e recarrega a seed original.
- **Limpar todos os dados**: apaga tudo, sem recolocar a demonstração.

## Módulo de Produtos e Categorias

Tela **Produtos** (menu lateral), com duas abas:

**Categorias**
- Criar, editar (nome/cor), ativar/desativar, excluir e reordenar (▲▼).
- Exclusão é bloqueada com uma mensagem clara se existirem produtos
  vinculados à categoria (`categoriaService.excluirCategoria`).

**Produtos**
- Pesquisa por nome/descrição e filtro por categoria, combináveis.
- Criar/editar em um modal: nome, descrição, categoria, preço, custo,
  unidade, estoque atual, estoque mínimo, imagem opcional e status ativo.
- Ativar/desativar direto na lista (clicando no badge de status).
- Excluir com confirmação (`window.confirm`).
- A imagem do produto é redimensionada no navegador (canvas, até 320×320,
  JPEG) antes de virar um data URL salvo no produto — sem upload para
  nenhum servidor (`utils/image.ts`).

Tudo isso passa por `categoriaService` / `produtoService`
(`src/services/`), que por sua vez usam `categoriaRepository` /
`produtoRepository` (`src/storage/`) — nenhum componente acessa o
localStorage diretamente.

## PDV / Nova Venda (tela Vendas)

Layout de duas colunas otimizado para 1366×768:

**Área principal (esquerda)**: busca por nome, pílulas de categoria (mais
rápidas de clicar durante o atendimento do que um `<select>`) e grid de
cards de produto. Clicar em um card adiciona 1 unidade ao carrinho;
clicar de novo no mesmo produto soma quantidade em vez de duplicar a linha.

**Carrinho (direita)**, com cada item mostrando nome, preço unitário,
botões `+`/`-`, subtotal da linha e remover. Também tem:
- **Observação** do pedido (texto livre).
- **Desconto** em R$, sempre limitado ao valor do subtotal (o total nunca
  fica negativo).
- **Subtotal**, **Desconto** e **TOTAL** recalculados a cada mudança.
- **Limpar** (esvazia o carrinho) e **Finalizar Venda**.

Toda a lógica está em `hooks/useCarrinho.ts` — estado 100% em memória
(React) até o pagamento ser confirmado.

## Finalização da venda / Pagamento

Clicar em **Finalizar Venda** abre o modal de pagamento
(`components/vendas/PagamentoModal.tsx`), mostrando o total e 5 opções:

- **💵 Dinheiro** — campo de valor recebido; troco calculado automaticamente
  (`recebido - total`); o botão Finalizar só habilita se o valor cobrir o total.
- **📱 Pix** — apenas registra manualmente que o pagamento foi recebido
  (sem gateway ou API — como pedido).
- **💳 Débito** / **💳 Crédito** — registram a forma escolhida.
- **🔄 Misto** — divide o pagamento em várias linhas (forma + valor),
  cada uma podendo ser uma forma diferente. Só é possível finalizar quando
  a soma bate **exatamente** com o total.

Ao finalizar (`pedidoService.finalizarVenda`, em `src/services/pedidoService.ts`):
1. gera o número sequencial do pedido;
2. salva o pedido com os itens (uma "foto" de nome/preço no momento da venda);
3. salva o(s) pagamento(s), com troco quando aplicável;
4. marca o pedido como `"finalizado"`;
5. limpa o carrinho;
6. mostra uma tela de confirmação (nº do pedido, itens, total, formas de
   pagamento e troco), com um botão **Nova Venda**.

Como camada extra de segurança, o próprio service rejeita
(`PagamentoInsuficienteError`) qualquer tentativa de finalizar com valor
pago menor que o total — mesmo que, por algum bug de UI, o botão não
tivesse sido desabilitado.

Esta etapa **não baixa estoque nem lança movimentação de caixa** — isso
fica para quando os módulos de Estoque e Caixa forem integrados ao PDV.
Impressão também não foi implementada.



## Identidade visual

- Vermelho `#E11D2E` (principal, ação)
- Amarelo mostarda `#F5B301` (destaque)
- Branco quente `#FAF7F2` (texto sobre fundo escuro)
- Tons escuros de carvão/couro (`charcoal-950` a `charcoal-300`) como base

Layout otimizado para notebooks em **1366×768**: sidebar fixa de 240px,
header de 64px, sem exigir viewport maior que isso para ser utilizável.

## Estoque

Tela **Estoque** (menu lateral), com três abas:

- **Estoque**: lista de produtos com estoque atual/mínimo, badge "Estoque
  baixo" quando `estoqueAtual <= estoqueMinimo`, banner de alerta e botão
  **Nova Movimentação** (entrada 📥 / saída 📤 / ajuste ⚖️, com prévia do
  novo estoque e bloqueio se ficaria negativo).
- **Histórico**: todas as movimentações (produto, tipo, quantidade,
  motivo, data/hora, observação), com filtro por produto e por tipo.
- **Pedidos**: lista de pedidos com botão **Cancelar** para os já
  finalizados — cancelar devolve automaticamente a quantidade de cada
  item ao estoque (motivo "cancelamento").

Toda a lógica está em `estoqueService` e `pedidoService`
(`src/services/`):
- `finalizarVenda` agora dá **baixa automática** no estoque de cada item
  vendido, e **rejeita a venda inteira** (`EstoqueInsuficienteError`) se
  faltar estoque de qualquer produto — antes mesmo de gravar o pedido.
- `cancelarPedido` **devolve o estoque** automaticamente quando o pedido
  já tinha sido pago (qualquer status "recebido" → "finalizado" — ver
  `pedidoFoiPago`; pedidos "abertos" nunca baixaram estoque, então
  cancelá-los não mexe em nada). Cancelar duas vezes é bloqueado
  (`PedidoJaCanceladoError`).
- `registrarMovimentacaoEstoque` (usado por tudo isso) **nunca permite
  estoque negativo** — entrada, saída, venda, devolução ou ajuste manual.

## Caixa

Tela **Caixa**, com dois estados:

- **Nenhum caixa aberto**: botão para abrir, informando o valor inicial
  (+ operador/observações opcionais), e uma lista das últimas sessões já
  fechadas para conferência.
- **Caixa aberto**: cartões com valor inicial, vendas por forma de
  pagamento (dinheiro/Pix/débito/crédito), sangrias, despesas e o
  **valor esperado** (calculado, não digitado), além da lista de
  movimentações da sessão. Botões **Nova Sangria**, **Nova Despesa** e
  **Fechar Caixa**.
- **Fechar Caixa** mostra o resumo completo, pede o valor contado
  manualmente, calcula a **diferença** (informado − esperado) e, ao
  confirmar, fecha a sessão e mostra uma confirmação final.

Regras garantidas por `caixaService`/`pedidoService`:
- **Nunca duas sessões abertas ao mesmo tempo** (`abrirCaixa` rejeita se
  já existe uma aberta).
- **`finalizarVenda` exige caixa aberto** (`CaixaFechadoError`) — sem
  isso, o PDV não permite vender. Cada venda finalizada lança
  automaticamente uma entrada no caixa por forma de pagamento (dinheiro
  já líquido do troco).
- Cancelar um pedido pago **estorna** a entrada de caixa correspondente,
  mas só se a venda pertencer à sessão que está aberta *agora* — sessões
  já fechadas não são alteradas retroativamente.

## Pedidos

Tela **Pedidos**: lista com número, horário, produtos, quantidade,
total, forma(s) de pagamento e status de cada pedido.

- **Status** (fluxo de cozinha): 🟡 Recebido → 🔵 Em preparo → 🟢 Pronto
  → ⚫ Finalizado, alterável direto na lista ou no modal de detalhes
  (`atualizarStatusPedido`). 🔴 Cancelado é tratado à parte, com sua
  própria rotina (`cancelarPedido`) que devolve estoque e ajusta o caixa.
- **Filtros**: status (pílulas), período (data de/até) e número do pedido.
- **Visualização detalhada**: itens, subtotal/desconto/total, pagamento(s)
  com troco, observações.
- **Cancelar com confirmação**, avisando quando estoque/caixa serão
  ajustados.

## Dashboard (Início)

Tudo calculado em tempo real a partir dos pedidos reais salvos — nenhum
número fictício (`services/dashboardService.ts`):

- **Vendas hoje**, **Pedidos hoje**, **Ticket médio**, e o total líquido
  recebido em cada forma de pagamento (Dinheiro/Pix/Débito/Crédito) —
  tudo calculado pelo **dia local** (não UTC), somando só pedidos pagos
  e não cancelados.
- **Produtos mais vendidos hoje**, **estoque baixo**, **últimos
  pedidos** e um mini gráfico de barras (sem lib externa) com o
  **resumo dos últimos 7 dias**.
- **Estados vazios amigáveis** em cada seção quando não há dados ainda
  (nada de zeros/NaN confusos) — testado tanto com dados reais quanto
  com o storage totalmente vazio.

O antigo painel de "resumo de dados + restaurar/limpar demonstração"
(útil para testes, não para o dia a dia) foi movido para
**Configurações**.

## Backup local

Tela **Configurações**, seção "Backup local" (100% offline, sem servidor):

- **Exportar Backup**: baixa um `.json` com todas as coleções —
  categorias, produtos, pedidos (com itens e pagamentos embutidos),
  sessões de caixa, movimentações de caixa, movimentações de estoque e
  as configurações internas (sequência de pedidos etc.).
- **Importar Backup**: escolhe um arquivo `.json`. O arquivo é **validado
  antes de qualquer gravação** (`validarBackupDeTexto`/`validarBackup`
  em `services/backupService.ts`): confere se é JSON válido, se tem o
  "carimbo" de formato do sistema, versão compatível, e se cada coleção
  tem os campos essenciais em cada item. Se algo estiver errado, mostra
  o erro e **não toca nos dados existentes**. Se estiver tudo certo,
  mostra um resumo do conteúdo (contagens + data de geração) e o aviso
  **"Isso substituirá os dados atuais."** antes de restaurar de verdade.
- **Limpar todos os dados** (Zona de perigo) agora exige **confirmação
  dupla**: uma tela de aviso ("Continuar") seguida de uma segunda tela
  que só libera o botão final depois de digitar a palavra `APAGAR`.

## Revisão geral (bugs corrigidos)

Passagem de QA completa pelo sistema, sem novas funcionalidades — só
correções. Bugs reais encontrados e corrigidos:

1. **Vendas sem checar caixa aberto**: o operador podia montar o
   carrinho inteiro e só descobrir, na hora de pagar, que precisava
   abrir o caixa primeiro. Agora a tela de Vendas verifica isso de cara
   e mostra a tela de "Abrir Caixa" direto ali, sem perder contexto.
2. **Estoque/preço negativos por bypass**: `atualizarProduto`/
   `criarProduto` não validavam nada — dava para colocar preço, custo ou
   estoque negativos direto pela edição do produto, contornando a trava
   do `estoqueService`. Agora ambos os services validam (e a UI também).
3. **Categoria com nome vazio**: `criarCategoria`/`atualizarCategoria`
   não tinham validação própria no service (só a tela). Corrigido.
4. **Pedido de R$ 0,00 (100% de desconto) travava Pix/Débito/Crédito**:
   por causa de uma comparação `total > 0`, esses métodos ficavam
   bloqueados nesse caso raro, enquanto "Dinheiro" funcionava por
   acidente (`0 >= 0`). Corrigido para tratar os métodos de forma
   consistente.
5. **Dashboard vulnerável a dado corrompido**: se um pedido tivesse uma
   forma de pagamento fora do esperado (ex: de um backup editado à
   mão), o cálculo por forma de pagamento podia virar `NaN` em vez de
   simplesmente ignorar o valor estranho. Corrigido com uma checagem seg
   ura, no mesmo padrão já usado no caixa.

**Como foi testado**: linha de base (todos os testes anteriores
continuam passando), 7 novos testes de regressão no script Node, e um
teste E2E dedicado no navegador cobrindo exatamente os 15 passos:
cadastrar produto → abrir caixa → venda em dinheiro/Pix/cartão/misto →
baixa de estoque → cancelamento (com devolução de estoque e estorno de
caixa) → sangria → despesa → fechar caixa → exportar backup → recarregar
a página → importar backup. Nenhuma funcionalidade existente foi
alterada além do necessário para corrigir os pontos acima.

**Observação sobre 1366×768/responsividade**: este ambiente de execução
não tem acesso à internet para compilar o Tailwind de verdade, então a
verificação visual foi feita por revisão de código (medidas de
sidebar/cartão/gaps somadas batendo com a largura/altura disponíveis) e
por testes estruturais automatizados — não por captura de tela com o
CSS final. Vale conferir visualmente com `npm run dev` na sua máquina.

## Cardápio completo (Dogão da Praça)

Cardápio real integrado à seed (`storage/seed.ts`), usando 100% a
estrutura de `Categoria`/`Produto` já existente.

**Catálogo atual — 6 categorias, 55 produtos, sem nenhum item de teste:**
- 🌭 Hot Dogs (9) · 🥪 Lanches Prensados (7) · 🥟 Salgados (8) ·
  🥤 Bebidas (21, incluindo a Água Mineral 500ml) · ➕ Adicionais de
  ingredientes (9) · 🍰 Doces (2).

Todos os produtos e categorias de demonstração/teste das etapas
anteriores foram **removidos** (Dogão Simples, Dogão Completo, Dogão
Bacon, X-Salada antigo, Refrigerante Lata genérico, Suco Natural
genérico, Batata Frita Porção, Água Sem Gás 500ml, Bacon Extra, Queijo
Extra, e as categorias vazias que sobraram) — junto com os pedidos e a
sessão de caixa fictícios que existiam só para teste. O sistema agora
começa "zerado" de transações: o primeiro pedido real vira #1.

- **Estoque**: como as quantidades não foram informadas, todos os
  produtos nascem com estoque `0` (não inventado). Eles aparecem, entram
  no carrinho e no cálculo do total normalmente, mas a trava de estoque
  **já existente** do sistema impede finalizar a venda até o estoque
  real ser cadastrado em **Estoque → Nova Movimentação (Entrada)**.
- Ativa automaticamente rodando com o storage vazio (primeira execução)
  ou clicando em **Restaurar dados de demonstração** em Configurações —
  mesmo mecanismo que já existia, nada novo foi criado.

## Impressora térmica (Goldensky SMX-JP58H, 58mm, USB)

### Por que WebUSB, e não `window.print()`

Este projeto é um app 100% client-side (React + Vite, sem backend, sem
Electron). Isso limita bastante as formas de falar com um dispositivo
USB — a única API que permite enviar bytes ESC/POS **diretamente** da
página, sem instalar nada além do navegador, é a **WebUSB**
(`navigator.usb`), suportada no **Google Chrome e Microsoft Edge** (não
no Firefox/Safari). Foi essa a solução implementada — `window.print()`
foi propositalmente evitado como abordagem definitiva, pois ele imprime
via a fila de impressão do sistema operacional (com diálogo, paginação
de CSS, sem controle real sobre corte/alinhamento ESC/POS), não os bytes
crus que uma impressora térmica de 58mm espera.

### Limitação importante (não é um bug, é como o USB funciona no Windows)

A WebUSB só consegue controlar a impressora se o Windows **ainda não**
tiver reivindicado a interface USB dela para um driver de impressora
convencional. A maioria das impressoras USB — incluindo térmicas —
aparece em "Dispositivos e Impressoras" do Windows usando o driver de
classe padrão do sistema (`usbprint.sys`). Quando isso acontece, a
WebUSB não consegue abrir o dispositivo (erro de acesso negado), porque
o Windows já está usando.

Para a impressão direta via WebUSB funcionar com a Goldensky SMX-JP58H,
uma destas duas coisas precisa ser verdade:
1. A impressora está conectada mas **sem** driver de impressora
   instalado no Windows (situação comum se ela nunca foi instalada como
   impressora do Windows) — nesse caso costuma aparecer em Gerenciador
   de Dispositivos como algo genérico, não em "Impressoras".
2. Ou o driver da interface foi trocado manualmente por um driver
   WinUSB/libusb — ferramenta comum para isso: **Zadig**
   (https://zadig.akeo.ie/). Isso é uma configuração do Windows, fora
   do controle deste app.

Se nenhuma das duas for o caso, `Configurações → Impressora → Conectar
Impressora` vai mostrar uma mensagem de erro explicando exatamente isso.

### Como testar com a impressora física

1. Rode o sistema com `npm run dev` (precisa ser `localhost` ou HTTPS —
   WebUSB exige "contexto seguro"; `localhost` já serve).
2. Conecte a Goldensky SMX-JP58H via USB no notebook.
3. Abra **Configurações → Impressora** e clique em **Conectar
   Impressora**. O Chrome/Edge vai abrir um seletor nativo listando os
   dispositivos USB — escolha a impressora na lista.
   - Se ela não aparecer na lista ou a conexão falhar, é o cenário do
     driver descrito acima — verifique em "Dispositivos e Impressoras"
     do Windows se ela está instalada como impressora comum.
4. Clique em **Imprimir página de teste**. Isso testa: acentuação
   (título contém "ção ã é"), alinhamento, negrito e formatação básica.
5. **Confira a acentuação no papel impresso.** Se os acentos saírem
   errados (caracteres estranhos em vez de ã, ç, é...), abra
   `src/utils/escpos.ts` e ajuste o parâmetro de
   `selecionarPaginaDeCodigo()` (comentário no código lista os valores
   mais comuns: 0, 2, 16, 32) — isso depende do firmware exato da
   impressora, que não temos como confirmar sem testar fisicamente.
6. Se as linhas saírem cortando texto ou sobrando espaço em branco à
   direita, ajuste `LARGURA_PADRAO_58MM` em `src/utils/recibo58mm.ts`
   (32 é o padrão para a maioria das 58mm, mas depende da fonte
   configurada no firmware).
7. Marque **"Cortar o papel automaticamente"** em Configurações só se a
   SMX-JP58H tiver guilhotina — muitas impressoras portáteis de 58mm
   não têm.
8. Faça uma venda de teste (Vendas → Finalizar Venda) com o caixa
   aberto e confira a impressão automática do comprovante.

### O que foi implementado

- `utils/escpos.ts` — comandos ESC/POS em bytes puros (sem biblioteca
  externa): inicializar, alinhar, negrito, texto, avançar papel, cortar.
- `utils/recibo58mm.ts` — monta o comprovante completo (cabeçalho,
  pedido, itens com quebra de linha automática, subtotal/desconto/
  total, forma(s) de pagamento, troco) formatado para 32 colunas
  (58mm). Função pura, testável sem hardware (`npm run test:impressora`).
- `services/impressoraService.ts` — conexão WebUSB (conectar,
  reconectar silenciosamente ao abrir o app, desconectar), envio de
  bytes, `imprimirPedido()`, `imprimirTeste()`.
- **Fluxo correto**: a venda é registrada (`finalizarVenda`) **antes**
  de qualquer tentativa de impressão. Uma falha na impressora nunca
  cancela nem esconde o pedido — mostra um aviso claro na tela de
  confirmação, com botão **"Tentar imprimir novamente"**.
- **Reimpressão**: disponível na tela de Pedidos (botão na lista e no
  modal de detalhes) para qualquer venda já registrada.
- Preferências em Configurações: imprimir automaticamente ao finalizar
  venda (liga/desliga), cortar papel automaticamente (liga/desliga).

### Testado (sem a impressora física — isso só você pode confirmar)

- `npm run test:impressora`: formatação do recibo (largura de 32
  colunas, quebra de linha de nomes longos, acentos codificados
  corretamente em Latin-1, desconto, troco, pagamento misto, corte de
  papel opcional). **Bug real encontrado e corrigido nesse teste**: o
  `Intl.NumberFormat` do JavaScript insere um espaço não-quebrável
  (U+00A0) entre "R$" e o valor — esse byte específico (0xA0) tem
  significados diferentes em páginas de código diferentes e podia virar
  um caractere errado no meio do preço, dependendo da tabela da
  impressora. Corrigido normalizando para espaço comum (0x20, seguro em
  qualquer página de código) antes de enviar para a impressora.
- Teste de UI ponta a ponta confirmando o requisito mais crítico: uma
  venda finalizada **nunca** é cancelada ou escondida mesmo com a
  impressora desconectada — aparece o pedido confirmado + aviso claro +
  botão de tentar novamente.

## Próximas etapas (não incluídas aqui)

- Impressão de comprovante
