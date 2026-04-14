import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import HomeMostReadCarousel from "@/app/components/home-most-read-carousel";
import { getOrCreateDailyBibleVerse } from "@/lib/daily-bible-verse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  noStore();

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const isLoggedIn = Boolean(user);

  const primaryHref = isLoggedIn ? "/categorias" : "/login?next=/categorias";
  const primaryLabel = isLoggedIn
    ? "Acessar categorias"
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
  const ctaButtonLabel = isLoggedIn ? "Acessar categorias" : "Fazer login";

  const dailyVerse = isLoggedIn ? await getOrCreateDailyBibleVerse() : null;

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

                <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400 sm:leading-7">
                  {heroHelperText}
                </p>

                {isLoggedIn ? (
                  <>
                    {dailyVerse ? (
                      <div className="relative mt-8 w-full max-w-2xl overflow-hidden rounded-[30px] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.16)_0%,rgba(255,255,255,0.05)_38%,rgba(15,23,42,0.72)_100%)] p-[1px] shadow-[0_24px_80px_-34px_rgba(245,158,11,0.5)]">
                        <div className="relative overflow-hidden rounded-[29px] bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_28%),linear-gradient(160deg,rgba(10,12,18,0.96),rgba(13,17,28,0.96))] px-4 py-5 sm:px-6 sm:py-6">
                          <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />
                          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-indigo-400/10 blur-3xl" />

                          <div className="relative flex items-start justify-between gap-4">
                            <div className="max-w-[82%] text-left">
                              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200 sm:text-[11px]">
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-300" />
                                <span>Versículo do dia</span>
                              </div>

                              <p className="mt-4 text-lg leading-8 text-white sm:text-[1.35rem] sm:leading-9">
                                <span className="mr-1 text-2xl leading-none text-amber-300/80 sm:text-3xl">
                                  “
                                </span>
                                {dailyVerse.text}
                                <span className="ml-1 text-2xl leading-none text-amber-300/80 sm:text-3xl">
                                  ”
                                </span>
                              </p>

                              <div className="mt-5 flex flex-wrap items-center gap-3">
                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-amber-100 sm:text-sm">
                                  {dailyVerse.reference}
                                </span>

                                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-xs">
                                  {dailyVerse.version}
                                </span>
                              </div>
                            </div>

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/10 bg-amber-300/10 text-xl text-amber-200 shadow-lg shadow-black/20 sm:h-14 sm:w-14 sm:text-2xl">
                              ✨
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-8 w-full max-w-md">
                      <Link
                        href="/categorias"
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 md:text-base"
                      >
                        Acessar categorias
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-10">
                    <Link
                      href={primaryHref}
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 md:text-base"
                    >
                      {primaryLabel}
                    </Link>

                    <Link
                      href={secondaryHref}
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] md:text-base"
                    >
                      {secondaryLabel}
                    </Link>
                  </div>
                )}
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