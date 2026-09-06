import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { supabaseConfigurado } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Login } from "@/pages/Login";

interface TelaCentralizadaProps {
  icone: "alert" | "cash";
  titulo: string;
  children: ReactNode;
  acao?: ReactNode;
}

function TelaCentralizada({ icone, titulo, children, acao }: TelaCentralizadaProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-charcoal-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-charcoal-800 bg-charcoal-900 p-6 text-center shadow-card">
        <div className="mb-4 flex justify-center">
          <Logo variant="mark" />
        </div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-charcoal-800 text-brand-mustard">
          <Icon name={icone} size={22} />
        </div>
        <h1 className="display-title mb-2 text-base text-brand-white">{titulo}</h1>
        <div className="text-sm text-charcoal-400">{children}</div>
        {acao && <div className="mt-4">{acao}</div>}
      </div>
    </div>
  );
}

/**
 * Portão de autenticação: decide o que renderizar antes de liberar o
 * PDV de verdade (`children`, ou seja, o `<App />` existente, sem
 * nenhuma alteração nele).
 *
 * Ordem de checagem:
 *   1. Supabase configurado? (variáveis de ambiente presentes)
 *   2. Sessão ainda carregando?
 *   3. Sem sessão -> tela de Login
 *   4. Com sessão, mas profile inexistente/inativo -> acesso negado
 *   5. Tudo certo -> libera `children`
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { status, profile, sair } = useAuth();

  if (!supabaseConfigurado) {
    return (
      <TelaCentralizada icone="alert" titulo="Supabase não configurado">
        <p>
          Crie um arquivo <code className="text-brand-mustard">.env</code> na raiz do
          projeto com as variáveis <code className="text-brand-mustard">VITE_SUPABASE_URL</code> e{" "}
          <code className="text-brand-mustard">VITE_SUPABASE_ANON_KEY</code> (veja o arquivo{" "}
          <code className="text-brand-mustard">.env.example</code>) e reinicie o
          servidor (<code className="text-brand-mustard">npm run dev</code>).
        </p>
      </TelaCentralizada>
    );
  }

  if (status === "carregando") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-charcoal-950">
        <p className="text-sm text-charcoal-400">Carregando...</p>
      </div>
    );
  }

  if (status === "nao-autenticado") {
    return <Login />;
  }

  if (status === "perfil-invalido") {
    return (
      <TelaCentralizada
        icone="alert"
        titulo="Acesso não liberado"
        acao={
          <button
            type="button"
            onClick={sair}
            className="rounded-md border border-charcoal-700 px-4 py-2 text-sm font-medium text-charcoal-300 transition-colors hover:border-charcoal-500 hover:text-brand-white"
          >
            Sair
          </button>
        }
      >
        {!profile ? (
          <p>
            Seu usuário fez login, mas não tem um perfil cadastrado no sistema. Fale
            com o administrador do Dogão da Praça.
          </p>
        ) : (
          <p>
            Seu acesso está desativado. Fale com o administrador do Dogão da Praça
            para reativar.
          </p>
        )}
      </TelaCentralizada>
    );
  }

  return <>{children}</>;
}
