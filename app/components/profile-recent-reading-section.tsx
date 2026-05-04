"use client";

import Link from "next/link";
import { useMemo } from "react";
import { formatRecentReadingRelativeText } from "@/app/components/recent-reading-utils";
import { useLastReadDocument } from "@/app/components/use-last-read-document";

type ProfileRecentReadingSectionProps = {
  variant?: "default" | "embedded";
};

export default function ProfileRecentReadingSection({
  variant = "default",
}: ProfileRecentReadingSectionProps) {
  const lastRead = useLastReadDocument();
  const isLoaded = lastRead !== undefined;
  const isEmbedded = variant === "embedded";

  const subtitle = useMemo(() => {
    if (!lastRead) {
      return "";
    }

    return formatRecentReadingRelativeText(lastRead.updatedAt);
  }, [lastRead]);

  return (
    <section
      className={
        isEmbedded
          ? "text-white md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-8 md:shadow-none"
          : "rounded-[24px] bg-[#171827] p-4 shadow-[0_18px_48px_-30px_rgba(0,0,0,0.85)] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-8 md:shadow-none"
      }
    >
      <div
        className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${
          isEmbedded ? "hidden md:flex" : ""
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
            Leitura recente
          </p>
          <h2 className="mt-2 text-xl font-bold md:text-2xl">
            Retome de onde parou
          </h2>
        </div>

        <div className="hidden w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:block md:w-auto">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Status
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {isLoaded
              ? lastRead
                ? "Leitura encontrada"
                : "Nenhuma leitura salva"
              : "Carregando..."}
          </p>
        </div>
      </div>

      {!isLoaded ? (
        <div
          className={`mt-5 animate-pulse rounded-3xl p-5 md:mt-6 md:border md:border-white/10 md:p-6 ${
            isEmbedded ? "bg-[#131722]" : "bg-[#12151d]"
          }`}
        >
          <div className="h-4 w-32 rounded-full bg-white/10" />
          <div className="mt-4 h-8 w-2/3 rounded-xl bg-white/10" />
          <div className="mt-3 h-4 w-40 rounded-xl bg-white/10" />
          <div className="mt-6 h-11 w-40 rounded-full bg-white/10" />
        </div>
      ) : lastRead ? (
        <div
          className={`mt-5 rounded-3xl p-5 md:mt-6 md:border md:border-white/10 md:p-6 ${
            isEmbedded
              ? "border border-white/8 bg-[#131722] shadow-none"
              : "bg-[linear-gradient(135deg,rgba(49,46,129,0.48),rgba(15,23,42,0.9))] shadow-[0_18px_60px_-30px_rgba(0,0,0,0.9)]"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-100">
                  Continuar leitura
                </span>

                <span className="inline-flex rounded-full border border-indigo-300/15 bg-indigo-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-indigo-100">
                  {lastRead.documentType === "volume" ? "Volume" : "Material"}
                </span>

                {lastRead.lastPage ? (
                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-200">
                    Pagina {lastRead.lastPage}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-4 text-lg font-bold text-white md:text-2xl">
                {lastRead.documentTitle}
              </h3>

              <p className="mt-2 text-sm text-indigo-100/80">{subtitle}</p>
            </div>

            <Link
              href={lastRead.readerHref}
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Retomar leitura
            </Link>
          </div>
        </div>
      ) : (
        <div
          className={`mt-5 rounded-3xl p-5 text-sm leading-7 text-zinc-400 md:mt-6 md:border md:border-dashed md:border-white/10 md:p-6 ${
            isEmbedded ? "bg-[#131722]" : "bg-[#12151d]"
          }`}
        >
          Voce ainda nao possui uma leitura recente salva. Assim que abrir um
          material no reader, ele aparecera aqui para voce continuar depois.
        </div>
      )}
    </section>
  );
}
