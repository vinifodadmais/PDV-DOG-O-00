import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Proteção de UX (esconder a tela/opção pra quem não é admin) — a
 * segurança de verdade é o RLS do Supabase, que rejeita qualquer
 * INSERT/UPDATE em `categories`/`products` que não venha de um usuário
 * com role = 'admin', mesmo que alguém burle esta tela.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, profile } = useAuth();

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-charcoal-700 bg-charcoal-900/40 px-8 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-charcoal-800 text-brand-red-light">
          <Icon name="alert" size={26} />
        </div>
        <h2 className="display-title text-lg text-brand-white">Acesso restrito</h2>
        <p className="max-w-sm text-sm text-charcoal-400">
          Esta área é exclusiva para administradores.{" "}
          {profile ? `Seu usuário (${profile.name || profile.role}) não tem essa permissão.` : ""}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
