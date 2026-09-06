import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import {
  buscarProfile,
  login as loginService,
  logout as logoutService,
  obterSessaoAtual,
  ouvirMudancasDeAuth,
  type LoginInput,
  type Profile,
} from "@/services/authService";

/**
 * - "carregando": ainda checando se existe uma sessão válida (ex: logo
 *   ao abrir/recarregar a página).
 * - "nao-autenticado": sem sessão — mostra a tela de Login.
 * - "perfil-invalido": tem sessão, mas o profile não existe ou está
 *   `active = false` — usuário autenticado, mas SEM acesso ao PDV.
 * - "autenticado": sessão válida + profile ativo — libera o app.
 */
export type StatusAuth = "carregando" | "nao-autenticado" | "perfil-invalido" | "autenticado";

interface AuthContextValue {
  status: StatusAuth;
  session: Session | null;
  profile: Profile | null;
  /**
   * Conveniência de UI (ex: esconder um botão administrativo). NÃO É a
   * proteção de segurança real — isso é feito pelas policies de RLS no
   * Supabase, que continuam valendo mesmo que alguém burle a interface.
   */
  isAdmin: boolean;
  erro: string | null;
  entrando: boolean;
  entrar: (input: LoginInput) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusAuth>("carregando");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const montado = useRef(true);

  async function aplicarSessao(novaSessao: Session | null) {
    if (!novaSessao) {
      if (!montado.current) return;
      setSession(null);
      setProfile(null);
      setStatus("nao-autenticado");
      return;
    }

    setSession(novaSessao);
    try {
      const perfil = await buscarProfile(novaSessao.user.id);
      if (!montado.current) return;

      setProfile(perfil);
      if (!perfil || !perfil.active) {
        setStatus("perfil-invalido");
        return;
      }
      setStatus("autenticado");
    } catch (error) {
      if (!montado.current) return;
      setErro(
        error instanceof Error ? error.message : "Não foi possível carregar seu perfil."
      );
      setProfile(null);
      setStatus("perfil-invalido");
    }
  }

  useEffect(() => {
    montado.current = true;

    (async () => {
      try {
        const sessaoAtual = await obterSessaoAtual();
        await aplicarSessao(sessaoAtual);
      } catch (error) {
        if (!montado.current) return;
        setErro(error instanceof Error ? error.message : "Não foi possível recuperar a sessão.");
        setStatus("nao-autenticado");
      }
    })();

    const cancelar = ouvirMudancasDeAuth((novaSessao) => {
      aplicarSessao(novaSessao);
    });

    return () => {
      montado.current = false;
      cancelar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function entrar(input: LoginInput) {
    setEntrando(true);
    setErro(null);
    try {
      const novaSessao = await loginService(input);
      await aplicarSessao(novaSessao);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
      throw error;
    } finally {
      if (montado.current) setEntrando(false);
    }
  }

  async function sair() {
    await logoutService();
    // O próprio onAuthStateChange (ouvirMudancasDeAuth) já vai disparar
    // aplicarSessao(null) e atualizar o status — não precisa duplicar aqui.
  }

  const value: AuthContextValue = {
    status,
    session,
    profile,
    isAdmin: profile?.role === "admin",
    erro,
    entrando,
    entrar,
    sair,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth() precisa ser usado dentro de <AuthProvider>.");
  }
  return contexto;
}
