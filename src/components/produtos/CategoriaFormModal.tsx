import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/utils/cn";
import type { Categoria } from "@/types";

const CORES_SUGERIDAS = [
  "#E11D2E", // vermelho
  "#F5B301", // mostarda
  "#B45309", // marrom
  "#16A34A", // verde
  "#2563EB", // azul
  "#9333EA", // roxo
  "#0D9488", // teal
  "#64748B", // cinza
];

export interface CategoriaFormValues {
  nome: string;
  cor: string;
}

interface CategoriaFormModalProps {
  open: boolean;
  categoria: Categoria | null;
  onClose: () => void;
  onSalvar: (valores: CategoriaFormValues) => Promise<void>;
}

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";

export function CategoriaFormModal({
  open,
  categoria,
  onClose,
  onSalvar,
}: CategoriaFormModalProps) {
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState(CORES_SUGERIDAS[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNome(categoria?.nome ?? "");
    setCor(categoria?.cor ?? CORES_SUGERIDAS[0]);
    setErro(null);
  }, [open, categoria]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim()) {
      setErro("Informe o nome da categoria.");
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await onSalvar({ nome: nome.trim(), cor });
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível salvar a categoria."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={categoria ? "Editar categoria" : "Nova categoria"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="categoria-nome" className="mb-1.5 block text-xs font-medium text-charcoal-300">
            Nome
          </label>
          <input
            id="categoria-nome"
            type="text"
            value={nome}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex: 🌭 Cachorros-quentes"
            className={inputClassName}
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-charcoal-300">
            Cor
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {CORES_SUGERIDAS.map((corSugerida) => (
              <button
                key={corSugerida}
                type="button"
                onClick={() => setCor(corSugerida)}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform",
                  cor === corSugerida
                    ? "scale-110 border-brand-white"
                    : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: corSugerida }}
                aria-label={`Usar cor ${corSugerida}`}
              />
            ))}
            <input
              type="color"
              value={cor}
              onChange={(event) => setCor(event.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-charcoal-700 bg-charcoal-800"
              aria-label="Escolher cor personalizada"
            />
          </div>
        </div>

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
