/**
 * Data/hora atual em ISO 8601, usada em todos os campos de auditoria
 * (`createdAt`, `updatedAt`, `criadoEm`...) para manter consistência.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
