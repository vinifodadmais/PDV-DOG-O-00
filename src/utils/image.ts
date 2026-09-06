/**
 * Lê um arquivo de imagem e devolve um data URL (base64) já redimensionado,
 * para não inchar o localStorage com fotos em tamanho original. Todo o
 * processamento acontece no navegador (FileReader + canvas) — nenhuma
 * chamada de rede envolvida.
 */
export function resizeImageToDataUrl(
  file: File,
  maxWidth = 320,
  maxHeight = 320,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () =>
      reject(new Error("Não foi possível ler o arquivo de imagem."));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () =>
        reject(new Error("Não foi possível carregar a imagem selecionada."));

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
        const width = Math.round(img.width * ratio);
        const height = Math.round(img.height * ratio);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Este navegador não suporta o processamento de imagem."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
