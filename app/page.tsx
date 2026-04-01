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
    ? "Acessar acervo"
    : "Entrar para acessar";

  const secondaryHref = "/categorias";
  const secondaryLabel = "Ver categorias";

  const heroDescription = isLoggedIn
    ? "Continue sua leitura e estudo no Acervo Logos."
    : "Um ambiente simples e organizado para leitura e estudo teológico.";

  const { data: materiais } = await supabase
    .from("materials")
    .select("id, title, description, views")
    .order("views", { ascending: false })
    .limit(6);

  return (
    <main className="min-h-screen bg-[#05060a] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#05060a]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(20,30,70,0.18),transparent_40%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(245,158,11,0.10),transparent_25%)]" />
      </div>

      {/* MOBILE PREMIUM */}
      <div className="md:hidden">
        {/* HERO LIMPO */}
        <section className="flex min-h-[100svh] items-center px-5 pb-12 pt-8">
          <div className="mx-auto w-full max-w-md text-center">
            <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-300">
              Acervo Logos
            </span>

            <h1 className="mt-6 text-[2.2rem] font-bold leading-[1.05] tracking-tight">
              Leitura e estudo{" "}
              <span className="bg-gradient-to-r from-white to-amber-400 bg-clip-text text-transparent">
                teológico
              </span>
            </h1>

            <p className="mt-4 text-sm leading-6 text-zinc-400">
              {heroDescription}
            </p>

            {/* CTA PRINCIPAL */}
            <div className="mt-8 space-y-3">
              <Link
                href={primaryHref}
                className="flex h-12 w-full items-center justify-center rounded-full bg-amber-400 text-sm font-semibold text-black shadow-[0_0_20px_rgba(245,158,11,0.25)] transition hover:bg-amber-300"
              >
                {primaryLabel}
              </Link>

              <Link
                href={secondaryHref}
                className="flex h-11 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm text-white transition hover:bg-white/[0.06]"
              >
                {secondaryLabel}
              </Link>
            </div>

            {/* INDICADOR */}
            <div className="mt-12 flex justify-center">
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <span className="text-[10px] tracking-[0.25em]">
                  EXPLORAR
                </span>
                <span className="animate-bounce text-lg">↓</span>
              </div>
            </div>
          </div>
        </section>

        {/* TRANSIÇÃO SUAVE */}
        <section className="relative -mt-10 rounded-t-[2.5rem] bg-[#080a10] pt-6 pb-10 px-5 border-t border-white/10">
          <div className="mx-auto max-w-md space-y-6">
            {/* HANDLE */}
            <div className="flex justify-center">
              <span className="h-1.5 w-14 rounded-full bg-white/10" />
            </div>

            {/* MAIS LIDOS (EDITORIAL) */}
            <div>
              <div className="mb-3">
                <p className="text-[11px] tracking-[0.25em] text-zinc-500">
                  DESTAQUES
                </p>
                <h2 className="text-xl font-semibold text-white">
                  Mais lidos
                </h2>
              </div>

              <HomeMostReadCarousel
                materials={materiais ?? []}
                isLoggedIn={isLoggedIn}
              />
            </div>

            {/* BLOCOS SIMPLES */}
            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium">Leitura direta em PDF</p>
                <p className="mt-2 text-xs text-zinc-400">
                  Estude de forma contínua dentro do próprio sistema.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-medium">Organização clara</p>
                <p className="mt-2 text-xs text-zinc-400">
                  Categorias e materiais estruturados para facilitar o estudo.
                </p>
              </div>
            </div>

            {/* CTA FINAL */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-lg font-semibold">
                {isLoggedIn ? "Continue estudando" : "Entre para acessar"}
              </h3>

              <p className="mt-2 text-sm text-zinc-400">
                {isLoggedIn
                  ? "Seu acesso já está liberado."
                  : "Acesse todo o conteúdo do acervo."}
              </p>

              <Link
                href={primaryHref}
                className="mt-4 flex h-11 w-full items-center justify-center rounded-full bg-amber-400 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                {primaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* DESKTOP (inalterado) */}
      <div className="hidden md:block">
        <div className="p-10 text-center text-zinc-400">
          Versão desktop preservada
        </div>
      </div>
    </main>
  );
}