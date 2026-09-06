import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { ImageUploadField } from "./ImageUploadField";
import type { Categoria, Produto } from "@/types";

export interface ProdutoFormValues {
  nome: string;
  descricao?: string;
  categoriaId: string;
  preco: number;
  custo?: number;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  imagemUrl?: string;
  ativo: boolean;
}

interface ProdutoFormModalProps {
  open: boolean;
  produto: Produto | null;
  categorias: Categoria[];
  categoriaPadraoId?: string;
  onClose: () => void;
  onSalvar: (valores: ProdutoFormValues) => Promise<void>;
}

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";
const labelClassName = "mb-1.5 block text-xs font-medium text-charcoal-300";

function valoresIniciais(
  produto: Produto | null,
  categoriaPadraoId?: string
): ProdutoFormValues {
  if (produto) {
    return {
      nome: produto.nome,
      descricao: produto.descricao ?? "",
      categoriaId: produto.categoriaId,
      preco: produto.preco,
      custo: produto.custo,
      unidade: produto.unidade,
      estoqueAtual: produto.estoqueAtual,
      estoqueMinimo: produto.estoqueMinimo,
      imagemUrl: produto.imagemUrl,
      ativo: produto.ativo,
    };
  }

  return {
    nome: "",
    descricao: "",
    categoriaId: categoriaPadraoId ?? "",
    preco: 0,
    custo: undefined,
    unidade: "un",
    estoqueAtual: 0,
    estoqueMinimo: 0,
    imagemUrl: undefined,
    ativo: true,
  };
}

export function ProdutoFormModal({
  open,
  produto,
  categorias,
  categoriaPadraoId,
  onClose,
  onSalvar,
}: ProdutoFormModalProps) {
  const [valores, setValores] = useState<ProdutoFormValues>(() =>
    valoresIniciais(produto, categoriaPadraoId)
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValores(valoresIniciais(produto, categoriaPadraoId));
    setErro(null);
  }, [open, produto, categoriaPadraoId]);

  function atualizarCampo<K extends keyof ProdutoFormValues>(
    campo: K,
    valor: ProdutoFormValues[K]
  ) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!valores.nome.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }
    if (!valores.categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }
    if (valores.preco < 0) {
      setErro("O preço não pode ser negativo.");
      return;
    }
    if (valores.custo !== undefined && valores.custo < 0) {
      setErro("O custo não pode ser negativo.");
      return;
    }
    if (valores.estoqueAtual < 0) {
      setErro("O estoque não pode ser negativo.");
      return;
    }
    if (valores.estoqueMinimo < 0) {
      setErro("O estoque mínimo não pode ser negativo.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({
        ...valores,
        nome: valores.nome.trim(),
        descricao: valores.descricao?.trim() || undefined,
        unidade: valores.unidade.trim() || "un",
      });
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível salvar o produto."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={produto ? "Editar produto" : "Novo produto"}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="produto-nome" className={labelClassName}>
            Nome
          </label>
          <input
            id="produto-nome"
            type="text"
            value={valores.nome}
            onChange={(event) => atualizarCampo("nome", event.target.value)}
            placeholder="Ex: X-Bacon"
            className={inputClassName}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="produto-descricao" className={labelClassName}>
            Descrição (opcional)
          </label>
          <textarea
            id="produto-descricao"
            value={valores.descricao ?? ""}
            onChange={(event) => atualizarCampo("descricao", event.target.value)}
            placeholder="Ex: Pão, salsicha, molho e batata palha"
            rows={2}
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor="produto-categoria" className={labelClassName}>
            Categoria
          </label>
          <select
            id="produto-categoria"
            value={valores.categoriaId}
            onChange={(event) => atualizarCampo("categoriaId", event.target.value)}
            className={inputClassName}
          >
            <option value="">Selecione...</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
                {!categoria.ativo ? " (inativa)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="produto-preco" className={labelClassName}>
              Preço de venda (R$)
            </label>
            <input
              id="produto-preco"
              type="number"
              min={0}
              step={0.01}
              value={valores.preco}
              onChange={(event) =>
                atualizarCampo("preco", Number(event.target.value))
              }
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="produto-custo" className={labelClassName}>
              Custo (R$, opcional)
            </label>
            <input
              id="produto-custo"
              type="number"
              min={0}
              step={0.01}
              value={valores.custo ?? ""}
              onChange={(event) =>
                atualizarCampo(
                  "custo",
                  event.target.value === "" ? undefined : Number(event.target.value)
                )
              }
              className={inputClassName}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="produto-unidade" className={labelClassName}>
              Unidade
            </label>
            <input
              id="produto-unidade"
              type="text"
              value={valores.unidade}
              onChange={(event) => atualizarCampo("unidade", event.target.value)}
              placeholder="un"
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="produto-estoque" className={labelClassName}>
              Estoque
            </label>
            <input
              id="produto-estoque"
              type="number"
              min={0}
              step={1}
              value={valores.estoqueAtual}
              onChange={(event) =>
                atualizarCampo("estoqueAtual", Number(event.target.value))
              }
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="produto-estoque-minimo" className={labelClassName}>
              Estoque mínimo
            </label>
            <input
              id="produto-estoque-minimo"
              type="number"
              min={0}
              step={1}
              value={valores.estoqueMinimo}
              onChange={(event) =>
                atualizarCampo("estoqueMinimo", Number(event.target.value))
              }
              className={inputClassName}
            />
          </div>
        </div>

        <ImageUploadField
          value={valores.imagemUrl}
          onChange={(dataUrl) => atualizarCampo("imagemUrl", dataUrl)}
        />

        <label className="flex items-center gap-2 text-sm text-charcoal-200">
          <input
            type="checkbox"
            checked={valores.ativo}
            onChange={(event) => atualizarCampo("ativo", event.target.checked)}
            className="h-4 w-4 rounded border-charcoal-600 bg-charcoal-800 text-brand-red focus:ring-brand-mustard"
          />
          Produto ativo (visível para venda)
        </label>

        {erro && (
          <p className="rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-semibold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
