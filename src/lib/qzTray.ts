import qz from "qz-tray";
import { KEYUTIL, KJUR, hextob64 } from "jsrsasign";
import { QZ_CERTIFICADO_PEM, QZ_CHAVE_PRIVADA_PEM } from "./qzTrayCredenciais";

/**
 * ============================================================================
 * Cliente QZ Tray — camada mais baixa (só fala com a biblioteca `qz-tray`,
 * sem saber nada sobre pedidos/recibos/ESC-POS específicos do domínio).
 * ============================================================================
 *
 * COMO FUNCIONA: o QZ Tray é um aplicativo instalado no Windows (fora do
 * navegador) que fica rodando em segundo plano (ícone na bandeja) e abre
 * um servidor WebSocket local (`wss://localhost:8181`, com fallback
 * `ws://localhost:8182`). A biblioteca `qz-tray` conecta nesse WebSocket
 * e manda comandos — inclusive impressão RAW/ESC-POS direto pra
 * impressora, sem passar pela fila de impressão do Windows nem abrir
 * nenhuma janela.
 *
 * Isso resolve o problema que a WebUSB tinha: a POS-58 pode continuar
 * instalada normalmente como impressora do Windows (driver POS-58
 * 11.3.0.1) — o QZ Tray imprime através do próprio sistema de
 * impressão do SO nos bastidores, então não compete com o driver pela
 * porta USB da forma que a WebUSB competia.
 *
 * ASSINATURA/CONFIANÇA: esta implementação usa um certificado
 * autoassinado próprio (`qzTrayCredenciais.ts`), gerado uma única vez
 * pra este projeto — não é um certificado de terceiro pago, e não
 * precisa ser. É isso que dá ao QZ Tray uma identidade ESTÁVEL pra
 * reconhecer este PDV: da primeira vez, o QZ Tray mostra um popup
 * próprio perguntando se confia no certificado — o operador clica
 * "Allow"/"Permitir" e marca "lembrar esta decisão". Da segunda venda
 * em diante, a impressão acontece automaticamente, sem novo popup.
 * (Antes desta correção, a conexão era "não assinada" — sem
 * certificado, o QZ Tray não tinha como diferenciar "esta aba
 * específica" de "qualquer site sem certificado", e marcar "lembrar"
 * acabava bloqueando silenciosamente as tentativas seguintes, em vez
 * de permitir.)
 */

function configurarSeguranca(): void {
  // Certificado real (autoassinado) — dá ao QZ Tray uma identidade
  // ESTÁVEL pra reconhecer este PDV. Sem isso, "não perguntar
  // novamente" não tem o que lembrar de verdade (ver explicação em
  // `qzTrayCredenciais.ts`) e o QZ Tray acaba bloqueando silenciosamente
  // as próximas tentativas em vez de permitir.
  qz.security.setCertificatePromise((resolve) => resolve(QZ_CERTIFICADO_PEM));

  // Cada requisição precisa ser assinada com a chave privada
  // correspondente — é essa assinatura que PROVA ao QZ Tray que quem
  // está chamando é realmente o dono do certificado acima, não alguém
  // só alegando ser.
  qz.security.setSignaturePromise((toSign) => (resolve, reject) => {
    try {
      const chavePrivada = KEYUTIL.getKey(QZ_CHAVE_PRIVADA_PEM);
      const assinatura = new KJUR.crypto.Signature({ alg: "SHA512withRSA" });
      assinatura.init(chavePrivada);
      assinatura.updateString(toSign);
      const assinaturaHex = assinatura.sign();
      resolve(hextob64(assinaturaHex));
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Falha ao assinar requisição do QZ Tray."));
    }
  });
}

let seguracaConfigurada = false;

function garantirSeguranca(): void {
  if (!seguracaConfigurada) {
    configurarSeguranca();
    seguracaConfigurada = true;
  }
}

/** Já existe uma conexão ativa com o QZ Tray agora? (não tenta conectar) */
export function estaConectado(): boolean {
  try {
    return qz.websocket.isActive();
  } catch {
    return false;
  }
}

/**
 * Conecta ao QZ Tray (idempotente — se já estiver conectado, não faz
 * nada). Lança um erro claro se o QZ Tray não estiver aberto no
 * computador.
 */
export async function conectar(): Promise<void> {
  if (estaConectado()) return;
  garantirSeguranca();
  try {
    await qz.websocket.connect();
  } catch (error) {
    throw new Error(
      "Não foi possível conectar ao QZ Tray. Verifique se o QZ Tray está instalado e aberto " +
        "(procure o ícone dele na bandeja do Windows, perto do relógio). " +
        (error instanceof Error ? `Detalhe técnico: ${error.message}` : "")
    );
  }
}

export async function desconectar(): Promise<void> {
  if (!estaConectado()) return;
  try {
    await qz.websocket.disconnect();
  } catch {
    // ignora — objetivo é só encerrar a sessão local
  }
}

/** Lista os nomes das impressoras que o Windows conhece, via QZ Tray. */
export async function listarImpressoras(): Promise<string[]> {
  await conectar();
  const resultado = await qz.printers.find();
  return Array.isArray(resultado) ? resultado : [resultado];
}

function uint8ArrayParaBase64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

/**
 * Envia bytes ESC/POS crus (RAW) pra impressora indicada — nunca como
 * HTML/página comum, e nunca passando pela caixa de diálogo de
 * impressão do Windows. `format: "base64"` é o jeito seguro de mandar
 * bytes binários arbitrários (0x00–0xFF) sem risco de um caractere
 * "quebrar" no meio do caminho.
 */
export async function imprimirBytes(nomeImpressora: string, bytes: Uint8Array): Promise<void> {
  await conectar();
  const config = qz.configs.create(nomeImpressora);
  const dados = [{ type: "raw" as const, format: "base64" as const, data: uint8ArrayParaBase64(bytes) }];
  await qz.print(config, dados);
}
