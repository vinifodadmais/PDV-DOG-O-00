/**
 * Gera um identificador único. Usa `crypto.randomUUID()` quando disponível
 * (navegadores modernos e Node recente); cai para um fallback simples
 * caso contrário. Evita depender de uma biblioteca externa como `uuid`.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
