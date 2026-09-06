import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * `true` quando as duas variáveis de ambiente necessárias estão
 * presentes. Usado pelo `AuthGate` para mostrar uma mensagem clara de
 * configuração em vez de deixar o app quebrar silenciosamente (ou
 * mostrar tela branca) quando o `.env` ainda não foi criado.
 */
export const supabaseConfigurado = Boolean(url && anonKey);

/**
 * Cliente Supabase, usado por `services/authService.ts` (e, em etapas
 * futuras, por `createSupabaseRepository`). Só é instanciado se as
 * variáveis de ambiente estiverem presentes — caso contrário fica
 * `null`, e todo o código que o usa já trata esse caso.
 *
 * IMPORTANTE: usa exclusivamente `VITE_SUPABASE_ANON_KEY` (a chave
 * pública/anon). A chave `service_role` NUNCA deve aparecer no
 * frontend — ela ignora todo o RLS e dá acesso total ao banco. Só a
 * chave anon, combinada com as policies de RLS já configuradas no
 * banco, é segura para rodar no navegador.
 */
export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, anonKey!)
  : null;
