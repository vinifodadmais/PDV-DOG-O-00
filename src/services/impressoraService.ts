import { storage, CONFIG_KEYS } from "@/storage";
import { montarReciboEscPos } from "@/utils/recibo58mm";
import * as qzTray from "@/lib/qzTray";
import type { Pedido } from "@/types";

/**
 * ================================================================
 * Impressora térmica (Goldensky SMX-JP58H, 58mm) via QZ Tray
 * ================================================================
 *
 * Substituiu a implementação anterior baseada em WebUSB. Motivo: a
 * WebUSB só consegue "tomar posse" de uma interface USB se o Windows
 * ainda não a tiver reivindicado para um driver de impressora comum —
 * e a POS-58 já está instalada normalmente no Windows (driver POS-58
 * 11.3.0.1, porta USB001), então a WebUSB sempre falhava com "Access
 * denied".
 *
 * O QZ Tray resolve isso rodando como um aplicativo separado (bandeja
 * do Windows) que fala com a impressora através do próprio sistema de
 * impressão do SO, mas envia RAW/ESC-POS — não uma página HTML, não a
 * caixa de diálogo de impressão do Windows. O navegador conversa com o
 * QZ Tray via WebSocket local (`src/lib/qzTray.ts`), e este arquivo
 * continua responsável só pela parte de domínio: montar o recibo
 * (`utils/recibo58mm.ts`, inalterado — o formato ESC/POS é o mesmo,
 * só mudou COMO os bytes chegam até a impressora) e decidir quando
 * imprimir.
 *
 * Pré-requisito no computador do caixa: QZ Tray instalado e aberto
 * (https://qz.io/download/). Sem isso, `conectar()`/`imprimirPedido()`
 * falham com uma mensagem clara — nunca fingem sucesso.
 */

export interface StatusImpressora {
  /** QZ Tray é compatível com qualquer navegador — sempre `true`; existe só por compatibilidade com quem já lia este campo. */
  suportado: boolean;
  /** Há uma conexão WebSocket ativa com o QZ Tray agora? */
  conectado: boolean;
  /** Nome da impressora escolhida em Configurações (ex: "POS-58"), se houver. */
  impressoraSelecionada?: string;
}

async function obterImpressoraSelecionada(): Promise<string | undefined> {
  const valor = await storage.get<string>(CONFIG_KEYS.impressoraNomeSelecionada);
  return valor ?? undefined;
}

/** Salva qual impressora (nome reportado pelo Windows/QZ Tray, ex: "POS-58") deve ser usada. */
export async function definirImpressoraSelecionada(nome: string): Promise<void> {
  await storage.set(CONFIG_KEYS.impressoraNomeSelecionada, nome);
}

export async function obterStatusImpressora(): Promise<StatusImpressora> {
  const impressoraSelecionada = await obterImpressoraSelecionada();
  return {
    suportado: true,
    conectado: qzTray.estaConectado(),
    impressoraSelecionada,
  };
}

/** Conecta ao QZ Tray (mostra o popup de confiança do próprio QZ Tray, se ainda não tiver sido concedido). */
export async function conectarQzTray(): Promise<StatusImpressora> {
  await qzTray.conectar();
  return obterStatusImpressora();
}

/**
 * Tenta conectar silenciosamente ao QZ Tray ao abrir o app — chamado
 * uma vez no `main.tsx`. Se o QZ Tray não estiver aberto ainda, falha
 * silenciosamente (o app segue normal, só sem impressão automática até
 * o operador conectar manualmente ou abrir o QZ Tray).
 */
export async function reconectarImpressoraAutorizada(): Promise<StatusImpressora> {
  try {
    await qzTray.conectar();
  } catch {
    // silencioso de propósito — ver comentário acima
  }
  return obterStatusImpressora();
}

export async function desconectarImpressora(): Promise<void> {
  await qzTray.desconectar();
}

/** Lista as impressoras que o Windows conhece, via QZ Tray — usado pra popular o seletor em Configurações. */
export async function listarImpressorasDisponiveis(): Promise<string[]> {
  return qzTray.listarImpressoras();
}

export interface OpcoesImpressao {
  cortarPapel?: boolean;
}

async function obterCortarPapelPadrao(): Promise<boolean> {
  const valor = await storage.get<boolean>(CONFIG_KEYS.impressoraCortarPapel);
  return valor ?? false;
}

export async function definirCortarPapel(ativo: boolean): Promise<void> {
  await storage.set(CONFIG_KEYS.impressoraCortarPapel, ativo);
}

export async function obterImprimirAutomaticamente(): Promise<boolean> {
  const valor = await storage.get<boolean>(CONFIG_KEYS.impressoraImprimirAutomaticamente);
  return valor ?? true;
}

export async function definirImprimirAutomaticamente(ativo: boolean): Promise<void> {
  await storage.set(CONFIG_KEYS.impressoraImprimirAutomaticamente, ativo);
}

export interface PreferenciasImpressora {
  cortarPapel: boolean;
  imprimirAutomaticamente: boolean;
  impressoraSelecionada?: string;
}

export async function obterPreferenciasImpressora(): Promise<PreferenciasImpressora> {
  const [cortarPapel, imprimirAutomaticamente, impressoraSelecionada] = await Promise.all([
    obterCortarPapelPadrao(),
    obterImprimirAutomaticamente(),
    obterImpressoraSelecionada(),
  ]);
  return { cortarPapel, imprimirAutomaticamente, impressoraSelecionada };
}

async function enviarBytes(bytes: Uint8Array): Promise<void> {
  const impressoraSelecionada = await obterImpressoraSelecionada();
  if (!impressoraSelecionada) {
    throw new Error(
      "Nenhuma impressora selecionada. Configure em Configurações → Impressora."
    );
  }
  await qzTray.imprimirBytes(impressoraSelecionada, bytes);
}

/**
 * Imprime o comprovante de um pedido. Lança um erro claro (sem nunca
 * mexer nos dados do pedido) se o QZ Tray não estiver rodando, a
 * impressora estiver desligada, ou nenhuma impressora tiver sido
 * selecionada — quem chama decide como mostrar isso ao usuário (a
 * venda já foi registrada no Supabase antes desta função ser chamada,
 * então uma falha aqui nunca "some" com o pedido).
 */
export async function imprimirPedido(pedido: Pedido, opcoes: OpcoesImpressao = {}): Promise<void> {
  const cortarPapel = opcoes.cortarPapel ?? (await obterCortarPapelPadrao());
  const bytes = montarReciboEscPos(pedido, { cortarPapel });
  await enviarBytes(bytes);
}

/** Imprime uma página de teste simples, para validar a conexão física. */
export async function imprimirTeste(): Promise<void> {
  const cortarPapel = await obterCortarPapelPadrao();
  const pedidoTeste: Pedido = {
    id: "teste-impressora",
    numero: 0,
    status: "finalizado",
    tipoConsumo: "balcao",
    itens: [
      {
        id: "item-teste",
        produtoId: "produto-teste",
        produtoNome: "Item de teste — acentuação ção ã é",
        quantidade: 1,
        precoUnitario: 0,
        subtotal: 0,
      },
    ],
    pagamentos: [{ id: "pagamento-teste", forma: "dinheiro", valor: 0, troco: 0, criadoEm: new Date().toISOString() }],
    subtotal: 0,
    desconto: 0,
    taxaEntrega: 0,
    total: 0,
    observacoes: "Impressão de teste — Goldensky SMX-JP58H (via QZ Tray)",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const bytes = montarReciboEscPos(pedidoTeste, { cortarPapel });
  await enviarBytes(bytes);
}
