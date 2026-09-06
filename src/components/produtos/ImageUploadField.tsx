import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { resizeImageToDataUrl } from "@/utils/image";

interface ImageUploadFieldProps {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}

/**
 * Upload de imagem opcional do produto. Lê o arquivo, redimensiona no
 * navegador (canvas) e guarda como data URL — sem nenhum serviço externo.
 */
export function ImageUploadField({ value, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleArquivoSelecionado(file: File) {
    setErro(null);
    setProcessando(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onChange(dataUrl);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Não foi possível processar a imagem."
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-charcoal-300">
        Imagem (opcional)
      </label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-charcoal-700 bg-charcoal-800">
          {value ? (
            <img src={value} alt="Prévia do produto" className="h-full w-full object-cover" />
          ) : (
            <Icon name="image" size={22} className="text-charcoal-500" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={processando}
              className="rounded-md border border-charcoal-700 px-3 py-1.5 text-xs font-medium text-charcoal-200 transition-colors hover:border-charcoal-500 hover:text-brand-white disabled:opacity-50"
            >
              {value ? "Trocar imagem" : "Selecionar imagem"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange(undefined)}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-charcoal-400 transition-colors hover:text-brand-red"
              >
                Remover
              </button>
            )}
          </div>
          {processando && (
            <p className="text-[11px] text-charcoal-400">Processando imagem...</p>
          )}
          {erro && <p className="text-[11px] text-brand-red-light">{erro}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleArquivoSelecionado(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
