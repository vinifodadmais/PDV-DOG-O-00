type ClassValue = string | number | null | boolean | undefined;

/**
 * Combina classes condicionalmente, sem depender de uma lib externa
 * (equivalente simplificado de `clsx`).
 *
 * Uso: cn("px-2", isActive && "bg-brand-red", disabled && "opacity-50")
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
