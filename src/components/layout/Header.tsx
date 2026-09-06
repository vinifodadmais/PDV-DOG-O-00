import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Header({ title, subtitle }: HeaderProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-charcoal-800 bg-charcoal-900/60 px-6">
      <div>
        <h1 className="display-title text-xl text-brand-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-charcoal-400">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-1.5 text-sm text-charcoal-300">
        <Icon name="clock" size={16} className="text-brand-mustard" />
        <span className="tabular-nums">{formatClock(now)}</span>
      </div>
    </header>
  );
}
