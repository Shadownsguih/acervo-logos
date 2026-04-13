"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LastReadDocument = {
  documentId: string;
  documentTitle: string;
  documentType: "material" | "volume";
  readerHref: string;
  updatedAt: number;
};

const LAST_DOCUMENT_STORAGE_KEY = "acervo-logos:last-read-document";

function formatRelativeText(updatedAt: number) {
  const now = Date.now();
  const diffMs = Math.max(0, now - updatedAt);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Lido agora há pouco";
  }

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return minutes === 1 ? "Lido há 1 minuto" : `Lido há ${minutes} minutos`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return hours === 1 ? "Lido há 1 hora" : `Lido há ${hours} horas`;
  }

  const days = Math.floor(diffMs / day);
  return days === 1 ? "Lido há 1 dia" : `Lido há ${days} dias`;
}

export default function CategoriesContinueReadingCard() {
  const [lastRead, setLastRead] = useState<LastReadDocument | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(LAST_DOCUMENT_STORAGE_KEY);

      if (!rawValue) {
        setIsLoaded(true);
        return;
      }

      const parsedValue = JSON.parse(rawValue) as Partial<LastReadDocument>;

      if (
        !parsedValue ||
        typeof parsedValue.documentId !== "string" ||
        typeof parsedValue.documentTitle !== "string" ||
        typeof parsedValue.documentType !== "string" ||
        typeof parsedValue.readerHref !== "string" ||
        typeof parsedValue.updatedAt !== "number"
      ) {
        setIsLoaded(true);
        return;
      }

      setLastRead({
        documentId: parsedValue.documentId,
        documentTitle: parsedValue.documentTitle,
        documentType: parsedValue.documentType as "material" | "volume",
        readerHref: parsedValue.readerHref,
        updatedAt: parsedValue.updatedAt,
      });
    } catch {
      setLastRead(null);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const subtitle = useMemo(() => {
    if (!lastRead) {
      return "";
    }

    return formatRelativeText(lastRead.updatedAt);
  }, [lastRead]);

  if (!isLoaded) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10 sm:rounded-[28px] sm:p-5">
        <div className="animate-pulse">
          <div className="h-3 w-32 rounded-full bg-white/10" />
          <div className="mt-4 h-7 w-52 rounded-xl bg-white/10" />
          <div className="mt-3 h-4 w-40 rounded-xl bg-white/10" />
          <div className="mt-6 h-11 w-36 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  if (!lastRead) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-xl shadow-black/10 sm:rounded-[28px] sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300 sm:text-xs">
              Continuar leitura
            </p>

            <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">
              Nenhuma leitura recente encontrada
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Abra um material do acervo e ele aparecerá aqui para você retomar
              depois com mais facilidade.
            </p>
          </div>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-xl text-zinc-300">
            📖
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 p-4 shadow-[0_18px_60px_-28px_rgba(0,0,0,0.9)] sm:rounded-[28px] sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-[80%]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300 sm:text-xs">
            Continuar leitura
          </p>

          <h2 className="mt-3 text-lg font-bold leading-snug text-white sm:text-2xl">
            {lastRead.documentTitle}
          </h2>

          <p className="mt-2 text-sm text-indigo-100/80">
            {subtitle}
          </p>
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-2xl text-indigo-300 shadow-lg shadow-black/20 sm:h-14 sm:w-14">
          📘
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300">
          {lastRead.documentType === "volume" ? "Volume" : "Material"}
        </div>

        <Link
          href={lastRead.readerHref}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
        >
          <span>Retomar leitura</span>
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}