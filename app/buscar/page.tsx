import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Material = {
  id: string;
  title: string;
  description: string | null;
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; reader?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() || "";

  if (!query) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold sm:text-4xl">Busca</h1>
          <p className="mt-4 text-zinc-400">
            Digite um termo para buscar materiais.
          </p>
        </div>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("materials")
    .select("id, title, description")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("title", { ascending: true });

  const materials = (data as Material[] | null) ?? [];

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold sm:text-4xl">Erro na busca</h1>
          <p className="mt-4 text-red-400">{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-12 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-amber-400 hover:text-amber-300 sm:mb-8"
        >
          ← Voltar para a home
        </Link>

        <h1 className="text-3xl font-bold sm:text-4xl">Resultados da busca</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          Termo pesquisado:{" "}
          <span className="font-medium text-white">&quot;{query}&quot;</span>
        </p>

        {materials.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
            {materials.map((material) => (
              <article
                key={material.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-amber-400/40 hover:bg-white/[0.07] sm:p-6"
              >
                <h2 className="text-lg font-semibold sm:text-xl">
                  {material.title}
                </h2>

                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  {material.description || "Sem descricao cadastrada."}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6">
                  <Link
                    href={`/ler/${material.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15"
                  >
                    Abrir leitura
                  </Link>

                  <Link
                    href={`/material/${material.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    Ver material
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-zinc-400 sm:mt-10">
            Nenhum material encontrado para esse termo.
          </div>
        )}
      </div>
    </main>
  );
}
