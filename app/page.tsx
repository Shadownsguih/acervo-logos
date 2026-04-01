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

  const heroDescription = isLoggedIn
    ? "Acesse categorias, materiais e PDFs em um ambiente organizado para leitura contínua."
    : "Entre para acessar categorias, materiais e PDFs em um ambiente organizado para leitura contínua.";

  const heroHelperText = isLoggedIn
    ? "Arraste para baixo e veja os destaques do acervo."
    : "O acesso às categorias, materiais, leitura e download dos PDFs exige login.";

  const accessCardTitle = isLoggedIn ? "Acesso liberado" : "Acesso restrito";
  const accessCardDescription = isLoggedIn
    ? "Seu acesso ao acervo está ativo para abrir materiais, ler e baixar os PDFs disponíveis."
    : "Entre com sua conta para abrir materiais, ler e baixar os PDFs do acervo.";

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

      {/* MOBILE */}
      <div className="md:hidden">
        <section className="relative flex min-h-[100svh] items-center border-b border-white/10 px-4 pb-10 pt-8">
          <div className="mx-auto w-full max-w-xl">
            <span className="inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-medium text-amber-300">
              Biblioteca Teológica Digital
            </span>

            <h1 className="mt-5 text-[2rem] font-bold leading-[1.04] tracking-tight">
              Acervo teológico digital para{" "}
              <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                leitura, consulta e estudo
              </span>
            </h1>

            <p className="mt-4 text-[15px] leading-7 text-zinc-300">
              {heroDescription}
            </p>

            <div className="mt-7 grid gap-3">
              <Link
                href={primaryHref}
                className="inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                {primaryLabel}
              </Link>
            </div>

            <p className="mt-5 text-sm leading-6 text-zinc-400">
              {heroHelperText}
            </p>

            <div className="mt-10 flex justify-center">
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <span className="text-[11px] uppercase tracking-[0.22em]">
                  Arraste para baixo
                </span>
                <span className="animate-bounce text-lg">↓</span>
              </div>
            </div>
          </div>
        </section>

        <section className="relative -mt-6 rounded-t-[2rem] border-t border-white/10 bg-[#080a10] px-4 pb-10 pt-6">
          <div className="mx-auto max-w-xl space-y-5">
            <div className="flex justify-center">
              <span className="h-1.5 w-14 rounded-full bg-white/10" />
            </div>

            <HomeMostReadCarousel
              materials={materiais ?? []}
              isLoggedIn={isLoggedIn}
            />

            <div className="grid gap-4">
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">Leitura em PDF</p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Materiais preparados para leitura direta e consulta com mais
                  continuidade.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">
                  Acervo organizado
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  Conteúdos distribuídos de forma clara para facilitar a
                  navegação e o estudo.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">
                  {accessCardTitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-400">
                  {accessCardDescription}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-2xl font-bold text-white">{ctaTitle}</h2>

              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {ctaDescription}
              </p>

              <Link
                href={primaryHref}
                className="mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                {ctaButtonLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* DESKTOP */}
      <div className="hidden md:block">
        <section className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,430px)] xl:gap-20">
              <div className="relative max-w-4xl">
                <div className="absolute -left-4 top-4 h-24 w-24 rounded-full bg-amber-400/10 blur-3xl sm:-left-8 sm:top-8 sm:h-32 sm:w-32" />
                <div className="absolute left-16 top-16 h-20 w-20 rounded-full bg-blue-500/10 blur-3xl sm:left-24 sm:top-20 sm:h-24 sm:w-24" />

                <span className="relative inline-flex rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 sm:px-4 sm:text-sm">
                  Biblioteca Teológica Digital
                </span>

                <h1 className="relative mt-6 max-w-4xl text-3xl font-bold leading-[1.06] tracking-tight sm:mt-8 sm:text-5xl md:text-6xl xl:text-7xl">
                  Acervo teológico digital para{" "}
                  <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                    leitura, consulta e estudo
                  </span>
                </h1>

                <p className="relative mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:mt-6 sm:text-lg sm:leading-8">
                  {heroDescription}
                </p>

                <div className="relative mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
                  <Link
                    href={primaryHref}
                    className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:w-auto sm:text-base"
                  >
                    {primaryLabel}
                  </Link>
                </div>

                <p className="relative mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:leading-7">
                  {heroHelperText}
                </p>
              </div>

              <div className="relative">
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
                  Conteúdos distribuídos de forma clara para facilitar a
                  navegação e o estudo.
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
                  <h2 className="text-2xl font-bold text-white md:text-3xl">
                    {ctaTitle}
                  </h2>

                  <p className="mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
                    {ctaDescription}
                  </p>
                </div>

                <div className="w-full md:w-auto">
                  <Link
                    href={primaryHref}
                    className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:text-base md:w-auto"
                  >
                    {ctaButtonLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}