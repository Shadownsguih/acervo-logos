import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabase } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import HomeMostReadCarousel from "@/app/components/home-most-read-carousel";
import HomeRecentReadingCard from "@/app/components/home-recent-reading-card";
import { getOrCreateDailyBibleVerse } from "@/lib/daily-bible-verse";
import DailyVerseShareButton from "@/app/components/daily-verse-share-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FavoriteCategory = {
  name: string;
  slug: string | null;
};

type FavoriteMaterialRaw = {
  created_at: string;
  materials:
    | {
        id: string;
        title: string;
        description: string | null;
        categories: FavoriteCategory[] | FavoriteCategory | null;
      }
    | Array<{
        id: string;
        title: string;
        description: string | null;
        categories: FavoriteCategory[] | FavoriteCategory | null;
      }>
    | null;
};

type FavoriteMaterial = {
  created_at: string;
  material: {
    id: string;
    title: string;
    description: string | null;
    category: FavoriteCategory | null;
  } | null;
};

function getMaterialPreview(description: string | null) {
  const normalized = String(description ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Material salvo para retomar depois.";
  }

  if (normalized.length <= 140) {
    return normalized;
  }

  return `${normalized.slice(0, 140).trim()}...`;
}

function normalizeFavoriteMaterial(
  item: FavoriteMaterialRaw
): FavoriteMaterial | null {
  const materialSource = Array.isArray(item.materials)
    ? item.materials[0] ?? null
    : item.materials;

  if (!materialSource) {
    return null;
  }

  const categorySource = Array.isArray(materialSource.categories)
    ? materialSource.categories[0] ?? null
    : materialSource.categories;

  return {
    created_at: item.created_at,
    material: {
      id: materialSource.id,
      title: materialSource.title,
      description: materialSource.description,
      category: categorySource
        ? {
            name: categorySource.name,
            slug: categorySource.slug,
          }
        : null,
    },
  };
}

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
    ? "Acesse categorias, materiais e PDFs organizados em um ambiente simples, elegante e pensado para estudo continuo."
    : "Entre para acessar categorias, materiais e PDFs organizados em um ambiente simples, elegante e pensado para estudo continuo.";

  const heroHelperText = isLoggedIn
    ? "Seu acesso ja esta liberado para continuar a leitura."
    : "O acesso as categorias, materiais, leitura e download dos PDFs exige login.";

  const ctaEyebrow = isLoggedIn ? "Seu acervo" : "Acesso ao acervo";
  const ctaTitle = isLoggedIn ? "Continue sua leitura" : "Entre para continuar";
  const ctaDescription = isLoggedIn
    ? "Voce ja esta com acesso liberado. Entre agora nas categorias e continue estudando no Acervo Logos."
    : "Faca login para acessar o conteudo completo do Acervo Logos.";
  const ctaButtonLabel = isLoggedIn ? "Acessar categorias" : "Fazer login";

  const dailyVerse = isLoggedIn ? await getOrCreateDailyBibleVerse() : null;
  const adminSupabase = isLoggedIn ? createAdminClient() : null;

  const [{ data: materiais, error: materiaisError }, favoriteResult] =
    await Promise.all([
      supabase
        .from("materials")
        .select("id, title, description, views")
        .order("views", { ascending: false })
        .order("title", { ascending: true })
        .limit(9),
      isLoggedIn && adminSupabase && user
        ? adminSupabase
            .from("material_favorites")
            .select(
              `
                created_at,
                materials (
                  id,
                  title,
                  description,
                  categories (
                    name,
                    slug
                  )
                )
              `
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(4)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const favoriteMaterials = ((favoriteResult?.data ?? []) as FavoriteMaterialRaw[])
    .map(normalizeFavoriteMaterial)
    .filter((item): item is FavoriteMaterial => item !== null);

  if (materiaisError) {
    return (
      <main className="min-h-screen bg-[#05060a] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold sm:text-4xl">Acervo Logos</h1>
          <p className="mt-4 text-red-400">
            Erro ao carregar o conteudo da pagina inicial.
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
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-16 lg:py-24">
          <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(320px,430px)] xl:gap-20">
            <div className="relative">
              <div className="absolute left-1/2 top-6 h-20 w-20 -translate-x-1/2 rounded-full bg-amber-400/10 blur-3xl md:left-12 md:translate-x-0 md:h-32 md:w-32" />
              <div className="absolute left-1/2 top-16 h-16 w-16 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl md:left-28 md:translate-x-0 md:h-24 md:w-24" />

              <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center md:mx-0 md:items-start md:text-left">
                <h1 className="max-w-4xl text-[2rem] font-bold leading-[1.02] tracking-tight sm:text-5xl md:text-6xl xl:text-7xl">
                  Acervo teologico digital para{" "}
                  <span className="bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                    leitura, consulta e estudo
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-[14px] leading-6 text-zinc-300 sm:mt-6 sm:text-lg sm:leading-8">
                  {heroDescription}
                </p>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-5 sm:leading-7">
                  {heroHelperText}
                </p>

                {isLoggedIn ? (
                  <>
                    {dailyVerse ? (
                      <div className="relative mt-7 w-full max-w-2xl overflow-hidden rounded-[26px] border border-amber-300/15 bg-[linear-gradient(135deg,rgba(245,158,11,0.16)_0%,rgba(255,255,255,0.05)_38%,rgba(15,23,42,0.72)_100%)] p-[1px] shadow-[0_24px_80px_-34px_rgba(245,158,11,0.5)] sm:rounded-[30px]">
                        <div className="relative overflow-hidden rounded-[25px] bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_28%),linear-gradient(160deg,rgba(10,12,18,0.96),rgba(13,17,28,0.96))] px-4 py-4 sm:rounded-[29px] sm:px-6 sm:py-6">
                          <div className="pointer-events-none absolute -right-10 top-0 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />
                          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-indigo-400/10 blur-3xl" />

                          <div className="relative flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1 text-left">
                              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200 sm:text-[11px]">
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-300" />
                                <span>Versiculo do dia</span>
                              </div>

                              <p className="mt-4 text-[15px] leading-7 text-white sm:text-[1.35rem] sm:leading-9">
                                <span className="mr-1 text-xl leading-none text-amber-300/80 sm:text-3xl">
                                  &quot;
                                </span>
                                {dailyVerse.text}
                                <span className="ml-1 text-xl leading-none text-amber-300/80 sm:text-3xl">
                                  &quot;
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

                              <details className="group mt-5 rounded-[22px] border border-white/10 bg-white/[0.04]">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left">
                                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
                                    Mostrar explicacao
                                  </span>
                                  <span className="text-lg text-amber-200/80 transition group-open:rotate-45">
                                    +
                                  </span>
                                </summary>

                                <div className="border-t border-white/10 px-4 py-4">
                                  <p className="text-sm leading-7 text-zinc-200">
                                    {dailyVerse.insight}
                                  </p>

                                  <DailyVerseShareButton
                                    reference={dailyVerse.reference}
                                    version={dailyVerse.version}
                                    verse={dailyVerse.verse}
                                    text={dailyVerse.text}
                                    insight={dailyVerse.insight}
                                  />
                                </div>
                              </details>
                            </div>

                            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/10 bg-amber-300/10 text-sm font-semibold text-amber-200 shadow-lg shadow-black/20 sm:flex sm:h-14 sm:w-14 sm:text-base">
                              AD
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-7 grid w-full max-w-md gap-3 sm:mt-8 sm:max-w-none sm:grid-cols-2 md:max-w-md">
                      <Link
                        href="/categorias"
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 md:text-base"
                      >
                        Acessar categorias
                      </Link>

                      <Link
                        href="/perfil#favoritos-salvos"
                        className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-medium text-white transition hover:bg-white/[0.06] md:text-base"
                      >
                        Meus favoritos
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="mt-7 flex w-full max-w-md flex-col gap-3 sm:mt-10">
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
              <div className="absolute -inset-3 rounded-[1.75rem] bg-amber-400/5 blur-2xl sm:-inset-5 sm:rounded-[2rem]" />
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

      {!isLoggedIn ? (
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
                  Conteudos distribuidos de forma clara para facilitar a
                  navegacao e o estudo.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm sm:p-6">
                <p className="text-sm font-medium text-white">
                  Acesso restrito
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-400 sm:leading-7">
                  Entre com sua conta para abrir materiais, ler e baixar os PDFs
                  do acervo.
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isLoggedIn ? (
        <section className="border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(160deg,rgba(13,17,28,0.96),rgba(17,24,39,0.94))] p-5 sm:rounded-[2rem] sm:p-8 md:p-10">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs uppercase tracking-[0.3em] text-amber-400 sm:text-sm">
                      Meus favoritos
                    </p>

                    <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl md:mt-4 md:text-3xl">
                      Seus materiais salvos ficam sempre a um clique
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-zinc-400 sm:mt-4 sm:text-base sm:leading-7">
                      Retome leituras importantes com mais rapidez e mantenha seu
                      acervo pessoal sempre acessivel.
                    </p>
                  </div>

                  <div className="w-full md:w-auto">
                    <Link
                      href="/perfil#favoritos-salvos"
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10 px-6 py-3 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/15 sm:text-base md:w-auto"
                    >
                      Ver todos os favoritos
                    </Link>
                  </div>
                </div>

                {favoriteMaterials.length > 0 ? (
                  <div className="mt-6 grid gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-2">
                    {favoriteMaterials.map((favorite) =>
                      favorite.material ? (
                        <article
                          key={`${favorite.material.id}:${favorite.created_at}`}
                          className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.06] sm:rounded-[28px] sm:p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                                  Favorito
                                </span>

                                {favorite.material.category?.name ? (
                                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                                    {favorite.material.category.name}
                                  </span>
                                ) : null}
                              </div>

                              <h3 className="mt-3 text-base font-semibold text-white sm:mt-4 sm:text-lg">
                                {favorite.material.title}
                              </h3>

                              <p className="mt-2 text-sm leading-6 text-zinc-400 sm:mt-3">
                                {getMaterialPreview(
                                  favorite.material.description
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3 sm:mt-5">
                            <Link
                              href={`/material/${favorite.material.id}`}
                              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
                            >
                              Abrir material
                            </Link>

                            <Link
                              href={`/ler/${favorite.material.id}`}
                              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                              Ler agora
                            </Link>
                          </div>
                        </article>
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm leading-7 text-zinc-400 sm:mt-8 sm:rounded-[28px] sm:p-6">
                    Voce ainda nao salvou materiais nos favoritos. Use o coracao
                    nos cards do acervo ou dentro da pagina do material para
                    montar sua propria estante.
                  </div>
                )}
              </div>

              <HomeRecentReadingCard />
            </div>
          </div>
        </section>
      ) : null}

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
