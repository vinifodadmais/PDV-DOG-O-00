import { cn } from "@/utils/cn";

interface LogoProps {
  /** "full" mostra o nome completo; "mark" mostra só o emblema (sidebar recolhida). */
  variant?: "full" | "mark";
  className?: string;
}

/**
 * Marca do Dogão da Praça: emblema vermelho/mostarda inspirado em placa
 * de trailer de lanche, mais o nome em tipografia condensada.
 */
export function Logo({ variant = "full", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-red shadow-card"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12c0-4.5 4-8 9-8s9 3.5 9 8-4 6-9 6-9-1.5-9-6Z"
            fill="#F5B301"
          />
          <path
            d="M6.5 10.5c3-2 8-2 11 0"
            stroke="#B4121F"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {variant === "full" && (
        <div className="leading-none">
          <p className="display-title text-lg text-brand-white">Dogão</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-mustard">
            da Praça
          </p>
        </div>
      )}
    </div>
  );
}
