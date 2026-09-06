/**
 * Construtor minimalista de comandos ESC/POS, em bytes puros — sem
 * nenhuma biblioteca externa (o protocolo é só uma sequência de bytes,
 * não precisa de dependência para isso).
 *
 * Cobre o subconjunto de comandos que praticamente toda impressora
 * térmica ESC/POS de 58mm entende: inicializar, alinhar, negrito,
 * texto, avançar papel e cortar. Isso é o "mínimo denominador comum"
 * do protocolo — não depende de recursos avançados/proprietários que a
 * Goldensky SMX-JP58H pode ou não ter.
 *
 * IMPORTANTE sobre acentos: impressoras ESC/POS trabalham com uma
 * única página de código (não UTF-8). Aqui o texto é convertido para
 * bytes Latin-1/ISO-8859-1 (que cobre á, é, í, ó, ú, ã, õ, â, ê, ô, ç e
 * maiúsculas — os caracteres usados em português) e, opcionalmente, é
 * enviado um comando para selecionar uma página de código compatível.
 * Qual página de código a impressora realmente usa depende do firmware
 * dela — isso só se confirma testando na impressora física (ver
 * `selecionarPaginaDeCodigo` abaixo).
 */

const ESC = 0x1b;
const GS = 0x1d;

export type Alinhamento = "esquerda" | "centro" | "direita";

/**
 * Converte uma string para bytes Latin-1 (ISO-8859-1). Caracteres fora
 * da faixa 0x00–0xFF (emojis etc.) viram "?" em vez de quebrar a
 * impressão.
 *
 * O espaço não-quebrável (U+00A0) — que o `Intl.NumberFormat` do
 * JavaScript insere entre "R$" e o valor em `pt-BR` — é normalizado
 * para um espaço comum (0x20) antes de converter. Isso é proposital:
 * o byte 0xA0 tem significados DIFERENTES em páginas de código
 * diferentes (pode virar uma letra acentuada em vez de um espaço em
 * algumas tabelas), enquanto 0x20 é sempre um espaço em qualquer
 * página de código — mais seguro para uma impressora cuja tabela
 * exata não temos como confirmar sem o hardware físico.
 */
function paraBytesLatin1(texto: string): number[] {
  const bytes: number[] = [];
  for (const char of texto.replace(/\u00a0/g, " ")) {
    const codigo = char.codePointAt(0) ?? 63;
    bytes.push(codigo <= 0xff ? codigo : 63); // 63 = "?"
  }
  return bytes;
}

export class ImpressoraEscPosBuilder {
  private bytes: number[] = [];

  /** ESC @ — reseta a impressora para o estado inicial. */
  inicializar(): this {
    this.bytes.push(ESC, 0x40);
    return this;
  }

  /**
   * ESC t n — seleciona a página de código. O valor padrão (16 = WPC1252
   * / Windows Latin-1, em várias implementações ESC/POS comuns) é o
   * palpite mais seguro para acentuação em português, mas **precisa ser
   * confirmado na impressora física** — se os acentos saírem errados no
   * teste real, troque `n` para um dos outros valores comuns.
   *
   * Valores comuns em impressoras ESC/POS genéricas (isso varia por
   * fabricante/firmware — não há como confirmar sem testar):
   *   0  = PC437 (EUA) — NÃO tem acentos portugueses corretos
   *   2  = PC850 (Multilingual/Latin-1) — geralmente funciona bem
   *   16 = WPC1252 (Windows Latin-1) — geralmente funciona bem
   *   32 = PC860 (Português) — se disponível, é a mais "certa"
   */
  selecionarPaginaDeCodigo(n = 16): this {
    this.bytes.push(ESC, 0x74, n);
    return this;
  }

  alinhar(alinhamento: Alinhamento): this {
    const codigo = alinhamento === "esquerda" ? 0 : alinhamento === "centro" ? 1 : 2;
    this.bytes.push(ESC, 0x61, codigo);
    return this;
  }

  negrito(ativo: boolean): this {
    this.bytes.push(ESC, 0x45, ativo ? 1 : 0);
    return this;
  }

  /** Fonte em tamanho duplo (largura e altura) — útil para destacar o total. */
  tamanhoDuplo(ativo: boolean): this {
    this.bytes.push(GS, 0x21, ativo ? 0x11 : 0x00);
    return this;
  }

  /** Escreve uma linha de texto (com quebra de linha ao final). */
  texto(linha: string): this {
    this.bytes.push(...paraBytesLatin1(linha));
    this.bytes.push(0x0a); // LF
    return this;
  }

  /** Avança papel em branco (sem cortar). */
  avancarLinhas(quantidade = 1): this {
    for (let i = 0; i < quantidade; i++) this.bytes.push(0x0a);
    return this;
  }

  /**
   * GS V — corta o papel (corte total). Só deve ser chamado se a
   * impressora realmente tiver guilhotina — muitas impressoras
   * portáteis/pequenas de 58mm não têm, e a maioria dos firmwares
   * apenas ignora o comando se não suportado (mas isso fica
   * configurável em Configurações → Impressora por segurança).
   */
  cortarPapel(): this {
    this.bytes.push(GS, 0x56, 0x00);
    return this;
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.bytes);
  }
}
