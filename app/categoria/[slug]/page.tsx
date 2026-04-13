import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CategorySearchToggle from "@/app/components/category-search-toggle";
import BibleDictionaryExplorer from "@/app/components/bible-dictionary-explorer";
import CategoryScroll from "@/app/components/category-scroll";
import { isBibleDictionaryCategory } from "@/lib/bible-dictionary";

type Category = {
  id: string;
  name: string;
  slug: string | null;
};

type Material = {
  id: string;
  title: string;
  description: string | null;
  views: number | null;
  display_order: number | null;
};

function normalizeCategoryPath(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function matchesCategoryRoute(category: Category, routeParam: string) {
  const normalizedRoute = normalizeCategoryPath(routeParam);

  const candidates = [category.id, category.slug ?? "", category.name]
    .map((value) => normalizeCategoryPath(value))
    .filter(Boolean);

  return candidates.includes(normalizedRoute);
}

function getCategoryAccent(categoryName: string) {
  const normalized = normalizeCategoryPath(categoryName);

  if (normalized.includes("biblia")) {
    return {
      heroGlow: "bg-amber-300/10",
      badge: "Bíblias",
    };
  }

  if (normalized.includes("comentario")) {
    return {
      heroGlow: "bg-blue-300/10",
      badge: "Comentários",
    };
  }

  if (normalized.includes("dicionario")) {
    return {
      heroGlow: "bg-emerald-300/10",
      badge: "Consulta",
    };
  }

  return {
    heroGlow: "bg-violet-300/10",
    badge: "Acervo",
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const query = resolvedSearchParams?.q?.trim() || "";

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (categoriesError) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <h1 className="text-3xl font-bold">Categoria não encontrada</h1>
            <p className="mt-4 text-zinc-400">
              A categoria que você tentou acessar não existe.
            </p>
            <Link
              href="/categorias"
              className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Voltar para categorias
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const categories = (categoriesData ?? []) as Category[];
  const category =
    categories.find((item) => matchesCategoryRoute(item, slug)) ?? null;

  if (!category) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <h1 className="text-3xl font-bold">Categoria não encontrada</h1>
            <p className="mt-4 text-zinc-400">
              A categoria que você tentou acessar não existe.
            </p>
            <Link
              href="/categorias"
              className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Voltar para categorias
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const accent = getCategoryAccent(category.name);

  if (isBibleDictionaryCategory(category)) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-5 text-white sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/categorias"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
          >
            <span>←</span>
            <span>Voltar para categorias</span>
          </Link>

          <section className="relative mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(13,17,28,0.96),rgba(17,24,39,0.94))] px-4 py-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] sm:mt-5 sm:rounded-[32px] sm:px-7 sm:py-7">
            <div
              className={`pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full blur-3xl ${accent.heroGlow}`}
            />
            <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />

            <div className="relative max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300 sm:text-xs">
                {accent.badge}
              </p>

              <h1 className="mt-3 text-[1.7rem] font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                {category.name}
              </h1>

              <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
                Área especial de consulta bíblica com pesquisa por termos em
                português, grego, hebraico e Strong.
              </p>
            </div>
          </section>

          <div className="mt-6">
            <BibleDictionaryExplorer />
          </div>
        </div>
      </main>
    );
  }

  let materialsQuery = supabase
    .from("materials")
    .select("id, title, description, views, display_order")
    .eq("category_id", category.id)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (query) {
    materialsQuery = materialsQuery.or(
      `title.ilike.%${query}%,description.ilike.%${query}%`
    );
  }

  const { data: materials, error: materialsError } = await materialsQuery;

  if (materialsError) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <h1 className="text-3xl font-bold">Erro ao carregar materiais</h1>
            <p className="mt-4 text-zinc-400">
              Não foi possível carregar os materiais desta categoria.
            </p>
            <Link
              href="/categorias"
              className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Voltar para categorias
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const typedMaterials = (materials || []) as Material[];

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/categorias"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          <span>←</span>
          <span>Voltar para categorias</span>
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(13,17,28,0.96),rgba(17,24,39,0.94))] px-4 py-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] sm:mt-5 sm:rounded-[32px] sm:px-7 sm:py-7">
          <div
            className={`pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full blur-3xl ${accent.heroGlow}`}
          />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300 sm:text-xs">
              {accent.badge}
            </p>

            <h1 className="mt-3 text-[1.7rem] font-bold leading-tight text-white sm:text-4xl md:text-5xl">
              {category.name}
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
              Explore os materiais organizados nesta categoria e aprofunde seu
              estudo com mais clareza e ordem.
            </p>

            <div className="mt-5 sm:mt-6">
              <CategorySearchToggle categorySlug={slug} />
            </div>
          </div>
        </section>

        {query ? (
          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-lg shadow-black/10 sm:px-5">
            <p className="text-sm text-zinc-300">
              Resultados para{" "}
              <span className="font-semibold text-white">“{query}”</span>
            </p>
          </div>
        ) : null}

        {typedMaterials.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/[0.04] px-6 py-12 text-center shadow-xl shadow-black/10">
            <h2 className="text-xl font-semibold text-white">
              {query
                ? "Nenhum material encontrado"
                : "Nenhum material disponível"}
            </h2>

            <p className="mt-3 text-zinc-400">
              {query
                ? "Tente buscar por outro termo dentro desta categoria."
                : "Esta categoria ainda não possui materiais cadastrados."}
            </p>
          </div>
        ) : (
          <section className="mt-6">
            <CategoryScroll>
              {typedMaterials.map((material) => (
                <Link
                  key={material.id}
                  href={`/material/${material.id}`}
                  className="
                    group relative min-w-[78vw] max-w-[78vw] flex-shrink-0 snap-center
                    overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]
                    p-5 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.85)]
                    transition duration-300 active:scale-[0.985]
                    hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[0.06]
                    hover:shadow-[0_24px_60px_-25px_rgba(0,0,0,0.9)]
                    sm:min-w-0 sm:max-w-none sm:snap-start sm:p-6 sm:active:scale-100
                  "
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

                  <div className="relative flex min-h-[190px] flex-col justify-between sm:min-h-[220px]">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-[11px]">
                          Material
                        </span>

                        <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                          {material.views ?? 0} leituras
                        </div>
                      </div>

                      <h2 className="mt-5 text-lg font-semibold leading-snug text-white transition group-hover:text-amber-300 sm:text-2xl">
                        {material.title}
                      </h2>

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-400 sm:line-clamp-3">
                        {material.description || "Sem descrição cadastrada."}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="font-medium text-amber-400 transition group-hover:text-amber-300">
                        Abrir material
                      </span>

                      <span className="text-zinc-500 transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </CategoryScroll>
          </section>
        )}
      </div>
    </main>
  );
}