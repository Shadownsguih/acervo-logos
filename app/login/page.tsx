import Link from "next/link";
import Image from "next/image";
import { loginUserAction } from "./actions";
import LoginMobilePanels from "./login-mobile-panels";

function getErrorMessage(erro?: string) {
  switch (erro) {
    case "login":
      return "Faça login para continuar.";
    case "campos-obrigatorios":
      return "Preencha e-mail e senha.";
    case "credenciais-invalidas":
      return "E-mail ou senha inválidos.";
    default:
      return null;
  }
}

function normalizeNextPath(value?: string) {
  const next = (value ?? "").trim();

  if (!next) return "/";
  if (!next.startsWith("/") || next.startsWith("//")) return "/";

  return next;
}

function getWhatsAppLink() {
  const configuredLink = (process.env.NEXT_PUBLIC_WHATSAPP_LINK ?? "").trim();
  if (configuredLink) return configuredLink;
  return "https://wa.me/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; next?: string }>;
}) {
  const { erro, next } = await searchParams;
  const errorMessage = getErrorMessage(erro);
  const nextPath = normalizeNextPath(next);
  const whatsappLink = getWhatsAppLink();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#05060a]" />
        <div className="absolute -left-20 top-24 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute right-[-80px] top-16 h-96 w-96 rounded-full bg-fuchsia-500/8 blur-3xl" />
        <div className="absolute left-1/3 top-0 h-80 w-80 rounded-full bg-violet-600/8 blur-3xl" />
        <div className="absolute bottom-[-40px] left-1/4 h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 md:px-8">
        <div className="relative w-full max-w-[1180px]">
          <LoginMobilePanels
            nextPath={nextPath}
            errorMessage={errorMessage}
            whatsappLink={whatsappLink}
            cinzelClassName="font-serif"
          />

          <div className="hidden overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:block">
            <div className="grid min-h-[700px] lg:grid-cols-[460px_minmax(0,1fr)]">
              <section className="relative border-b border-white/10 bg-white/[0.04] px-8 py-12 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" />
                <div className="absolute -left-16 bottom-[-120px] h-80 w-80 rounded-full bg-amber-400/14 blur-3xl" />
                <div className="absolute left-10 top-10 h-44 w-44 rounded-full bg-white/4 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

                <div className="relative flex h-full flex-col">
                  <div className="flex h-[60px] items-center">
                    <Image
                      src="/logo-full.png"
                      alt="Acervo Logos"
                      width={1200}
                      height={380}
                      className="h-auto w-[520px] max-w-none -ml-[80px]"
                      priority
                    />
                  </div>

                  <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-[340px] text-center">
                      <p
                        className="font-serif text-[50px] font-medium uppercase leading-[0.92] tracking-[0.08em] text-white/90"
                      >
                        Bem vindo
                      </p>

                      <h1 className="mt-2 text-[31px] font-semibold leading-[0.99] text-white">
                        É NOVO NO ACERVO?
                      </h1>

                      <p className="mx-auto mt-20 max-w-[320px] text-[16px] leading-8 text-white/68">
                        Explore tudo o que preparamos para você. Clique no botão
                        WhatsApp para liberar seu acesso agora mesmo!
                      </p>

                      <a
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-12 inline-flex min-w-[245px] items-center justify-center rounded-full border border-white/15 bg-white/[0.14] px-8 py-4 text-sm font-semibold tracking-[0.18em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:bg-white/[0.20]"
                      >
                        WHATSAPP
                      </a>
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative px-8 py-12 lg:px-16 lg:py-14">
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(111,0,255,0.16),transparent_24%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(255,0,153,0.14),transparent_26%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_82%,rgba(0,210,255,0.10),transparent_22%)]" />

                <div className="relative flex h-full flex-col">
                  <div className="flex h-[60px] items-center justify-end">
                    <div className="rounded-full border border-white/12 bg-white/[0.12] px-8 py-2.5 text-sm font-medium tracking-[0.2em] text-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-md">
                      Acesso restrito
                    </div>
                  </div>

                  <div className="mt-16 text-center">
                    <h2
                      className="font-serif text-[38px] font-medium uppercase tracking-[0.24em] text-white/92 md:text-[56px]"
                    >
                      Faça Login
                    </h2>
                  </div>

                  <p className="mx-auto mt-5 max-w-md text-center text-[16px] leading-8 text-white/64">
                    Entre com seu e-mail e senha para acessar seu conteúdo no
                    acervo.
                  </p>

                  {errorMessage ? (
                    <div className="mx-auto mt-6 w-full max-w-[500px] rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {errorMessage}
                    </div>
                  ) : null}

                  <form
                    action={loginUserAction}
                    className="mx-auto mt-14 w-full max-w-[500px]"
                  >
                    <input type="hidden" name="next" value={nextPath} />

                    <div className="space-y-7">
                      <div className="overflow-hidden rounded-full border border-white/14 bg-white/[0.14] shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="w-full bg-transparent px-6 py-5 text-[18px] tracking-[0.16em] text-white outline-none placeholder:text-white/52"
                          placeholder="USUÁRIO"
                        />
                      </div>

                      <div className="overflow-hidden rounded-full border border-white/14 bg-white/[0.14] shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
                        <input
                          id="password"
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          required
                          className="w-full bg-transparent px-6 py-5 text-[18px] tracking-[0.20em] text-white outline-none placeholder:text-white/52"
                          placeholder="******"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="mx-auto mt-12 flex w-full max-w-[270px] items-center justify-center rounded-full bg-[#2b2955] px-8 py-4 text-[18px] font-semibold tracking-[0.12em] text-white shadow-[0_16px_35px_rgba(20,20,40,0.35)] transition hover:bg-[#34316b]"
                    >
                      Entrar
                    </button>
                  </form>

                  <div className="mt-auto pt-14 text-center">
                    <Link
                      href="/"
                      className="text-sm text-white/55 transition hover:text-white/85"
                    >
                      ← Voltar para a página inicial
                    </Link>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="pointer-events-none absolute left-[460px] top-1/2 z-20 hidden h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-white/[0.16] text-white shadow-[0_14px_35px_rgba(0,0,0,0.20)] backdrop-blur-md lg:flex">
            <span className="text-[26px] leading-none">↔</span>
          </div>
        </div>
      </div>
    </main>
  );
}
