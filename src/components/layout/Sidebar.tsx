import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/utils/cn";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem, PageId } from "@/types";

const NAV_ITEMS: NavItem[] = [
  { id: "inicio", label: "Início", icon: "home" },
  { id: "produtos", label: "Produtos", icon: "tag" },
  { id: "vendas", label: "Vendas", icon: "sale" },
  { id: "pedidos", label: "Pedidos", icon: "receipt" },
  { id: "estoque", label: "Estoque", icon: "box" },
  { id: "caixa", label: "Caixa", icon: "cash" },
  { id: "configuracoes", label: "Configurações", icon: "settings" },
];

const NAV_ITEM_ADMIN: NavItem = { id: "admin-cardapio", label: "Cardápio (Admin)", icon: "shield" };

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { profile, isAdmin, sair } = useAuth();
  const itensNavegacao = isAdmin ? [...NAV_ITEMS, NAV_ITEM_ADMIN] : NAV_ITEMS;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-charcoal-800 bg-charcoal-900">
      <div className="flex h-16 items-center border-b border-charcoal-800 px-4">
        <Logo />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-charcoal-400">
          Navegação
        </p>
        <ul className="space-y-1">
          {itensNavegacao.map((item) => {
            const isActive = item.id === activePage;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-brand-mustard bg-charcoal-800 text-brand-white"
                      : "border-transparent text-charcoal-300 hover:bg-charcoal-800/60 hover:text-brand-white"
                  )}
                >
                  <Icon
                    name={item.icon}
                    size={18}
                    className={cn(
                      isActive
                        ? "text-brand-mustard"
                        : "text-charcoal-400 group-hover:text-brand-mustard"
                    )}
                  />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-charcoal-800 px-4 py-3">
        <p className="text-[11px] text-charcoal-400">
          Dogão da Praça · PDV local
        </p>
        <p className="text-[11px] text-charcoal-500">v0.1.0 — fundação</p>

        {profile && (
          <div className="mt-2.5 flex items-center justify-between border-t border-charcoal-800 pt-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-brand-white">
                {profile.name || "Sem nome"}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-charcoal-500">
                {profile.role === "admin" ? "Administrador" : "Operador"}
              </p>
            </div>
            <button
              type="button"
              onClick={sair}
              className="shrink-0 rounded-md border border-charcoal-700 px-2 py-1 text-[11px] font-medium text-charcoal-300 transition-colors hover:border-brand-red hover:text-brand-red-light"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
