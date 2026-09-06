import type { EntityId, Timestamped } from "./common";

/**
 * Categoria de produtos do cardápio (ex: Cachorro-quente, Bebidas, Porções).
 */
export interface Categoria extends Timestamped {
  id: EntityId;
  nome: string;
  /** Cor (hex) usada para identificar a categoria visualmente. */
  cor: string;
  /** Define a ordem de exibição no cardápio. */
  ordem: number;
  ativo: boolean;
}
