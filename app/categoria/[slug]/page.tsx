import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CategorySearchToggle from "@/app/components/category-search-toggle";

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
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Categoria não encontrada</h1>
          <p className="mt-4 text-zinc-400">
            A categoria que você tentou acessar não existe.
          </p>
          <Link
            href="/categorias"
            className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para categorias
          </Link>
        </div>
      </main>
    );
  }

  const categories = (categoriesData ?? []) as Category[];
  const category =
    categories.find((item) => matchesCategoryRoute(item, slug)) ?? null;

  if (!category) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Categoria não encontrada</h1>
          <p className="mt-4 text-zinc-400">
            A categoria que você tentou acessar não existe.
          </p>
          <Link
            href="/categorias"
            className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para categorias
          </Link>
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
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Erro ao carregar materiais</h1>
          <p className="mt-4 text-zinc-400">
            Não foi possível carregar os materiais desta categoria.
          </p>
          <Link
            href="/categorias"
            className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para categorias
          </Link>
        </div>
      </main>
    );
  }

  const typedMaterials = (materials || []) as Material[];

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/categorias"
          className="mb-8 inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          ← Voltar para categorias
        </Link>

        <section className="mb-10 max-w-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
            Acervo Logos
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            {category.name}
          </h1>

          <p className="mt-4 text-lg text-zinc-300">
            Explore os materiais organizados nesta categoria e aprofunde seu
            estudo com mais clareza e ordem.
          </p>

          <div className="mt-6">
            <CategorySearchToggle categorySlug={slug} />
          </div>
        </section>

        {query ? (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="text-sm text-zinc-300">
              Resultados para:{" "}
              <span className="font-medium text-white">“{query}”</span>
            </p>
          </div>
        ) : null}

        {typedMaterials.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center">
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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {typedMaterials.map((material) => (
              <Link
                key={material.id}
                href={`/material/${material.id}`}
                className="group rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white transition group-hover:text-amber-300">
                      {material.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm text-zinc-400">
                      {material.description || "Sem descrição cadastrada."}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                    {material.views ?? 0} leituras
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="text-amber-400 transition group-hover:text-amber-300">
                    Abrir material
                  </span>
                  <span className="text-zinc-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}