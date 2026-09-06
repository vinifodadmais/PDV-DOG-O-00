import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ProdutoFormModal, type ProdutoFormValues } from "./ProdutoFormModal";
import {
  atualizarProduto,
  criarProduto,
  excluirProduto,
  listarCategorias,
  listarProdutos,
} from "@/services";
import { formatarMoeda } from "@/utils/currency";
import type { Categoria, Produto } from "@/types";

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

export function ProdutosTab() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const [listaProdutos, listaCategorias] = await Promise.all([
      listarProdutos(),
      listarCategorias(),
    ]);
    setProdutos(listaProdutos);
    setCategorias(listaCategorias);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriasPorId = useMemo(() => {
    const mapa = new Map<string, Categoria>();
    categorias.forEach((categoria) => mapa.set(categoria.id, categoria));
    return mapa;
  }, [categorias]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos
      .filter((produto) => {
        const combinaCategoria =
          categoriaFiltro === "todas" || produto.categoriaId === categoriaFiltro;
        const combinaBusca =
          termo.length === 0 ||
          produto.nome.toLowerCase().includes(termo) ||
          (produto.descricao?.toLowerCase().includes(termo) ?? false);
        return combinaCategoria && combinaBusca;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [produtos, busca, categoriaFiltro]);

  function abrirNovo() {
    setProdutoEmEdicao(null);
    setErro(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEmEdicao(produto);
    setErro(null);
    setModalAberto(true);
  }

  async function handleSalvar(valores: ProdutoFormValues) {
    if (produtoEmEdicao) {
      await atualizarProduto(produtoEmEdicao.id, valores);
    } else {
      await criarProduto(valores);
    }
    setModalAberto(false);
    await carregar();
  }

  async function handleExcluir(produto: Produto) {
    const confirmado = window.confirm(
      `Excluir o produto "${produto.nome}"? Essa ação não pode ser desfeita.`
    );
    if (!confirmado) return;

    setErro(null);
    try {
      await excluirProduto(produto.id);
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível excluir o produto."
      );
    }
  }

  async function handleAlternarAtivo(produto: Produto) {
    await atualizarProduto(produto.id, { ativo: !produto.ativo });
    await carregar();
  }

  const categoriaFiltroAtualId =
    categoriaFiltro !== "todas" ? categoriaFiltro : categorias[0]?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500"
            />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Pesquisar produto..."
              className={`${inputClassName} pl-9 pr-3`}
            />
          </div>

          <select
            value={categoriaFiltro}
            onChange={(event) => setCategoriaFiltro(event.target.value)}
            className={`${inputClassName} max-w-[220px] px-3`}
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={abrirNovo}
          disabled={categorias.length === 0}
          className="flex items-center gap-2 rounded-md bg-brand-red px-3 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
          title={
            categorias.length === 0
              ? "Cadastre uma categoria antes de criar produtos"
              : undefined
          }
        >
          <Icon name="plus" size={16} />
          Novo Produto
        </button>
      </div>

      {erro && (
        <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red-light">
          <Icon name="alert" size={16} className="shrink-0" />
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-charcoal-400">Carregando produtos...</p>
      ) : produtosFiltrados.length === 0 ? (
        <p className="text-sm text-charcoal-400">
          {produtos.length === 0
            ? "Nenhum produto cadastrado ainda."
            : "Nenhum produto encontrado para esse filtro."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-charcoal-800 bg-charcoal-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal-800 text-xs uppercase tracking-wide text-charcoal-400">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Custo</th>
                <th className="px-4 py-3 font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800">
              {produtosFiltrados.map((produto) => {
                const categoria = categoriasPorId.get(produto.categoriaId);
                const estoqueBaixo = produto.estoqueAtual <= produto.estoqueMinimo;

                return (
                  <tr key={produto.id} className="align-middle">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-charcoal-800 bg-charcoal-800">
                          {produto.imagemUrl ? (
                            <img
                              src={produto.imagemUrl}
                              alt={produto.nome}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon name="image" size={16} className="text-charcoal-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-brand-white">{produto.nome}</p>
                          {produto.descricao && (
                            <p className="max-w-xs truncate text-xs text-charcoal-400">
                              {produto.descricao}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {categoria ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-300">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: categoria.cor }}
                            aria-hidden="true"
                          />
                          {categoria.nome}
                        </span>
                      ) : (
                        <span className="text-xs text-charcoal-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-brand-white">
                      {formatarMoeda(produto.preco)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-charcoal-400">
                      {produto.custo !== undefined ? formatarMoeda(produto.custo) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      <span className={estoqueBaixo ? "font-semibold text-brand-red-light" : "text-charcoal-200"}>
                        {produto.estoqueAtual} {produto.unidade}
                      </span>
                      {estoqueBaixo && (
                        <span className="ml-1 text-[10px] uppercase tracking-wide text-brand-red-light">
                          baixo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleAlternarAtivo(produto)}
                        className={
                          produto.ativo
                            ? "rounded-full border border-brand-mustard/40 bg-brand-mustard/10 px-2.5 py-1 text-xs font-medium text-brand-mustard"
                            : "rounded-full border border-charcoal-700 px-2.5 py-1 text-xs font-medium text-charcoal-400"
                        }
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(produto)}
                          className="rounded p-1.5 text-charcoal-400 transition-colors hover:text-brand-mustard"
                          aria-label={`Editar ${produto.nome}`}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluir(produto)}
                          className="rounded p-1.5 text-charcoal-400 transition-colors hover:text-brand-red"
                          aria-label={`Excluir ${produto.nome}`}
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProdutoFormModal
        open={modalAberto}
        produto={produtoEmEdicao}
        categorias={categorias}
        categoriaPadraoId={categoriaFiltroAtualId}
        onClose={() => setModalAberto(false)}
        onSalvar={handleSalvar}
      />
    </div>
  );
}
