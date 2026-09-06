import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { RequireAdmin } from "@/components/admin/RequireAdmin";
import { CategoriasAdminTab } from "@/components/admin/CategoriasAdminTab";
import { ProdutosAdminTab } from "@/components/admin/ProdutosAdminTab";
import { ImportarCardapioModal } from "@/components/admin/ImportarCardapioModal";

type Aba = "categorias" | "produtos";

export function AdminCardapio() {
  const [aba, setAba] = useState<Aba>("produtos");
  const [modalImportarAberto, setModalImportarAberto] = useState(false);
  // Só pra forçar as abas a recarregar a lista depois de uma importação
  // (elas já buscam os dados no próprio mount/useEffect).
  const [chaveRecarga, setChaveRecarga] = useState(0);

  return (
    <RequireAdmin>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAba("produtos")}
              className={
                aba === "produtos"
                  ? "rounded-md bg-charcoal-800 px-3 py-2 text-sm font-semibold text-brand-white"
                  : "rounded-md px-3 py-2 text-sm font-medium text-charcoal-400 hover:text-brand-white"
              }
            >
              Produtos
            </button>
            <button
              type="button"
              onClick={() => setAba("categorias")}
              className={
                aba === "categorias"
                  ? "rounded-md bg-charcoal-800 px-3 py-2 text-sm font-semibold text-brand-white"
                  : "rounded-md px-3 py-2 text-sm font-medium text-charcoal-400 hover:text-brand-white"
              }
            >
              Categorias
            </button>
          </div>

          <button
            type="button"
            onClick={() => setModalImportarAberto(true)}
            className="flex items-center gap-2 rounded-md border border-charcoal-700 px-3 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            <Icon name="box" size={16} />
            Importar cardápio local
          </button>
        </div>

        <p className="flex items-start gap-2 rounded-md border border-charcoal-800 bg-charcoal-900/40 px-3 py-2 text-xs text-charcoal-400">
          <Icon name="alert" size={14} className="mt-0.5 shrink-0 text-brand-mustard" />
          Este cardápio fica no Supabase — separado do que o PDV (tela Vendas) usa hoje, que
          continua lendo os dados salvos neste navegador. A sincronização entre os dois vem numa
          etapa futura.
        </p>

        <div key={chaveRecarga}>
          {aba === "produtos" ? <ProdutosAdminTab /> : <CategoriasAdminTab />}
        </div>

        <ImportarCardapioModal
          open={modalImportarAberto}
          onClose={() => setModalImportarAberto(false)}
          onImportado={() => setChaveRecarga((atual) => atual + 1)}
        />
      </div>
    </RequireAdmin>
  );
}
