import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  CategoriaFormModal,
  type CategoriaFormValues,
} from "@/components/produtos/CategoriaFormModal";
import {
  atualizarCategoriaAdmin,
  criarCategoriaAdmin,
  listarCategoriasAdmin,
  moverCategoriaAdmin,
} from "@/services/admin/categoriaAdminService";
import type { Categoria } from "@/types";

export function CategoriasAdminTab() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaEmEdicao, setCategoriaEmEdicao] = useState<Categoria | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      setCategorias(await listarCategoriasAdmin());
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar as categorias.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNova() {
    setCategoriaEmEdicao(null);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(categoria: Categoria) {
    setCategoriaEmEdicao(categoria);
    setErro(null);
    setModalAberto(true);
  }

  async function handleSalvar(valores: CategoriaFormValues) {
    if (categoriaEmEdicao) {
      await atualizarCategoriaAdmin(categoriaEmEdicao.id, valores);
    } else {
      await criarCategoriaAdmin(valores);
    }
    setModalAberto(false);
    await carregar();
  }

  async function handleAlternarAtivo(categoria: Categoria) {
    setErro(null);
    try {
      await atualizarCategoriaAdmin(categoria.id, { ativo: !categoria.ativo });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar a categoria.");
    }
  }

  async function handleMover(categoria: Categoria, direcao: "up" | "down") {
    await moverCategoriaAdmin(categoria.id, direcao);
    await carregar();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal-400">
          {categorias.length} categoria{categorias.length === 1 ? "" : "s"} no Supabase
        </p>
        <button
          type="button"
          onClick={abrirNova}
          className="flex items-center gap-2 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark"
        >
          <Icon name="plus" size={16} />
          Nova Categoria
        </button>
      </div>

      {erro && (
        <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red-light">
          <Icon name="alert" size={16} className="shrink-0" />
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-charcoal-400">Carregando categorias...</p>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-charcoal-400">
          Nenhuma categoria no Supabase ainda. Use "Importar cardápio local" abaixo, ou crie uma nova.
        </p>
      ) : (
        <ul className="divide-y divide-charcoal-800 rounded-lg border border-charcoal-800 bg-charcoal-900">
          {categorias.map((categoria, index) => (
            <li
              key={categoria.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: categoria.cor }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-medium text-brand-white">{categoria.nome}</p>
                  <p className="text-xs text-charcoal-400">
                    {categoria.ativo ? "Ativa" : "Inativa"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMover(categoria, "up")}
                  disabled={index === 0}
                  className="rounded p-1.5 text-charcoal-400 transition-colors hover:text-brand-white disabled:pointer-events-none disabled:opacity-25"
                  aria-label="Mover para cima"
                >
                  <Icon name="chevronUp" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMover(categoria, "down")}
                  disabled={index === categorias.length - 1}
                  className="rounded p-1.5 text-charcoal-400 transition-colors hover:text-brand-white disabled:pointer-events-none disabled:opacity-25"
                  aria-label="Mover para baixo"
                >
                  <Icon name="chevronDown" size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlternarAtivo(categoria)}
                  className="rounded-md border border-charcoal-700 px-2.5 py-1 text-xs font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
                >
                  {categoria.ativo ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => abrirEdicao(categoria)}
                  className="rounded p-1.5 text-charcoal-400 transition-colors hover:text-brand-mustard"
                  aria-label={`Editar ${categoria.nome}`}
                >
                  <Icon name="edit" size={16} />
                </button>
                {/* Sem botão de excluir de propósito — exclusão física não é
                    exposta aqui, só ativar/desativar (pedido explícito). */}
              </div>
            </li>
          ))}
        </ul>
      )}

      <CategoriaFormModal
        open={modalAberto}
        categoria={categoriaEmEdicao}
        onClose={() => setModalAberto(false)}
        onSalvar={handleSalvar}
      />
    </div>
  );
}
