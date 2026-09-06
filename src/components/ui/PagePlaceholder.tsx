import type { IconName } from "@/types";
import { Icon } from "./Icon";

interface PagePlaceholderProps {
  icon: IconName;
  title: string;
  description: string;
}

/**
 * Placeholder usado pelas páginas nesta etapa do projeto (fundação).
 * Será substituído pelo conteúdo real de cada página nas próximas etapas.
 */
export function PagePlaceholder({
  icon,
  title,
  description,
}: PagePlaceholderProps) {
  return (
    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-charcoal-700 bg-charcoal-900/40 px-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-charcoal-800 text-brand-mustard">
        <Icon name={icon} size={26} />
      </div>
      <h2 className="display-title mb-2 text-lg text-brand-white">
        {title}
      </h2>
      <p className="max-w-sm text-sm text-charcoal-400">{description}</p>
      <span className="mt-4 rounded-full border border-charcoal-700 px-3 py-1 text-[11px] uppercase tracking-widest text-charcoal-400">
        Em construção
      </span>
    </div>
  );
}
