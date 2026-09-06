import {
  storage,
  CONFIG_KEYS,
  categoriaRepository,
  produtoRepository,
  pedidoRepository,
  sessaoCaixaRepository,
  movimentacaoCaixaRepository,
  movimentacaoEstoqueRepository,
} from "@/storage";
import { nowIso } from "@/utils/date";
import type {
  Categoria,
  MovimentacaoCaixa,
  MovimentacaoEstoque,
  Pedido,
  SessaoCaixa,
  Produto,
} from "@/types";

/** Identifica o arquivo como um backup deste sistema (não um JSON qualquer). */
export const BACKUP_FORMATO = "dogao-da-praca-backup";

/**
 * Versão do FORMATO do backup (não da versão do app). Só muda se a
 * estrutura do arquivo de backup em si mudar de um jeito incompatível.
 */
export const BACKUP_VERSAO_ATUAL = 1;

export interface BackupConfiguracoes {
  seedVersao: number | null;
  pedidoSequencia: number | null;
}

export interface BackupDados {
  categorias: Categoria[];
  produtos: Produto[];
  pedidos: Pedido[];
  sessoesCaixa: SessaoCaixa[];
  movimentacoesCaixa: MovimentacaoCaixa[];
  movimentacoesEstoque: MovimentacaoEstoque[];
  configuracoes: BackupConfiguracoes;
}

export interface Backup {
  formato: typeof BACKUP_FORMATO;
  versao: number;
  geradoEm: string;
  dados: BackupDados;
}

/** Pequeno resumo do conteúdo do backup, para mostrar antes de restaurar. */
export interface ResumoBackup {
  geradoEm: string;
  categorias: number;
  produtos: number;
  pedidos: number;
  sessoesCaixa: number;
  movimentacoesCaixa: number;
  movimentacoesEstoque: number;
}

/**
 * Lê todas as coleções + configurações do storage e monta o objeto de
 * backup. Chamado pelo botão "Exportar Backup".
 */
export async function gerarBackup(): Promise<Backup> {
  const [
    categorias,
    produtos,
    pedidos,
    sessoesCaixa,
    movimentacoesCaixa,
    movimentacoesEstoque,
    seedVersao,
    pedidoSequencia,
  ] = await Promise.all([
    categoriaRepository.getAll(),
    produtoRepository.getAll(),
    pedidoRepository.getAll(),
    sessaoCaixaRepository.getAll(),
    movimentacaoCaixaRepository.getAll(),
    movimentacaoEstoqueRepository.getAll(),
    storage.get<number>(CONFIG_KEYS.seedVersao),
    storage.get<number>(CONFIG_KEYS.pedidoSequencia),
  ]);

  return {
    formato: BACKUP_FORMATO,
    versao: BACKUP_VERSAO_ATUAL,
    geradoEm: nowIso(),
    dados: {
      categorias,
      produtos,
      pedidos,
      sessoesCaixa,
      movimentacoesCaixa,
      movimentacoesEstoque,
      configuracoes: {
        seedVersao: seedVersao ?? null,
        pedidoSequencia: pedidoSequencia ?? null,
      },
    },
  };
}

/** Nome de arquivo sugerido para o download, com data e hora. */
export function nomeArquivoBackup(data = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const carimbo = `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}-${pad(data.getHours())}${pad(data.getMinutes())}`;
  return `dogao-da-praca-backup-${carimbo}.json`;
}

export interface ResultadoValidacaoBackup {
  valido: boolean;
  erro?: string;
  backup?: Backup;
  resumo?: ResumoBackup;
}

function ehArrayDeObjetos(valor: unknown): valor is Record<string, unknown>[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === "object" && item !== null);
}

function itemTemCampos(item: Record<string, unknown>, campos: string[]): string | null {
  for (const campo of campos) {
    if (!(campo in item)) return campo;
  }
  return null;
}

const COLECOES_ESPERADAS: { chave: keyof BackupDados; camposObrigatorios: string[] }[] = [
  { chave: "categorias", camposObrigatorios: ["id", "nome", "cor", "ordem", "ativo"] },
  {
    chave: "produtos",
    camposObrigatorios: [
      "id",
      "nome",
      "categoriaId",
      "preco",
      "estoqueAtual",
      "estoqueMinimo",
      "ativo",
    ],
  },
  {
    chave: "pedidos",
    camposObrigatorios: ["id", "numero", "status", "itens", "pagamentos", "total"],
  },
  { chave: "sessoesCaixa", camposObrigatorios: ["id", "status", "valorAbertura"] },
  {
    chave: "movimentacoesCaixa",
    camposObrigatorios: ["id", "sessaoCaixaId", "tipo", "origem", "valor"],
  },
  {
    chave: "movimentacoesEstoque",
    camposObrigatorios: ["id", "produtoId", "tipo", "quantidade", "motivo"],
  },
];

/**
 * Valida a estrutura de um objeto lido de um arquivo (já com `JSON.parse`
 * feito) antes de deixar restaurar. Verifica o "carimbo" do formato, a
 * versão, e que cada coleção existe como lista com os campos essenciais
 * em cada item — suficiente para rejeitar um JSON qualquer ou um backup
 * corrompido/truncado sem precisar de uma lib de schema.
 *
 * IMPORTANTE: nunca grava nada no storage. Só analisa o objeto recebido.
 */
export function validarBackup(valor: unknown): ResultadoValidacaoBackup {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return { valido: false, erro: "O arquivo não contém um objeto JSON válido." };
  }
  const raiz = valor as Record<string, unknown>;

  if (raiz.formato !== BACKUP_FORMATO) {
    return {
      valido: false,
      erro: "Este arquivo não é um backup do Dogão da Praça (formato não reconhecido).",
    };
  }

  if (typeof raiz.versao !== "number" || raiz.versao < 1 || raiz.versao > BACKUP_VERSAO_ATUAL) {
    return {
      valido: false,
      erro: "Versão do backup não é compatível com esta versão do sistema.",
    };
  }

  if (typeof raiz.geradoEm !== "string" || raiz.geradoEm.trim() === "") {
    return { valido: false, erro: "Backup sem data de geração válida." };
  }

  if (typeof raiz.dados !== "object" || raiz.dados === null) {
    return { valido: false, erro: "Backup sem a seção de dados esperada." };
  }
  const dados = raiz.dados as Record<string, unknown>;

  for (const { chave, camposObrigatorios } of COLECOES_ESPERADAS) {
    const lista = dados[chave];
    if (!ehArrayDeObjetos(lista)) {
      return {
        valido: false,
        erro: `O campo "${chave}" do backup está ausente ou não é uma lista válida.`,
      };
    }
    for (const item of lista) {
      const campoFaltando = itemTemCampos(item, camposObrigatorios);
      if (campoFaltando) {
        return {
          valido: false,
          erro: `Um item em "${chave}" está sem o campo obrigatório "${campoFaltando}".`,
        };
      }
    }
  }

  if (typeof dados.configuracoes !== "object" || dados.configuracoes === null) {
    return { valido: false, erro: "Backup sem a seção de configurações." };
  }

  const backup = raiz as unknown as Backup;
  return {
    valido: true,
    backup,
    resumo: {
      geradoEm: backup.geradoEm,
      categorias: backup.dados.categorias.length,
      produtos: backup.dados.produtos.length,
      pedidos: backup.dados.pedidos.length,
      sessoesCaixa: backup.dados.sessoesCaixa.length,
      movimentacoesCaixa: backup.dados.movimentacoesCaixa.length,
      movimentacoesEstoque: backup.dados.movimentacoesEstoque.length,
    },
  };
}

/**
 * Analisa o texto bruto de um arquivo (já lido) e valida como backup.
 * Trata erro de `JSON.parse` como arquivo inválido, sem lançar exceção.
 */
export function validarBackupDeTexto(texto: string): ResultadoValidacaoBackup {
  let valor: unknown;
  try {
    valor = JSON.parse(texto);
  } catch {
    return { valido: false, erro: "O arquivo selecionado não é um JSON válido." };
  }
  return validarBackup(valor);
}

/**
 * Substitui TODOS os dados do sistema pelo conteúdo do backup. Só deve
 * ser chamado com um backup já validado (`validarBackup` retornando
 * `valido: true`) e após confirmação explícita do usuário — esta função
 * não pergunta nada, apenas executa.
 */
export async function restaurarBackup(backup: Backup): Promise<void> {
  const { dados } = backup;

  await categoriaRepository.replaceAll(dados.categorias);
  await produtoRepository.replaceAll(dados.produtos);
  await pedidoRepository.replaceAll(dados.pedidos);
  await sessaoCaixaRepository.replaceAll(dados.sessoesCaixa);
  await movimentacaoCaixaRepository.replaceAll(dados.movimentacoesCaixa);
  await movimentacaoEstoqueRepository.replaceAll(dados.movimentacoesEstoque);

  if (dados.configuracoes.seedVersao !== null && dados.configuracoes.seedVersao !== undefined) {
    await storage.set(CONFIG_KEYS.seedVersao, dados.configuracoes.seedVersao);
  } else {
    await storage.remove(CONFIG_KEYS.seedVersao);
  }

  if (
    dados.configuracoes.pedidoSequencia !== null &&
    dados.configuracoes.pedidoSequencia !== undefined
  ) {
    await storage.set(CONFIG_KEYS.pedidoSequencia, dados.configuracoes.pedidoSequencia);
  } else {
    await storage.remove(CONFIG_KEYS.pedidoSequencia);
  }
}
