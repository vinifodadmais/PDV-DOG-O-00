import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/types";

interface DashboardCardProps {
  icon: IconName;
  title: string;
  children: ReactNode;
}

export function DashboardCard({ icon, title, children }: DashboardCardProps) {
  return (
    <div className="rounded-lg border border-charcoal-800 bg-charcoal-900 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon name={icon} size={16} className="text-brand-mustard" />
        <h3 className="text-sm font-semibold text-brand-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}
