/**
 * Declarações mínimas do pacote `jsrsasign` — cobrem só a API usada
 * neste projeto (carregar chave privada PEM, assinar com RSA/SHA-512,
 * converter hex->base64). O pacote não publica tipos TypeScript
 * próprios por padrão.
 */
declare module "jsrsasign" {
  export interface RSAKey {
    // Objeto opaco — só repassamos entre KEYUTIL.getKey() e Signature.init().
  }

  export const KEYUTIL: {
    getKey(pem: string): RSAKey;
  };

  export namespace KJUR {
    namespace crypto {
      class Signature {
        constructor(params: { alg: string });
        init(key: RSAKey): void;
        updateString(text: string): void;
        sign(): string;
      }
    }
  }

  export function hextob64(hex: string): string;
}
