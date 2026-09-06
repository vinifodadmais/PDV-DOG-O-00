import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Produtos } from "@/pages/Produtos";
import { Vendas } from "@/pages/Vendas";
import { Pedidos } from "@/pages/Pedidos";
import { Estoque } from "@/pages/Estoque";
import { Caixa } from "@/pages/Caixa";
import { Configuracoes } from "@/pages/Configuracoes";
import { AdminCardapio } from "@/pages/admin/AdminCardapio";
import type { PageId } from "@/types";

const PAGE_META: Record<PageId, { title: string; subtitle: string }> = {
  inicio: { title: "Início", subtitle: "Visão geral do dia" },
  produtos: { title: "Produtos", subtitle: "Cardápio e categorias" },
  vendas: { title: "Vendas", subtitle: "Registro de pedidos" },
  pedidos: { title: "Pedidos", subtitle: "Acompanhamento e status" },
  estoque: { title: "Estoque", subtitle: "Ingredientes e produtos" },
  caixa: { title: "Caixa", subtitle: "Abertura e fechamento" },
  configuracoes: { title: "Configurações", subtitle: "Preferências do sistema" },
  "admin-cardapio": { title: "Cardápio (Admin)", subtitle: "Categorias e produtos no Supabase" },
};

/**
 * Navegação simples via estado local, sem biblioteca de rotas.
 * Suficiente para um PDV de uso particular rodando localmente, sem
 * necessidade de URLs profundas ou histórico de navegador.
 */
function App() {
  const [activePage, setActivePage] = useState<PageId>("inicio");

  const pageContent = useMemo(() => {
    switch (activePage) {
      case "inicio":
        return <Dashboard />;
      case "produtos":
        return <Produtos />;
      case "vendas":
        return <Vendas />;
      case "pedidos":
        return <Pedidos />;
      case "estoque":
        return <Estoque />;
      case "caixa":
        return <Caixa />;
      case "configuracoes":
        return <Configuracoes />;
      case "admin-cardapio":
        return <AdminCardapio />;
    }
  }, [activePage]);

  const meta = PAGE_META[activePage];

  return (
    <MainLayout
      activePage={activePage}
      onNavigate={setActivePage}
      headerTitle={meta.title}
      headerSubtitle={meta.subtitle}
    >
      {pageContent}
    </MainLayout>
  );
}

export default App;
