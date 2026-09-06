import { useCallback, useEffect, useState } from "react";
import { obterResumoDados, type ResumoDados } from "@/services";

interface UseResumoDadosResult {
  resumo: ResumoDados | null;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

/**
 * Lê a contagem de cada coleção diretamente do storage (via services).
 * Usado pelo painel "Início" para confirmar, na tela, que os dados
 * persistem entre recarregamentos da página.
 */
export function useResumoDados(): UseResumoDadosResult {
  const [resumo, setResumo] = useState<ResumoDados | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const dados = await obterResumoDados();
    setResumo(dados);
    setCarregando(false);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { resumo, carregando, recarregar };
}
