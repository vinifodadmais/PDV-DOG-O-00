# CLAUDE.md — PDV Dogão da Praça

## 1. Identidade do projeto

Este repositório é o sistema PDV (Ponto de Venda) do Dogão da Praça.

O sistema é utilizado em uma operação comercial real. Portanto, alterações devem priorizar estabilidade, segurança dos dados, compatibilidade com o fluxo existente e preservação das funcionalidades já funcionando.

Não tratar o projeto como um protótipo descartável.

---

## 2. Stack principal

* React 18
* TypeScript
* Vite
* Supabase
* PostgreSQL
* Vercel
* GitHub
* GitHub Actions
* QZ Tray
* Impressora térmica USB 58mm

Antes de introduzir uma nova biblioteca ou tecnologia, verificar se ela é realmente necessária e se não existe uma solução adequada utilizando a stack atual.

---

## 3. Regra principal de Git

NUNCA trabalhar diretamente na branch `main`.

A `main` representa a versão estável/produção.

Antes de modificar código:

1. Verificar a branch atual com `git status`.
2. Se estiver na `main`, criar uma branch apropriada.
3. Nunca fazer push diretamente para `main`.
4. Nunca fazer merge para `main` sem autorização explícita do usuário.

### Padrão de branches

Novas funcionalidades:

`feature/nome-da-funcionalidade`

Correções:

`fix/nome-do-problema`

Refatorações:

`refactor/nome-da-refatoracao`

Manutenção/configuração:

`chore/nome-da-tarefa`

Exemplos:

`feature/impressao-automatica`

`fix/calculo-total-venda`

`refactor/carrinho`

`chore/update-dependencies`

---

## 4. Fluxo obrigatório de desenvolvimento

Para qualquer alteração relevante:

1. Verificar o estado do Git.
2. Verificar a branch atual.
3. Criar uma branch específica para a tarefa.
4. Entender o código existente antes de modificar.
5. Implementar a alteração.
6. Evitar alterações fora do escopo solicitado.
7. Executar os testes/build apropriados.
8. Corrigir erros encontrados.
9. Fazer commit com mensagem clara.
10. Fazer push da branch.
11. Informar ao usuário o resultado.
12. Aguardar autorização antes de qualquer merge para `main`.

Não considerar uma tarefa concluída apenas porque o código foi alterado.

---

## 5. Antes de alterar código

Antes de modificar arquivos:

* procurar onde a funcionalidade atual está implementada;
* entender os componentes relacionados;
* verificar os tipos TypeScript envolvidos;
* verificar os serviços utilizados;
* verificar dependências com Supabase;
* verificar se existem RPCs ou funções SQL relacionadas;
* verificar se existe código de impressão relacionado;
* verificar impactos em outras telas.

Não substituir uma implementação existente sem entender sua finalidade.

Evitar reescrever arquivos inteiros quando uma alteração localizada for suficiente.

---

## 6. Regra de preservação

NÃO remover ou modificar funcionalidades existentes apenas para facilitar uma nova implementação.

Uma nova funcionalidade deve preservar:

* vendas existentes;
* carrinho;
* produtos;
* categorias;
* adicionais;
* pagamentos;
* fechamento de venda;
* estoque;
* usuários;
* permissões;
* impressão;
* pedidos;
* integração com Supabase.

Se uma alteração puder quebrar uma funcionalidade existente, informar o risco antes de prosseguir.

---

## 7. Supabase

O Supabase é o backend principal do sistema.

O banco utiliza PostgreSQL.

Antes de modificar estrutura de banco:

1. verificar o schema atual;
2. verificar tabelas existentes;
3. verificar funções/RPCs existentes;
4. verificar políticas RLS;
5. verificar dependências no frontend;
6. evitar criar estruturas duplicadas.

Não assumir que uma migration ainda não foi aplicada.

Sempre verificar o estado atual antes de propor ou executar SQL.

### Dados importantes

O sistema possui entidades relacionadas a:

* profiles
* categories
* products
* sales
* sale_items
* payments
* cash_sessions
* cash_movements
* stock_movements

Também existem operações de finalização de venda através de RPC.

---

## 8. Segurança e permissões

Existem dois níveis principais de usuário:

### Admin

Pode acessar funcionalidades administrativas, configurações e gerenciamento do sistema.

### Operator

Deve possuir acesso restrito às funcionalidades operacionais necessárias para realizar vendas.

Não ampliar permissões de operador sem solicitação explícita.

Não remover controles de acesso apenas para facilitar testes.

Qualquer alteração envolvendo autenticação, autorização ou RLS deve ser tratada como alteração sensível.

---

## 9. Vendas

O fluxo de venda é uma das partes críticas do sistema.

Alterações em vendas devem preservar:

* produtos;
* quantidades;
* preços;
* adicionais;
* observações;
* subtotal;
* total;
* forma de pagamento;
* status do pagamento;
* opção de consumo;
* estoque;
* finalização da venda;
* impressão do recibo.

O sistema possui as opções:

### Pagamento

* `pago`
* `nao_pago`

### Consumo

* `comer_aqui`
* `levar`

Essas informações fazem parte da venda e devem ser preservadas quando uma venda é finalizada.

---

## 10. Carrinho

Adicionais pertencem ao item do carrinho.

Não transformar adicionais em uma categoria independente de venda.

Cada item pode possuir:

* produto;
* quantidade;
* adicionais;
* observação específica.

Alterações no carrinho devem preservar essas relações.

---

## 11. Impressão térmica

O sistema utiliza:

* QZ Tray
* impressora térmica USB de 58mm

A impressão é uma funcionalidade crítica.

Antes de modificar o sistema de impressão:

* verificar `impressoraService`;
* verificar utilitários de recibo;
* verificar integração QZ Tray;
* verificar formato do recibo;
* preservar compatibilidade com impressoras térmicas de 58mm.

Não substituir QZ Tray por Web Bluetooth ou outra tecnologia sem autorização explícita.

O recibo deve continuar contendo as informações relevantes da venda.

Quando aplicável, preservar:

* status de pagamento;
* opção de consumo;
* produtos;
* adicionais;
* observações;
* quantidades;
* valores;
* total.

---

## 12. Vercel

A aplicação é hospedada na Vercel.

A branch `main` representa produção.

Branches de desenvolvimento devem poder ser utilizadas para testes/preview sem alterar produção.

Não executar deploy de produção deliberadamente sem autorização do usuário, salvo quando o usuário solicitar explicitamente o deploy.

---

## 13. GitHub Actions

O projeto possui workflow de build em:

`.github/workflows/build.yml`

O workflow executa:

* checkout;
* Node.js 24;
* `npm ci`;
* `npm run build`.

Antes de considerar uma alteração pronta, o build local deve ser executado quando possível.

O GitHub Actions deve ser tratado como uma segunda validação.

Se o Actions falhar, investigar e corrigir antes de considerar a alteração concluída.

---

## 14. Build e validação

Depois de alterações relevantes, executar:

`npm run build`

O build precisa terminar sem erros TypeScript ou erros de compilação.

Warnings que não impedem o build devem ser analisados, mas não devem ser tratados automaticamente como falhas.

Não usar `npm audit fix --force` sem autorização explícita do usuário.

Não atualizar dependências de forma ampla apenas para eliminar warnings.

---

## 15. TypeScript

Evitar:

* `any` desnecessário;
* casts sem justificativa;
* ignorar erros TypeScript;
* `@ts-ignore` sem motivo técnico claro.

Preferir tipos existentes no projeto.

Se for necessário criar um novo tipo, colocá-lo no local apropriado e manter consistência com a arquitetura existente.

---

## 16. Código

Priorizar:

* código simples;
* componentes reutilizáveis;
* funções pequenas;
* nomes claros;
* tipagem forte;
* manutenção fácil;
* alterações localizadas.

Não adicionar abstrações complexas sem necessidade.

Não criar código duplicado quando uma função/serviço existente puder ser reutilizado adequadamente.

---

## 17. Interface

O PDV é utilizado durante uma operação comercial.

A interface deve priorizar:

* rapidez;
* clareza;
* poucos cliques;
* legibilidade;
* prevenção de erros;
* funcionamento em telas menores quando necessário.

Não adicionar emojis à interface do PDV.

Não introduzir mudanças visuais grandes sem solicitação do usuário.

---

## 18. Banco de dados e migrations

Nunca executar SQL destrutivo sem autorização explícita.

Evitar:

* `DROP TABLE`;
* `DROP COLUMN`;
* exclusões em massa;
* alteração destrutiva de dados;
* recriação de funções sem verificar a versão atual.

Quando uma alteração de banco for necessária, preferir uma migration clara e reversível quando possível.

Antes de criar uma migration, confirmar se a alteração já existe no banco.

---

## 19. Arquivos sensíveis

Nunca commitar:

* `.env`
* `.env.local`
* chaves privadas;
* tokens;
* credenciais;
* secrets;
* arquivos de configuração contendo credenciais.

Respeitar o `.gitignore`.

Nunca imprimir secrets no terminal ou em respostas ao usuário.

---

## 20. Commits

Usar mensagens de commit claras e objetivas.

Preferir Conventional Commits:

`feat:`

`fix:`

`refactor:`

`chore:`

`docs:`

Exemplos:

`feat: add payment status to sales`

`fix: correct receipt total`

`refactor: simplify cart state`

`chore: update build workflow`

---

## 21. Escopo

Não alterar arquivos que não sejam necessários para a tarefa.

Se encontrar um problema não relacionado durante o desenvolvimento:

* não corrigir automaticamente;
* informar ao usuário;
* sugerir uma tarefa separada.

Evitar misturar múltiplas funcionalidades em um mesmo commit.

---

## 22. Quando houver dúvida

Se uma decisão puder afetar:

* banco de dados;
* autenticação;
* permissões;
* vendas;
* estoque;
* pagamentos;
* impressão;
* produção;

não assumir silenciosamente.

Explicar a situação e pedir autorização quando necessário.

Para decisões pequenas e reversíveis, escolher a solução mais simples e consistente com o código existente.

---

## 23. Relatório ao finalizar uma tarefa

Ao concluir uma tarefa, informar:

### Alteração

O que foi implementado.

### Branch

Qual branch foi utilizada.

### Arquivos

Quais arquivos foram modificados.

### Validação

Quais testes/comandos foram executados.

### Build

Resultado do `npm run build`.

### Git

Commit realizado e branch enviada ao GitHub.

### Próximo passo

Informar se a branch está pronta para Pull Request.

Nunca afirmar que algo foi testado se o teste não foi realmente executado.

---

## 24. Regra final

A prioridade é:

1. preservar o sistema funcionando;
2. preservar os dados;
3. manter segurança;
4. implementar exatamente o solicitado;
5. validar antes de finalizar;
6. manter `main` estável;
7. manter histórico Git organizado.

Quando houver conflito entre velocidade e segurança, priorizar segurança e estabilidade.

Este arquivo deve ser tratado como regra operacional permanente do projeto.
