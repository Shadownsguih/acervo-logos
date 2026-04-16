"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ReaderVolumeItem = {
  id: string;
  title: string;
  volume_number: number | null;
  href?: string;
};

type ReaderVolumeSwitcherProps = {
  materialTitle: string;
  currentReaderHref: string;
  items: ReaderVolumeItem[];
};

const MOBILE_BREAKPOINT = 768;

function getItemLabel(item: ReaderVolumeItem) {
  if (typeof item.volume_number === "number") {
    return `Vol. ${item.volume_number}`;
  }

  return "Principal";
}

export default function ReaderVolumeSwitcher({
  materialTitle,
  currentReaderHref,
  items,
}: ReaderVolumeSwitcherProps) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  if (items.length <= 1) {
    return null;
  }

  if (isMobile) {
    return (
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <div className="mb-3">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-400">
            PDFs do material
          </p>
          <p className="mt-1 truncate text-xs text-zinc-500">{materialTitle}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <label
            htmlFor="reader-volume-select"
            className="mb-2 block text-xs font-medium text-zinc-400"
          >
            Escolha o volume
          </label>

          <select
            id="reader-volume-select"
            value={currentReaderHref}
            onChange={(event) => {
              router.push(event.target.value);
            }}
            className="w-full rounded-xl border border-white/10 bg-[#11131a] px-4 py-3 text-sm font-medium text-white outline-none transition focus:border-amber-400/40"
          >
            {items.map((item) => {
              const href = item.href ?? `/ler/${item.id}`;

              return (
                <option key={item.id} value={href}>
                  {getItemLabel(item)} — {item.title}
                </option>
              );
            })}
          </select>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 md:p-4">
      <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <p className="text-[11px] uppercase tracking-[0.24em] text-amber-400">
          PDFs do material
        </p>

        <p className="truncate text-xs text-zinc-500">{materialTitle}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const href = item.href ?? `/ler/${item.id}`;
          const isActive = href === currentReaderHref;

          return (
            <Link
              key={item.id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                isActive
                  ? "border-amber-400/35 bg-amber-400/12 text-white"
                  : "border-white/10 bg-black/20 text-zinc-300 hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              }`}
              title={item.title}
            >
              <span className="font-medium">{getItemLabel(item)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
