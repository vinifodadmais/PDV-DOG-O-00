/**
 * Identificador único genérico usado por todas as entidades persistidas.
 */
export type EntityId = string;

/**
 * Campos de auditoria comuns a toda entidade gravada no storage.
 */
export interface Timestamped {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
