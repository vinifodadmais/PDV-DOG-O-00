/**
 * Ponto único de acesso à camada de persistência. Componentes, hooks e
 * services devem importar tudo que precisam a partir deste arquivo
 * (`@/storage`) — nunca de `window.localStorage` diretamente, e nunca
 * dos arquivos internos de `storage/` um a um.
 */
export type { StorageAdapter } from "./StorageAdapter";
export { storage } from "./instance";

export type { Repository } from "./Repository";
export { createLocalRepository } from "./createLocalRepository";

export { COLLECTIONS, CONFIG_KEYS } from "./collections";
export {
  proximoNumeroSequencial,
  obterNumeroSequencialAtual,
} from "./sequences";

export {
  categoriaRepository,
  produtoRepository,
  pedidoRepository,
  sessaoCaixaRepository,
  movimentacaoCaixaRepository,
  movimentacaoEstoqueRepository,
} from "./repositories";

export { ensureSeeded, popularDadosDemonstracao } from "./seed";
