"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";
const BASE_STORAGE_KEY = "acervo-logos:mobile-app-tutorial";

type TutorialHighlight = {
  className: string;
};

type TutorialStep = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  cardClassName: string;
  highlights?: TutorialHighlight[];
};

type TutorialConfig = {
  id: string;
  routeMatcher: (pathname: string) => boolean;
  steps: TutorialStep[];
  openDelayMs?: number;
};

const HOME_TUTORIAL: TutorialConfig = {
  id: "home",
  routeMatcher: (pathname) => pathname === "/",
  openDelayMs: 450,
  steps: [
    {
      id: "menu",
      eyebrow: "Comece por aqui",
      title: "Abra o menu lateral",
      description:
        "Toque nos 3 pontinhos no topo para acessar categorias, Biblia, perfil, favoritos e os atalhos principais do Acervo Logos.",
      cardClassName: "left-4 top-24 max-w-[280px] sm:left-5 sm:top-28",
      highlights: [
        {
          className:
            "left-3 top-3 h-14 w-14 rounded-2xl border border-amber-300/35 bg-amber-300/12 shadow-[0_0_0_1px_rgba(251,191,36,0.12),0_0_36px_rgba(245,158,11,0.24)]",
        },
      ],
    },
    {
      id: "categorias",
      eyebrow: "Explore o acervo",
      title: "Entre pelas categorias",
      description:
        "Use Categorias para navegar pelos materiais organizados. A Biblia abre direto no leitor, sem telas intermediarias.",
      cardClassName: "right-4 top-[34vh] max-w-[290px] sm:right-5",
      highlights: [
        {
          className:
            "left-1/2 top-[36vh] h-12 w-[88vw] max-w-[360px] -translate-x-1/2 rounded-[20px] border border-sky-300/20 bg-sky-300/8 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_0_30px_rgba(56,189,248,0.12)]",
        },
      ],
    },
    {
      id: "recursos",
      eyebrow: "Estude melhor",
      title: "Descubra os recursos do app",
      description:
        "A home leva voce rapido para favoritos, leitura recente, Biblia e categorias. O objetivo aqui e entrar no conteudo com poucos toques.",
      cardClassName:
        "left-1/2 top-[58vh] w-[calc(100%-32px)] max-w-[320px] -translate-x-1/2 sm:top-[60vh]",
      highlights: [
        {
          className:
            "left-1/2 top-[58vh] h-16 w-[92vw] max-w-[360px] -translate-x-1/2 rounded-[24px] border border-white/10 bg-white/[0.03]",
        },
      ],
    },
  ],
};

const BIBLE_READER_TUTORIAL: TutorialConfig = {
  id: "bible-reader",
  routeMatcher: (pathname) => pathname === "/biblia",
  openDelayMs: 700,
  steps: [
    {
      id: "top-nav",
      eyebrow: "Navegacao",
      title: "Escolha traducao, livro e capitulo",
      description:
        "No topo do leitor voce controla a traducao e a referencia. Toque nesses campos para mudar rapidamente o texto que esta estudando.",
      cardClassName: "left-4 top-24 max-w-[290px] sm:left-5 sm:top-28",
      highlights: [
        {
          className:
            "left-3 right-3 top-[72px] h-[148px] rounded-[24px] border border-amber-300/30 bg-amber-300/10 shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_0_36px_rgba(245,158,11,0.18)]",
        },
      ],
    },
    {
      id: "search-layer",
      eyebrow: "Consulta",
      title: "Use a busca e a camada original",
      description:
        "A lupa abre a busca no proprio leitor. O botao Hebraico ou Grego mostra o texto original acima do portugues quando o recurso estiver disponivel.",
      cardClassName: "right-4 top-[34vh] max-w-[290px] sm:right-5",
      highlights: [
        {
          className:
            "right-[84px] top-[88px] h-11 w-[112px] rounded-full border border-sky-300/30 bg-sky-300/10 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_0_30px_rgba(56,189,248,0.14)]",
        },
        {
          className:
            "right-4 top-[140px] h-12 w-12 rounded-2xl border border-sky-300/30 bg-sky-300/10 shadow-[0_0_0_1px_rgba(125,211,252,0.08),0_0_30px_rgba(56,189,248,0.14)]",
        },
      ],
    },
    {
      id: "verse-actions",
      eyebrow: "Estudo no versiculo",
      title: "Segure para abrir as ferramentas",
      description:
        "No mobile, segure uma palavra ou versiculo para abrir o submenu com dicionario, compartilhar e consultar outra versao daquele trecho.",
      cardClassName:
        "left-1/2 top-[60vh] w-[calc(100%-32px)] max-w-[320px] -translate-x-1/2",
      highlights: [
        {
          className:
            "left-3 right-3 top-[47vh] h-[28vh] rounded-[28px] border border-white/12 bg-white/[0.03]",
        },
      ],
    },
  ],
};

const TUTORIALS = [HOME_TUTORIAL, BIBLE_READER_TUTORIAL];

function getStorageKey(tutorialId: string, userKey: string) {
  return `${BASE_STORAGE_KEY}:${userKey}:${tutorialId}:seen`;
}

export default function MobileAppTutorial({
  userKey,
}: {
  userKey: string | null;
}) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const activeTutorial = useMemo(
    () => TUTORIALS.find((tutorial) => tutorial.routeMatcher(pathname)) ?? null,
    [pathname]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!activeTutorial || !userKey) {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
    const hasSeenTutorial =
      window.localStorage.getItem(getStorageKey(activeTutorial.id, userKey)) ===
      "true";

    if (!mediaQuery.matches || hasSeenTutorial) {
      return;
    }

    const openTimer = window.setTimeout(() => {
      setIsVisible(true);
      setCurrentStepIndex(0);
    }, activeTutorial.openDelayMs ?? 450);

    return () => {
      window.clearTimeout(openTimer);
    };
  }, [activeTutorial, userKey]);

  const steps = activeTutorial?.steps ?? [];
  const currentStep = steps[currentStepIndex] ?? null;

  function closeTutorial() {
    if (typeof window !== "undefined" && activeTutorial && userKey) {
      window.localStorage.setItem(
        getStorageKey(activeTutorial.id, userKey),
        "true"
      );
    }

    setIsVisible(false);
    setCurrentStepIndex(0);
  }

  function goToNextStep() {
    if (!activeTutorial) {
      return;
    }

    if (currentStepIndex >= activeTutorial.steps.length - 1) {
      closeTutorial();
      return;
    }

    setCurrentStepIndex((value) => value + 1);
  }

  if (!isVisible || !activeTutorial || !currentStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] md:hidden">
      <div className="absolute inset-0 bg-black/72 backdrop-blur-[2px]" />

      {(currentStep.highlights ?? []).map((highlight, index) => (
        <div
          key={`${currentStep.id}:highlight:${index}`}
          className={`pointer-events-none absolute ${highlight.className}`}
        />
      ))}

      <section
        className={`absolute ${currentStep.cardClassName} overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,19,29,0.98),rgba(10,12,18,0.98))] p-4 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.92)]`}
      >
        <div className="pointer-events-none absolute -right-8 top-0 h-20 w-20 rounded-full bg-amber-300/12 blur-2xl" />

        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/85">
            {currentStep.eyebrow}
          </p>

          <h2 className="mt-2 text-lg font-semibold leading-tight text-white">
            {currentStep.title}
          </h2>

          <p className="mt-3 text-sm leading-6 text-zinc-300">
            {currentStep.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStepIndex
                      ? "w-6 bg-amber-300"
                      : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeTutorial}
                className="inline-flex min-h-9 items-center justify-center rounded-full border border-white/10 px-3 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                Pular
              </button>

              <button
                type="button"
                onClick={goToNextStep}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-black transition hover:bg-amber-300"
                aria-label={
                  currentStepIndex >= steps.length - 1
                    ? "Concluir tutorial"
                    : "Proximo passo"
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
