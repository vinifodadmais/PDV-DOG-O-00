import type { IconName } from "@/types";
import { Icon } from "./Icon";

interface StatCardProps {
  icon: IconName;
  label: string;
  value: number | string;
}

export function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-charcoal-800 bg-charcoal-900 px-4 py-3 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-charcoal-800 text-brand-mustard">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <p className="text-xl font-bold leading-none text-brand-white tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-xs text-charcoal-400">{label}</p>
      </div>
    </div>
  );
}
