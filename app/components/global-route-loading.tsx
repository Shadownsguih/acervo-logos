export default function GlobalRouteLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,24,34,0.92),rgba(9,11,17,0.96))] px-8 py-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />

        <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.32em] text-amber-300">
          Carregando
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-3 w-3 animate-pulse rounded-full bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]" />
          <span
            className="h-3 w-3 animate-pulse rounded-full bg-white/80"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="h-3 w-3 animate-pulse rounded-full bg-white/55"
            style={{ animationDelay: "240ms" }}
          />
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-white">
          Abrindo a próxima página
        </h2>

        <p className="mt-3 text-sm leading-7 text-zinc-400">
          Estamos preparando o próximo ambiente para manter a navegação suave e
          responsiva.
        </p>

        <div className="mt-6 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
          <div className="h-2 w-full animate-[route-loader_1.1s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.16),rgba(251,191,36,0.95),rgba(255,255,255,0.6))]" />
        </div>
      </div>
    </div>
  );
}
