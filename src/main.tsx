import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ensureSeeded } from "@/storage";
import { reconectarImpressoraAutorizada } from "@/services";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate } from "@/components/auth/AuthGate";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    'Elemento raiz "#root" não encontrado em index.html. Verifique o arquivo public/index.html.'
  );
}

async function bootstrap() {
  // Garante dados de demonstração na primeira execução, sem sobrescrever
  // dados reais que já existam (ver src/storage/seed.ts).
  await ensureSeeded();

  createRoot(rootElement!).render(
    <StrictMode>
      <AuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </AuthProvider>
    </StrictMode>
  );

  // Reconecta silenciosamente a uma impressora térmica já autorizada
  // antes (se houver) — sem abrir nenhum seletor. Não bloqueia a
  // renderização: se falhar ou não houver dispositivo, o app segue
  // normal, só sem impressão automática até conectar manualmente em
  // Configurações → Impressora.
  reconectarImpressoraAutorizada().catch(() => {});
}

bootstrap();
