/**
 * Declarações mínimas do pacote `qz-tray` — cobrem só a API que este
 * projeto usa. A biblioteca oficial não publica tipos TypeScript
 * próprios/completos por padrão, então declaramos aqui o subconjunto
 * necessário (mesmo padrão já usado para `@supabase/supabase-js` antes
 * dele ganhar tipos oficiais, e para a WebUSB quando ainda era usada).
 */
declare module "qz-tray" {
  interface QZWebsocket {
    connect(options?: Record<string, unknown>): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }

  interface QZSecurity {
    setCertificatePromise(
      promiseGen: (resolve: (value?: unknown) => void, reject: (reason?: unknown) => void) => void
    ): void;
    setSignaturePromise(
      signer: (
        toSign: string
      ) => (resolve: (value?: unknown) => void, reject: (reason?: unknown) => void) => void
    ): void;
  }

  interface QZPrinters {
    find(query?: string): Promise<string | string[]>;
    getDefault(): Promise<string>;
  }

  interface QZPrintDataRaw {
    type: "raw";
    format: "command" | "hex" | "base64" | "plain" | "file" | "image" | "xml";
    data: string;
    options?: Record<string, unknown>;
  }

  // Objeto opaco retornado por qz.configs.create — só repassamos pra qz.print().
  type QZConfig = unknown;

  interface QZConfigs {
    create(printer: string, options?: Record<string, unknown>): QZConfig;
  }

  interface QZ {
    websocket: QZWebsocket;
    security: QZSecurity;
    printers: QZPrinters;
    configs: QZConfigs;
    print(config: QZConfig, data: QZPrintDataRaw[]): Promise<void>;
  }

  const qz: QZ;
  export default qz;
}
