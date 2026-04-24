import Link from "next/link";
import { supabase } from "@/lib/supabase";
import CategoriesContinueReadingCard from "@/app/components/categories-continue-reading-card";
import CategoryScroll from "@/app/components/category-scroll";
import { BIBLE_VIRTUAL_CATEGORY } from "@/lib/bible-reader";

type Categoria = {
  id: string;
  name: string;
  slug: string | null;
};

type CategoryVisual = {
  gradient: string;
  glow: string;
  icon: string;
  badge: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeCategoryPath(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCategoryRouteParam(category: Categoria) {
  if (category.slug && category.slug.trim()) {
    return normalizeCategoryPath(category.slug);
  }

  return normalizeCategoryPath(category.name);
}

function getCategoryVisual(name: string): CategoryVisual {
  const normalized = normalizeText(name);

  if (normalized.includes("biblia")) {
    return {
      gradient: "from-amber-500 via-yellow-500 to-orange-600",
      glow: "bg-amber-300/25",
      icon: "📖",
      badge: "Bíblias",
    };
  }

  if (normalized.includes("comentario")) {
    return {
      gradient: "from-indigo-600 via-blue-600 to-sky-500",
      glow: "bg-blue-300/25",
      icon: "📚",
      badge: "Comentários",
    };
  }

  if (normalized.includes("dicionario")) {
    return {
      gradient: "from-emerald-600 via-teal-500 to-cyan-500",
      glow: "bg-emerald-300/25",
      icon: "🔎",
      badge: "Consulta",
    };
  }

  return {
    gradient: "from-slate-700 via-slate-600 to-slate-800",
    glow: "bg-slate-300/10",
    icon: "📘",
    badge: "Acervo",
  };
}

export default async function CategoriasPage() {
  const { data: categorias, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#050816] px-4 py-8 text-white sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              <span>←</span>
              <span>Voltar para a home</span>
            </Link>

            <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Categorias</h1>

            <p className="mt-4 text-base text-red-400">
              Erro ao carregar as categorias.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const typedCategorias = (categorias ?? []) as Categoria[];
  const hasBibleCategory = typedCategorias.some((categoria) => {
    const normalized = normalizeCategoryPath(categoria.slug || categoria.name);
    return normalized === "biblia";
  });
  const categoriesWithVirtualBible = hasBibleCategory
    ? typedCategorias
    : [BIBLE_VIRTUAL_CATEGORY, ...typedCategorias];

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-5 sm:px-6 sm:pb-14 sm:pt-8">
        <div className="space-y-4 sm:space-y-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200"
          >
            ← Voltar
          </Link>

          <CategoriesContinueReadingCard />
        </div>

        <section className="mt-6">
          <CategoryScroll>
            {categoriesWithVirtualBible.map((categoria) => {
              const visual = getCategoryVisual(categoria.name);

              return (
                <Link
                  key={categoria.id}
                  href={`/categoria/${getCategoryRouteParam(categoria)}`}
                  className={`
                    group relative min-w-[78vw] max-w-[78vw] flex-shrink-0 snap-center
                    rounded-[24px] border border-white/10
                    bg-gradient-to-br ${visual.gradient}
                    p-4 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.85)]
                    transition duration-300 active:scale-[0.985]
                    hover:-translate-y-1 hover:shadow-lg
                    sm:min-w-0 sm:max-w-none sm:snap-start sm:p-6 sm:active:scale-100
                  `}
                >
                  <div
                    className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${visual.glow}`}
                  />

                  <div className="relative flex min-h-[168px] flex-col justify-between sm:min-h-[200px]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[10px] uppercase text-white/80">
                        {visual.badge}
                      </span>

                      <div className="text-lg">{visual.icon}</div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-base font-bold text-white sm:text-2xl">
                        {categoria.name}
                      </h3>

                      <p className="mt-2 text-xs text-white/70 sm:text-sm">
                        Toque para abrir esta categoria e visualizar os materiais.
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs text-white/90 sm:text-sm">
                        Abrir categoria
                      </span>

                      <span className="text-white transition group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CategoryScroll>
        </section>
      </section>
    </main>
  );
}
