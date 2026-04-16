"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ReaderSearchItem = {
  id: string;
  title: string;
  description: string | null;
  readerHref: string;
  destinationLabel: string;
};

type ReaderQuickSwitcherProps = {
  currentDocumentTitle: string;
  variant?: "floating" | "embedded";
  floatingLabel?: string;
  readerBasePath?: "/ler";
  readerQueryValue?: "v1" | "v2";
};

const MOBILE_BREAKPOINT = 768;

export default function ReaderQuickSwitcher({
  currentDocumentTitle,
  variant = "floating",
  floatingLabel,
  readerBasePath = "/ler",
  readerQueryValue,
}: ReaderQuickSwitcherProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReaderSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  const isEmbedded = variant === "embedded";

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setErrorMessage("");
      }
    }

    if (!open) {
      return;
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/reader-search?q=${encodeURIComponent(trimmed)}`
        );

        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);

    return () => window.clearTimeout(focusTimer);
  }, [open]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      setErrorMessage("Digite o nome de um material.");
      inputRef.current?.focus();
      return;
    }

    setErrorMessage("");
    setOpen(false);
    router.push(
      `/buscar?q=${encodeURIComponent(trimmed)}${
        readerQueryValue ? `&reader=${readerQueryValue}` : ""
      }`
    );
  }

  function handleToggle() {
    setOpen((prev) => !prev);
    setErrorMessage("");
  }

  function handleClose() {
    setOpen(false);
    setErrorMessage("");
  }

  function resolveReaderHref(href: string) {
    let nextHref = href;

    if (href.startsWith("/ler/") && readerBasePath !== "/ler") {
      nextHref = href.replace("/ler/", `${readerBasePath}/`);
    }

    if (!readerQueryValue) {
      return nextHref;
    }

    const separator = nextHref.includes("?") ? "&" : "?";
    return `${nextHref}${separator}reader=${readerQueryValue}`;
  }

  return (
    <div
      ref={wrapperRef}
      className={
        isEmbedded
          ? "relative"
          : `fixed z-40 ${
              isMobile
                ? "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4"
                : "bottom-24 right-5"
            }`
      }
    >
      {open ? (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity ${
              open ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleClose}
          />

          <div
            className={`fixed z-50 overflow-hidden border border-white/10 bg-[#0f1117] text-white shadow-2xl transition-all duration-200 ${
              isMobile
                ? "left-0 right-0 bottom-0 rounded-t-[1.5rem] rounded-b-none"
                : isEmbedded
                ? "bottom-24 right-6 w-[min(92vw,420px)] rounded-2xl"
                : "bottom-24 right-5 w-[min(92vw,380px)] rounded-2xl"
            }`}
            style={
              isMobile
                ? {
                    maxHeight: "78vh",
                    paddingBottom: "env(safe-area-inset-bottom)",
                  }
                : undefined
            }
          >
            <div className="border-b border-white/10 bg-[#12151d] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-amber-400">
                    Troca rápida
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-white">
                    Abrir outro material
                  </h2>
                  <p className="mt-1 truncate text-[11px] text-zinc-400">
                    Lendo agora: {currentDocumentTitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div
              className={`overflow-y-auto ${
                isMobile ? "max-h-[calc(78vh-68px)] p-4" : "p-4"
              }`}
            >
              <form onSubmit={handleSubmit}>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#151821] px-3 py-2.5 transition focus-within:border-amber-400/30">
                  <span aria-hidden="true" className="text-sm text-zinc-500">
                    🔎
                  </span>

                  <input
                    ref={inputRef}
                    type="text"
                    name="q"
                    value={query}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuery(value);

                      if (value.trim()) {
                        setErrorMessage("");
                      }

                      setOpen(true);
                    }}
                    onFocus={() => {
                      if (results.length > 0 || query.trim().length >= 2) {
                        setOpen(true);
                      }
                    }}
                    placeholder="Buscar outro material..."
                    className="w-full border-none bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
                  />

                  <button
                    type="submit"
                    className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/[0.08]"
                  >
                    Buscar
                  </button>
                </div>
              </form>

              {errorMessage ? (
                <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
              ) : null}

              {query.trim().length >= 2 ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d12]">
                  {loading ? (
                    <div className="px-4 py-3 text-sm text-zinc-400">
                      Buscando...
                    </div>
                  ) : results.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto">
                      {results.map((item) => (
                        <Link
                          key={item.id}
                          href={resolveReaderHref(item.readerHref)}
                          onClick={() => {
                            setOpen(false);
                            setErrorMessage("");
                          }}
                          className="block border-b border-white/10 px-4 py-3 transition last:border-b-0 hover:bg-white/[0.04]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-zinc-100">
                                {item.title}
                              </p>

                              {item.description ? (
                                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>

                            <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-amber-400">
                              {item.destinationLabel}
                            </span>
                          </div>
                        </Link>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = query.trim();

                          if (!trimmed) {
                            setErrorMessage("Digite o nome de um material.");
                            inputRef.current?.focus();
                            return;
                          }

                          setErrorMessage("");
                          setOpen(false);
                          router.push(
                            `/buscar?q=${encodeURIComponent(trimmed)}${
                              readerQueryValue
                                ? `&reader=${readerQueryValue}`
                                : ""
                            }`
                          );
                        }}
                        className="w-full bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-amber-400 transition hover:bg-white/[0.06]"
                      >
                        Ver todos os resultados →
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-3 text-sm text-zinc-400">
                      Nenhum material encontrado.
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">
                  Digite pelo menos 2 letras para buscar outro material.
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className={
            isEmbedded
              ? `inline-flex items-center justify-center gap-2 border font-medium transition ${
                  isMobile
                    ? "rounded-xl border-white/10 bg-black/20 px-3 py-2 text-xs text-white hover:bg-white/5"
                    : "rounded-full border-white/12 bg-[#10131a]/92 px-3.5 py-2.5 text-[12px] text-zinc-100 shadow-[0_10px_24px_rgba(0,0,0,0.22)] hover:border-white/20 hover:bg-[#151922]"
                }`
              : `inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-white/15 ${
                  isMobile ? "px-3.5 py-3 text-[13px]" : "px-4 py-3 text-sm"
                }`
          }
          title="Alternar entre PDFs"
        >
          <span aria-hidden="true">🔎</span>
          <span>
            {isEmbedded
              ? "Trocar PDF"
              : isMobile
              ? floatingLabel ?? "Buscar"
              : floatingLabel ?? "Troca rápida"}
          </span>
        </button>
      )}
    </div>
  );
}
