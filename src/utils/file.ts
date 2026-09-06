/**
 * Dispara o download de um arquivo de texto diretamente no navegador,
 * via Blob + link temporário. Não depende de nenhum servidor — funciona
 * totalmente offline.
 */
export function baixarArquivoTexto(
  nomeArquivo: string,
  conteudo: string,
  tipo = "application/json"
): void {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/** Lê o conteúdo de um arquivo selecionado pelo usuário como texto. */
export function lerArquivoComoTexto(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    reader.readAsText(arquivo);
  });
}
