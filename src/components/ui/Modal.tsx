import { useEffect, type ReactNode } from "react";
import { Icon } from "./Icon";
import { cn } from "@/utils/cn";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClassName?: string;
}

/**
 * Modal genérico usado pelos formulários de Categoria/Produto (e
 * reutilizável por outras telas no futuro). Fecha ao clicar fora, ao
 * apertar Esc, ou pelo botão de fechar.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  widthClassName = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "w-full rounded-xl border border-charcoal-700 bg-charcoal-900 shadow-card",
          widthClassName
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-charcoal-800 px-5 py-4">
          <h3 className="display-title text-base text-brand-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-charcoal-400 transition-colors hover:text-brand-white"
            aria-label="Fechar"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
