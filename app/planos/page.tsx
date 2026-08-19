import Link from "next/link";
import { buildPlanWhatsAppLink } from "@/lib/whatsapp";

const PLANS = [
  {
    id: "mensal",
    badge: "Entrada imediata",
    title: "Assinatura mensal",
    price: "R$ 15",
    cadence: "/mes",
    description:
      "Para quem quer comecar agora.",
    highlights: [
      "Acesso completo ao acervo",
      "Biblia, PDFs e Logos IA",
      "Renovacao mes a mes",
    ],
    buttonLabel: "Escolher mensal",
    whatsappLabel: "Mensal - R$ 15 por mes",
  },
  {
    id: "anual",
    badge: "Melhor escolha",
    title: "Assinatura anual",
    price: "R$ 140",
    cadence: "/ano",
    monthlyEquivalent: "equivale a R$ 11,67 por mes",
    savingsLabel: "Economize R$ 40 no ano",
    compareAt: "R$ 180 no plano mensal",
    description:
      "Para quem quer estudar o ano inteiro com mais economia.",
    highlights: [
      "Acesso completo ao acervo",
      "Biblia, PDFs e Logos IA",
      "Melhor custo-beneficio",
    ],
    buttonLabel: "Escolher anual",
    whatsappLabel: "Anual - R$ 140 por ano",
    featured: true,
  },
];

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-10 text-white md:px-6 md:py-14">
      <div className="mx-auto max-w-5xl">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
            Assinaturas
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Escolha seu acesso
          </h1>
          <p className="mt-5 text-sm leading-7 text-zinc-300 md:text-base md:leading-8">
            Um plano simples para comecar agora ou a opcao anual para economizar
            e manter seus estudos em ritmo constante.
          </p>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-2">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`relative flex h-full flex-col rounded-[32px] border p-6 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.7)] md:p-8 ${
                plan.featured
                  ? "border-amber-300/30 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(255,255,255,0.04))]"
                  : "border-white/10 bg-white/[0.02]"
              }`}
            >
              {plan.featured ? (
                <div className="absolute right-5 top-5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black">
                  Melhor valor
                </div>
              ) : null}

              <span
                className={`mx-auto inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                  plan.featured
                    ? "bg-amber-300/15 text-amber-200"
                    : "bg-white/8 text-zinc-300"
                }`}
              >
                {plan.badge}
              </span>

              <h2 className="mt-5 text-center text-2xl font-bold">
                {plan.title}
              </h2>
              <p className="mt-2 text-center text-sm leading-7 text-zinc-300">
                {plan.description}
              </p>

              <div className="mt-7 flex items-end justify-center gap-2">
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="pb-1 text-sm text-zinc-400">
                  {plan.cadence}
                </span>
              </div>

              {"compareAt" in plan ? (
                <p className="mt-2 text-center text-sm text-zinc-400 line-through">
                  {plan.compareAt}
                </p>
              ) : null}

              {"monthlyEquivalent" in plan ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-center text-xs font-semibold text-amber-200">
                    {plan.monthlyEquivalent}
                  </span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-center text-xs font-semibold text-emerald-200">
                    {plan.savingsLabel}
                  </span>
                </div>
              ) : null}

              <div className="mt-8 flex-1 space-y-3">
                {plan.highlights.map((item) => (
                  <div
                    key={item}
                    className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-3 text-center"
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    <p className="text-sm leading-6 text-zinc-200">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <a
                  href={buildPlanWhatsAppLink(plan.whatsappLabel)}
                  target="_blank"
                  rel="noreferrer"
                  className={`mx-auto inline-flex min-h-[50px] w-full max-w-[320px] items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition ${
                    plan.featured
                      ? "bg-amber-400 text-black hover:bg-amber-300"
                      : "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08]"
                  }`}
                >
                  {plan.buttonLabel}
                </a>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-10 text-center">
          <p className="text-sm leading-7 text-zinc-400">
            Depois de escolher um plano, voce sera redirecionado para o
            WhatsApp para concluir seu acesso.
          </p>

          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex min-h-[46px] w-full max-w-[260px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
            >
              Ir para login
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-[46px] w-full max-w-[260px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.07]"
            >
              Voltar para a home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
