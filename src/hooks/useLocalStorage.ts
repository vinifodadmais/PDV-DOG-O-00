import { useCallback, useEffect, useState } from "react";
import { storage } from "@/storage";

interface UseLocalStorageResult<T> {
  /** Valor atual (null enquanto carrega ou se a chave não existir). */
  value: T | null;
  /** Indica se a leitura inicial ainda está em andamento. */
  loading: boolean;
  /** Atualiza o valor tanto em memória quanto no storage. */
  setValue: (value: T) => Promise<void>;
  /** Remove o valor do storage. */
  removeValue: () => Promise<void>;
}

/**
 * Hook genérico para ler/gravar um valor no storage ativo (ver src/storage).
 *
 * Serve de base para hooks mais específicos que serão criados nas próximas
 * etapas (ex: `useProdutos`, `useVendas`), que internamente chamarão um
 * service em vez de acessar o storage diretamente.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T | null = null
): UseLocalStorageResult<T> {
  const [value, setValueState] = useState<T | null>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      const stored = await storage.get<T>(key);
      if (active) {
        setValueState(stored ?? defaultValue);
        setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    async (newValue: T) => {
      setValueState(newValue);
      await storage.set(key, newValue);
    },
    [key]
  );

  const removeValue = useCallback(async () => {
    setValueState(null);
    await storage.remove(key);
  }, [key]);

  return { value, loading, setValue, removeValue };
}
