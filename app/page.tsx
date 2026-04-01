import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import HomeMostReadCarousel from "@/app/components/home-most-read-carousel";

export default async function HomePage() {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const isLoggedIn = Boolean(user);

  const primaryHref = isLoggedIn ? "/categorias" : "/login?next=/categorias";
  const primaryLabel = isLoggedIn
    ? "Acessar materiais do acervo"
    : "Entrar para acessar o acervo";

  const secondaryHref = "/categorias";
  const secondaryLabel = "Ver categorias";

  const heroDescription = isLoggedIn
    ? "Acesse categorias, materiais e PDFs organizados em um ambiente simples, elegante e pensado para estudo contínuo."
    : "Entre para acessar categorias, materiais e PDFs organizados em um ambiente simples, elegante e pensado para estudo contínuo.";

  const heroHelperText = isLoggedIn
    ? "Seu acesso já está liberado para continuar a leitura."
    : "O acesso às categorias, materiais, leitura e download dos PDFs exige login.";

  const accessCardTitle = isLoggedIn ? "Acesso liberado" : "Acesso restrito";
  const accessCardDescription = isLoggedIn
    ? "Seu acesso ao acervo está ativo para abrir materiais, ler e baixar os PDFs disponíveis."
    : "Entre com sua conta para abrir materiais, ler e baixar os PDFs do acervo.";

  const ctaEyebrow = isLoggedIn ? "Seu acervo" : "Acesso ao acervo";
  const ctaTitle = isLoggedIn ? "Continue sua leitura" : "Entre para continuar";
  const ctaDescription = isLoggedIn
    ? "Você já está com acesso liberado. Entre agora nas categorias e continue estudando no Acervo Logos."
    : "Faça login para acessar o conteúdo completo do Acervo Logos.";
  const ctaButtonLabel = isLoggedIn ? "Acessar materiais" : "Fazer login";

  const { data: materiais, error: materiaisError } = await supabase
    .from("materials")
    .select("id, title, description, views")
    .order("views", { ascending: false })
    .order("title", { ascending: true })
    .limit(9);

  if (materiaisError) {
    return (
      <main className="min-h-screen bg-[#05060a] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold sm:text-4xl">Acervo Logos</h1>
          <p className="mt-4 text-red-400">
            Erro ao carregar o conteúdo da página inicial.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[#05060a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,30,70,0.18),transparent_32%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(245,158,11,0.10),transparent_20%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.03),transparent_24%)]" />
      </div>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,430px)] xl:gap-20">
            <div className="relative">
              <div className="absolute left-1/2 top-8 h-24 w-24 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl md:left-12 md:translate-x-0 md:h-32 md:w-32" />
              <div className="absolute left-1/2 top-20 h-20 w-20 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl md:left-28 md:translate-x-0 md:h-24 md:w-24" />

              <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center md:mx-0 md:items-start md:text-left">
                <span className="inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-300 sm:px-4 sm:text-sm">
                  Biblioteca Teológica Digital
                </span>

                <h1 className="mt-6 max-w-4xl text-[2.35rem] font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
                  Acervo teológico digital para{" "}
                  <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                    leitura, consulta e estudo
                  </span>
                </h1>

                <p className="mt-5 max-w-2xl text-[15px] leading-7 text-zinc-300 sm:mt-6 sm:text-lg sm:leading-8">
                  {heroDescription}
                </p>

                <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10 md:max-w-none md:flex-row md:flex-wrap md:justify-start">
                  <Link
                    href={primaryHref}
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 md:w-auto md:text-base"
                  >
                    {primaryLabel}
                  </Link>

                  <Link
                    href={secondaryHref}
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] md:w-auto md:text-base"
                  >
                    {secondaryLabel}
                  </Link>
                </div>

                <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:leading-7">
                  {heroHelperText}
                </p>

                <div className="mt-8 grid w-full max-w-md gap-3 sm:max-w-xl sm:grid-cols-3 md:max-w-none">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Ambiente
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      Leitura simples e contínua
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Organização
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      Categorias e materiais em ordem
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                      Acesso
                    </p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {isLoggedIn ? "Conta ativa para leitura" : "Login necessário"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2rem] bg-amber-400/5 blur-2xl sm:-inset-5" />
              <div className="relative">
                <HomeMostReadCarousel
                  materials={materiais ?? []}
                  isLoggedIn={isLoggedIn}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-medium text-white">Leitura em PDF</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400 sm:leading-7">
                Materiais preparados para leitura direta e consulta com mais
                continuidade.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-medium text-white">
                Acervo organizado
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400 sm:leading-7">
                Conteúdos distribuídos de forma clara para facilitar a navegação
                e o estudo.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-medium text-white">
                {accessCardTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400 sm:leading-7">
                {accessCardDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8 md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-amber-400 sm:text-sm">
                  {ctaEyebrow}
                </p>

                <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
                  {ctaTitle}
                </h2>

                <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
                  {ctaDescription}
                </p>
              </div>

              <div className="w-full md:w-auto">
                <Link
                  href={primaryHref}
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:text-base md:w-auto"
                >
                  {ctaButtonLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}