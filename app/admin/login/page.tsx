import Link from "next/link";
import { loginAction } from "./actions";

function getErrorMessage(erro?: string) {
  switch (erro) {
    case "login":
      return "Faça login para acessar a área administrativa.";
    case "sem-permissao":
      return "Seu usuário não tem permissão para acessar a área administrativa.";
    case "campos-obrigatorios":
      return "Preencha e-mail e senha.";
    case "credenciais-invalidas":
      return "E-mail ou senha inválidos.";
    default:
      return null;
  }
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const errorMessage = getErrorMessage(erro);

  return (
    <main className="min-h-screen bg-[#05060a] px-6 py-16 text-white">
      <div className="mx-auto max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
            Área administrativa
          </p>

          <h1 className="mt-4 text-3xl font-bold">Entrar</h1>

          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Acesso restrito ao administrador do Acervo Logos.
          </p>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : null}

          <form action={loginAction} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
                placeholder="voce@exemplo.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-amber-400 px-5 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Entrar no painel
            </button>
          </form>

          <div className="mt-6">
            <Link
              href="/"
              className="text-sm text-zinc-400 transition hover:text-zinc-200"
            >
              ← Voltar para o site
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}