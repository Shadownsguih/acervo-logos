import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Categoria = {
  id: string;
  name: string;
  slug: string | null;
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

function getCategoryRouteParam(category: Categoria) {
  if (category.slug && category.slug.trim()) {
    return normalizeCategoryPath(category.slug);
  }

  return normalizeCategoryPath(category.name);
}

export default async function CategoriasPage() {
  const { data: categorias, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold sm:text-4xl">Categorias</h1>
          <p className="mt-4 text-red-400">
            Erro ao carregar as categorias.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para a home
          </Link>
        </div>
      </main>
    );
  }

  const typedCategorias = (categorias ?? []) as Categoria[];

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
          <Link
            href="/"
            className="mb-6 inline-block text-sm font-medium text-amber-400 hover:text-amber-300 sm:mb-8"
          >
            ← Voltar para a home
          </Link>

          <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300 sm:px-4 sm:text-sm">
            Acervo Logos
          </span>

          <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-tight sm:mt-6 sm:text-5xl md:text-6xl">
            Explore as categorias do acervo
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:mt-6 sm:text-lg">
            Escolha uma área do acervo para visualizar os materiais organizados
            por tema e continuar sua leitura diretamente na plataforma.
          </p>

          <div className="mt-8 sm:mt-10">
            <div className="inline-flex rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-300 sm:px-6">
              {typedCategorias.length} categorias disponíveis
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="mb-8 sm:mb-10">
          <p className="text-xs uppercase tracking-[0.32em] text-amber-400 sm:text-sm sm:tracking-[0.35em]">
            Categorias
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl md:text-4xl">
            Escolha uma área do acervo
          </h2>
        </div>

        {typedCategorias.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {typedCategorias.map((categoria) => (
              <Link
                key={categoria.id}
                href={`/categoria/${getCategoryRouteParam(categoria)}`}
                className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition duration-300 hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.06] sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-400 sm:text-xs sm:tracking-[0.25em]">
                      Categoria
                    </span>

                    <h3 className="mt-4 text-xl font-semibold text-white sm:mt-5 sm:text-2xl">
                      {categoria.name}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      Acesse os materiais organizados nesta categoria e continue
                      sua leitura no Acervo Logos.
                    </p>
                  </div>

                  <span className="text-xl text-amber-400 transition group-hover:translate-x-1 sm:text-2xl">
                    →
                  </span>
                </div>

                <div className="mt-6 h-px w-full bg-gradient-to-r from-amber-400/30 via-white/10 to-transparent sm:mt-8" />

                <span className="mt-5 inline-block text-sm font-medium text-amber-400 sm:mt-6">
                  Abrir categoria
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400 sm:p-8">
            Nenhuma categoria cadastrada até o momento.
          </div>
        )}
      </section>
    </main>
  );
}