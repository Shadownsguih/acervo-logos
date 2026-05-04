"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import MaterialFavoriteButton from "@/app/components/material-favorite-button";

type Material = {
  id: string;
  title: string;
  description: string | null;
  views: number;
};

type Props = {
  materials: Material[];
  isLoggedIn: boolean;
};

type Direction = "next" | "prev";

export default function HomeMostReadCarousel({
  materials,
  isLoggedIn,
}: Props) {
  const [index, setIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<Direction>("next");
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const total = materials.length;

  function clearResumeTimeout() {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }

  function pauseTemporarily(duration = 8000) {
    setIsPaused(true);
    clearResumeTimeout();

    resumeTimeoutRef.current = setTimeout(() => {
      setIsPaused(false);
    }, duration);
  }

  function getNextIndex(current: number) {
    return current === total - 1 ? 0 : current + 1;
  }

  function getPrevIndex(current: number) {
    return current === 0 ? total - 1 : current - 1;
  }

  function handleChange(nextIndex: number, newDirection: Direction) {
    if (isAnimating || total <= 1 || nextIndex === index) {
      return;
    }

    setDirection(newDirection);
    setIsAnimating(true);

    window.setTimeout(() => {
      setDisplayIndex(nextIndex);
    }, 160);

    window.setTimeout(() => {
      setIndex(nextIndex);
      setIsAnimating(false);
    }, 320);
  }

  function handlePrev() {
    pauseTemporarily();
    handleChange(getPrevIndex(index), "prev");
  }

  function handleNext() {
    pauseTemporarily();
    handleChange(getNextIndex(index), "next");
  }

  function handleIndicatorClick(targetIndex: number) {
    if (targetIndex === index) {
      return;
    }

    pauseTemporarily();
    handleChange(targetIndex, targetIndex > index ? "next" : "prev");
  }

  useEffect(() => {
    setDisplayIndex(index);
  }, [index]);

  useEffect(() => {
    if (isPaused || isAnimating || total <= 1) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setDirection("next");
      setIsAnimating(true);

      const nextIndex = index === total - 1 ? 0 : index + 1;

      window.setTimeout(() => {
        setDisplayIndex(nextIndex);
      }, 160);

      window.setTimeout(() => {
        setIndex(nextIndex);
        setIsAnimating(false);
      }, 320);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [index, isPaused, isAnimating, total]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const material = materials[displayIndex];

  if (!material) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-zinc-400 sm:p-6">
        Nenhum material disponivel.
      </div>
    );
  }

  const animationClass = isAnimating
    ? direction === "next"
      ? "translate-x-6 scale-[0.985] opacity-0"
      : "-translate-x-6 scale-[0.985] opacity-0"
    : "translate-x-0 scale-100 opacity-100";

  const accessLabel = isLoggedIn ? "Acesso liberado" : "Requer autenticacao";
  const accessHref = isLoggedIn
    ? `/material/${material.id}`
    : `/login?next=/material/${material.id}`;
  const accessButtonLabel = isLoggedIn
    ? "Acessar material ->"
    : "Entrar para acessar ->";
  const accessDescription = isLoggedIn
    ? "Voce ja esta logado e pode abrir este material agora."
    : "Entre com sua conta para abrir este material.";

  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm sm:rounded-3xl sm:p-6"
      onMouseEnter={() => {
        clearResumeTimeout();
        setIsPaused(true);
      }}
      onMouseLeave={() => {
        clearResumeTimeout();
        setIsPaused(false);
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_35%)]" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-6 sm:items-center">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">
              Destaques
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white sm:text-2xl">
              Mais lidos
            </h2>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={isAnimating || total <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Material anterior"
            >
              {"<"}
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isAnimating || total <= 1}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Proximo material"
            >
              {">"}
            </button>
          </div>
        </div>

        <div className="relative min-h-[220px] sm:min-h-[280px]">
          <div
            className={`rounded-[1.25rem] border border-white/10 bg-black/30 p-4 transition-all duration-300 ease-out sm:rounded-2xl sm:p-6 ${animationClass}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="rounded-full border border-amber-400/15 bg-amber-400/10 px-3 py-1 text-[11px] text-amber-300 sm:text-xs">
                Posicao {displayIndex + 1}
              </span>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500 sm:text-xs">
                  {material.views || 0} visualizacoes
                </span>

                <MaterialFavoriteButton
                  materialId={material.id}
                  variant="icon"
                  redirectTo={`/material/${material.id}`}
                />
              </div>
            </div>

            <h3 className="text-[15px] font-semibold leading-6 text-white sm:text-lg sm:leading-7">
              {material.title}
            </h3>

            <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400 sm:line-clamp-3 sm:leading-7">
              {material.description || "Material disponivel no acervo."}
            </p>

            <div className="mt-4 border-t border-white/10 pt-4 sm:mt-6">
              <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 sm:text-xs">
                {accessLabel}
              </p>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {accessDescription}
              </p>

              <Link
                href={accessHref}
                className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-amber-400 transition hover:text-amber-300"
              >
                {accessButtonLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-center gap-2">
          {materials.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleIndicatorClick(i)}
              disabled={isAnimating}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === displayIndex ? "w-8 bg-amber-400" : "w-5 bg-white/10 sm:w-6"
              }`}
              aria-label={`Ir para destaque ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
