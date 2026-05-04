"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatRecentReadingRelativeText } from "@/app/components/recent-reading-utils";
import { useLastReadDocument } from "@/app/components/use-last-read-document";

export default function HomeRecentReadingCard() {
  const lastRead = useLastReadDocument();
  const isLoaded = lastRead !== undefined;

  const subtitle = useMemo(() => {
    if (!lastRead) {
      return "";
    }

    return formatRecentReadingRelativeText(lastRead.updatedAt);
  }, [lastRead]);

  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(13,17,28,0.96),rgba(17,24,39,0.94))] p-5 shadow-[0_18px_60px_-28px_rgba(0,0,0,0.9)] sm:rounded-[28px] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300 sm:text-xs">
            Leitura recente
          </p>

          <h3 className="mt-3 text-lg font-bold text-white sm:text-2xl">
            Continue de onde parou
          </h3>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-sm font-semibold text-indigo-100 shadow-lg shadow-black/20">
          Ler
        </div>
      </div>

      {!isLoaded ? (
        <div className="mt-6 animate-pulse">
          <div className="h-6 w-2/3 rounded-xl bg-white/10" />
          <div className="mt-3 h-4 w-40 rounded-xl bg-white/10" />
          <div className="mt-6 h-11 w-36 rounded-full bg-white/10" />
        </div>
      ) : lastRead ? (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300">
              {lastRead.documentType === "volume" ? "Volume" : "Material"}
            </span>

            {lastRead.lastPage ? (
              <span className="inline-flex rounded-full border border-indigo-300/15 bg-indigo-400/10 px-3 py-2 text-xs font-medium text-indigo-100">
                Pagina {lastRead.lastPage}
              </span>
            ) : null}
          </div>

          <h4 className="mt-4 text-base font-semibold leading-snug text-white sm:text-lg">
            {lastRead.documentTitle}
          </h4>

          <p className="mt-2 text-sm leading-6 text-indigo-100/80">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={lastRead.readerHref}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Retomar leitura
            </Link>

            <Link
              href="/perfil#leituras-recentes"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Ver no perfil
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="mt-6 text-sm leading-7 text-zinc-400">
            Assim que voce abrir um material no reader, ele aparecera aqui para
            facilitar sua retomada no proximo acesso.
          </p>

          <div className="mt-6">
            <Link
              href="/categorias"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Explorar categorias
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
