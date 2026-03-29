import Link from "next/link";
import HomeMostReadCarousel from "@/app/components/home-most-read-carousel";
import { createClient } from "@/lib/supabase-server";
import { supabase } from "@/lib/supabase";

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
    ? "Acesse categorias, materiais e PDFs organizados em um ambiente simples, limpo e pensado para estudo contínuo."
    : "Entre para acessar categorias, materiais e PDFs organizados em um ambiente simples, limpo e pensado para estudo contínuo.";

  const heroHelperText = isLoggedIn
    ? "Você já está logado. Entre nas categorias e continue sua leitura no Acervo Logos."
    : "O acesso às categorias, materiais, leitura e download dos PDFs exige login.";

  const accessCardTitle = isLoggedIn
    ? "Acesso liberado"
    : "Acesso restrito";

  const accessCardDescription = isLoggedIn
    ? "Seu acesso ao acervo está ativo para abrir materiais, ler e baixar os PDFs."
    : "Entre com sua conta para abrir materiais, ler e baixar os PDFs do acervo.";

  const ctaEyebrow = isLoggedIn ? "Seu acervo" : "Acesso ao acervo";
  const ctaTitle = isLoggedIn
    ? "Continue sua leitura"
    : "Entre para continuar";
  const ctaDescription = isLoggedIn
    ? "Você já está logado. Acesse agora os materiais disponíveis no Acervo Logos."
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
                <HomeMostReadCarousel materials={materiais ?? []} />
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
              <p className="text-sm font-medium text-white">{accessCardTitle}</p>
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
                  className="inline-flex w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:text-base md:w-auto"
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