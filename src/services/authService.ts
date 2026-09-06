import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Role = "admin" | "operator";

/**
 * Espelha a tabela `public.profiles` do Supabase (só os campos que o
 * frontend precisa para decidir o que mostrar). A segurança de verdade
 * — quem pode ler/escrever o quê — continua sendo garantida pelas
 * policies de RLS no banco, não por este objeto.
 */
export interface Profile {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

function exigirSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase não está configurado. Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example)."
    );
  }
  return supabase;
}

/** Login por e-mail e senha (Supabase Auth). */
export async function login({ email, password }: LoginInput): Promise<Session> {
  const client = exigirSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("Login não retornou uma sessão válida.");
  return data.session;
}

/** Encerra a sessão atual. */
export async function logout(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Recupera a sessão atual (ex: ao recarregar a página). `null` se não houver. */
export async function obterSessaoAtual(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Assina mudanças de autenticação (login em outra aba, expiração de
 * sessão, logout, refresh de token...). Retorna uma função para
 * cancelar a assinatura.
 */
export function ouvirMudancasDeAuth(
  callback: (session: Session | null) => void
): () => void {
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}

/**
 * Busca o perfil (nome, role, active) do usuário autenticado em
 * `public.profiles`. Retorna `null` se não existir nenhum profile para
 * esse usuário (ex: um caso raro em que o trigger de criação falhou) —
 * quem chama decide como tratar isso (ver `AuthContext`).
 */
export async function buscarProfile(userId: string): Promise<Profile | null> {
  const client = exigirSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, name, role, active")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as Profile | null;
}
