import { useState, type FormEvent } from "react";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/contexts/AuthContext";

const inputClassName =
  "w-full rounded-md border border-charcoal-700 bg-charcoal-800 px-3 py-2 text-sm text-brand-white placeholder:text-charcoal-500 focus:border-brand-mustard focus:outline-none focus:ring-1 focus:ring-brand-mustard";
const labelClassName = "mb-1.5 block text-xs font-medium text-charcoal-300";

export function Login() {
  const { entrar, entrando, erro } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErroLocal(null);

    if (!email.trim() || !senha) {
      setErroLocal("Informe e-mail e senha.");
      return;
    }

    try {
      await entrar({ email: email.trim(), password: senha });
    } catch {
      // O erro já fica disponível via `erro` do AuthContext e é
      // exibido abaixo — nada mais a fazer aqui.
    }
  }

  const mensagemErro = erroLocal || erro;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-charcoal-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-charcoal-800 bg-charcoal-900 p-6 shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <h1 className="display-title mb-1 text-center text-lg text-brand-white">Entrar</h1>
        <p className="mb-5 text-center text-xs text-charcoal-400">
          Acesso ao PDV do Dogão da Praça
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="login-email" className={labelClassName}>
              E-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              className={inputClassName}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="login-senha" className={labelClassName}>
              Senha
            </label>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="••••••••"
              className={inputClassName}
            />
          </div>

          {mensagemErro && (
            <p className="flex items-center gap-2 rounded-md border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-xs text-brand-red-light">
              <Icon name="alert" size={14} className="shrink-0" />
              {mensagemErro}
            </p>
          )}

          <button
            type="submit"
            disabled={entrando}
            className="w-full rounded-md bg-brand-red py-2.5 text-sm font-bold text-brand-white transition-colors hover:bg-brand-red-dark disabled:opacity-50"
          >
            {entrando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
