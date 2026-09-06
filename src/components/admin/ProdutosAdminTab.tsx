import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import {
  ProdutoFormModal,
  type ProdutoFormValues,
} from "@/components/produtos/ProdutoFormModal";
import {
  atualizarPrecoProdutoAdmin,
  atualizarProdutoAdmin,
  criarProdutoAdmin,
  listarProdutosAdmin,
} from "@/services/admin/produtoAdminService";
import { listarCategoriasAdmin } from "@/services/admin/categoriaAdminService";
import { formatarMoeda } from "@/utils/currency";
import type { Categoria, Produto } from "@/types";

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

interface PrecoInlineEditProps {
  produto: Produto;
  onSalvo: () => void;
}

/** Clique no preço -> vira campo editável -> Enter/✓ salva direto no Supabase. */
function PrecoInlineEdit({ produto, onSalvo }: PrecoInlineEditProps) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(produto.preco));
  const [salvando, setSalvando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  useEffect(() => {
    setValor(String(produto.preco));
  }, [produto.preco]);

  function cancelar() {
    setEditando(false);
    setValor(String(produto.preco));
    setErroLocal(null);
  }

  async function salvar() {
    const novoPreco = Number(valor.replace(",", "."));
    if (!Number.isFinite(novoPreco) || novoPreco < 0) {
      setErroLocal("Preço inválido.");
      return;
    }
    if (novoPreco === produto.preco) {
      setEditando(false);
      return;
    }
    setSalvando(true);
    setErroLocal(null);
    try {
      await atualizarPrecoProdutoAdmin(produto.id, novoPreco);
      setEditando(false);
      onSalvo();
    } catch (error) {
      setErroLocal(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        className="rounded px-1.5 py-0.5 text-sm font-medium tabular-nums text-brand-white transition-colors hover:bg-charcoal-800 hover:text-brand-mustard"
        title="Clique para editar o preço"
      >
        {formatarMoeda(produto.preco)}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="0.01"
          min="0"
          autoFocus
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") salvar();
            if (event.key === "Escape") cancelar();
          }}
          disabled={salvando}
          className="w-24 rounded border border-brand-mustard bg-charcoal-800 px-2 py-1 text-sm tabular-nums text-brand-white focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="rounded p-1 text-brand-mustard transition-colors hover:text-brand-white disabled:opacity-50"
          aria-label="Salvar preço"
        >
          <Icon name="check" size={14} />
        </button>
        <button
          type="button"
          onClick={cancelar}
          disabled={salvando}
          className="rounded p-1 text-charcoal-400 transition-colors hover:text-brand-white disabled:opacity-50"
          aria-label="Cancelar edição de preço"
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {erroLocal && <span className="text-[11px] text-brand-red-light">{erroLocal}</span>}
    </div>
  );
}

export function ProdutosAdminTab() {
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
    setErro(null);
    try {
      const [listaProdutos, listaCategorias] = await Promise.all([
        listarProdutosAdmin(),
        listarCategoriasAdmin(),
      ]);
      setProdutos(listaProdutos);
      setCategorias(listaCategorias);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar os produtos.");
    } finally {
      setCarregando(false);
    }
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
      await atualizarProdutoAdmin(produtoEmEdicao.id, valores);
    } else {
      await criarProdutoAdmin(valores);
    }
    setModalAberto(false);
    await carregar();
  }

  async function handleAlternarAtivo(produto: Produto) {
    setErro(null);
    try {
      await atualizarProdutoAdmin(produto.id, { ativo: !produto.ativo });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar o produto.");
    }
  }

  const categoriaFiltroAtualId = categoriaFiltro !== "todas" ? categoriaFiltro : categorias[0]?.id;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500"
            />
            <input
              type="text"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Localizar produto..."
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
              ? "Crie uma categoria antes de criar produtos"
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
            ? 'Nenhum produto no Supabase ainda. Use "Importar cardápio local" abaixo, ou crie um novo.'
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
                      <p className="font-medium text-brand-white">{produto.nome}</p>
                      {produto.descricao && (
                        <p className="max-w-xs truncate text-xs text-charcoal-400">
                          {produto.descricao}
                        </p>
                      )}
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
                    <td className="px-4 py-3">
                      <PrecoInlineEdit produto={produto} onSalvo={carregar} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          estoqueBaixo
                            ? "text-xs font-medium text-brand-red-light"
                            : "text-xs text-charcoal-300"
                        }
                      >
                        {produto.estoqueAtual} {produto.unidade}
                        {estoqueBaixo && " · baixo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          produto.ativo
                            ? "rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400"
                            : "rounded-full bg-charcoal-800 px-2 py-0.5 text-xs font-medium text-charcoal-400"
                        }
                      >
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleAlternarAtivo(produto)}
                          className="rounded-md border border-charcoal-700 px-2.5 py-1 text-xs font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
                        >
                          {produto.ativo ? "Desativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEdicao(produto)}
                          className="rounded p-1.5 text-charcoal-400 transition-colors hover:text-brand-mustard"
                          aria-label={`Editar ${produto.nome}`}
                        >
                          <Icon name="edit" size={16} />
                        </button>
                        {/* Sem botão de excluir — só ativar/desativar (pedido explícito). */}
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
