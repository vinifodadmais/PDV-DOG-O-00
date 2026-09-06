import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { PageId } from "@/types";

interface MainLayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  headerTitle: string;
  headerSubtitle?: string;
  children: ReactNode;
}

/**
 * Casca (shell) visual da aplicação: sidebar fixa à esquerda, header no
 * topo da área principal e o conteúdo da página atual abaixo dele.
 * Otimizado para notebooks em 1366x768 (sem depender de altura de viewport
 * maior que isso para ficar utilizável).
 */
export function MainLayout({
  activePage,
  onNavigate,
  headerTitle,
  headerSubtitle,
  children,
}: MainLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-charcoal-950 text-brand-white">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={headerTitle} subtitle={headerSubtitle} />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
