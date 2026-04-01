"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchItem = {
  id: string;
  title: string;
  description: string | null;
};

type HeaderSearchProps = {
  mobileVariant?: "inline" | "icon";
};

export default function HeaderSearch({
  mobileVariant = "inline",
}: HeaderSearchProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const isUsingIconMobile = mobileVariant === "icon";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setErrorMessage("");
        setIsMobileExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isMobileExpanded) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [isMobileExpanded]);

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
          `/api/search?q=${encodeURIComponent(trimmed)}`
        );

        const data = await response.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();

    if (!trimmed) {
      setErrorMessage("Digite algo para realizar a busca.");
      setOpen(false);
      inputRef.current?.focus();
      return;
    }

    setErrorMessage("");
    setOpen(false);
    setIsMobileExpanded(false);
    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  function handleViewAllResults() {
    const trimmed = query.trim();

    if (!trimmed) {
      setErrorMessage("Digite algo para realizar a busca.");
      inputRef.current?.focus();
      return;
    }

    setErrorMessage("");
    setOpen(false);
    setIsMobileExpanded(false);
    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  function resetMobileSearch() {
    setQuery("");
    setResults([]);
    setOpen(false);
    setErrorMessage("");
    setIsMobileExpanded(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* DESKTOP */}
      <div className="hidden md:block">
        <div className="relative w-full max-w-md">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
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
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>

              <input
                id="busca-header-desktop"
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
                onBlur={() => {
                  if (query.trim()) {
                    setErrorMessage("");
                  }
                }}
                placeholder="Pesquisar materiais..."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 pl-11 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/20 focus:bg-white/[0.06]"
              />
            </div>
          </form>

          {errorMessage ? (
            <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
          ) : null}

          {open && query.trim().length >= 2 ? (
            <div className="absolute top-full z-50 mt-3 w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/98 shadow-2xl backdrop-blur-2xl">
              {loading ? (
                <div className="px-4 py-4 text-sm text-zinc-400">Buscando...</div>
              ) : results.length > 0 ? (
                <div className="max-h-96 overflow-y-auto">
                  {results.map((item) => (
                    <Link
                      key={item.id}
                      href={`/material/${item.id}`}
                      onClick={() => {
                        setOpen(false);
                        setErrorMessage("");
                      }}
                      className="block border-b border-white/6 px-4 py-4 transition last:border-b-0 hover:bg-white/[0.04]"
                    >
                      <p className="font-medium text-zinc-100">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                        {item.description || "Sem descrição cadastrada."}
                      </p>
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handleViewAllResults}
                    className="w-full bg-white/[0.03] px-4 py-4 text-left text-sm font-medium text-amber-400 transition hover:bg-white/[0.06]"
                  >
                    Ver todos os resultados →
                  </button>
                </div>
              ) : (
                <div className="px-4 py-4 text-sm text-zinc-400">
                  Nenhum material encontrado.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* MOBILE INLINE */}
      {!isUsingIconMobile ? (
        <div className="md:hidden">
          <div className="relative w-full">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
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
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </span>

                <input
                  id="busca-header-mobile-inline"
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
                  placeholder="Pesquisar materiais..."
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/20 focus:bg-white/[0.06]"
                />
              </div>
            </form>

            {errorMessage ? (
              <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
            ) : null}

            {open && query.trim().length >= 2 ? (
              <div className="absolute top-full z-50 mt-3 w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0b0d12]/98 shadow-2xl backdrop-blur-2xl">
                {loading ? (
                  <div className="px-4 py-4 text-sm text-zinc-400">
                    Buscando...
                  </div>
                ) : results.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {results.map((item) => (
                      <Link
                        key={item.id}
                        href={`/material/${item.id}`}
                        onClick={() => {
                          setOpen(false);
                          setErrorMessage("");
                        }}
                        className="block border-b border-white/6 px-4 py-4 transition last:border-b-0 hover:bg-white/[0.04]"
                      >
                        <p className="font-medium text-zinc-100">{item.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                          {item.description || "Sem descrição cadastrada."}
                        </p>
                      </Link>
                    ))}

                    <button
                      type="button"
                      onClick={handleViewAllResults}
                      className="w-full bg-white/[0.03] px-4 py-4 text-left text-sm font-medium text-amber-400 transition hover:bg-white/[0.06]"
                    >
                      Ver todos os resultados →
                    </button>
                  </div>
                ) : (
                  <div className="px-4 py-4 text-sm text-zinc-400">
                    Nenhum material encontrado.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* MOBILE ICON */}
      {isUsingIconMobile ? (
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => {
              setIsMobileExpanded(true);
              setOpen(Boolean(query.trim()));
            }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-100 transition hover:bg-white/[0.08]"
            aria-label="Abrir busca"
            title="Abrir busca"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>

          {isMobileExpanded ? (
            <div className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-md">
              <div className="mx-auto flex min-h-screen w-full max-w-3xl items-start justify-center px-4 pt-20">
                <div className="w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0d12]/98 shadow-2xl backdrop-blur-2xl">
                  <div className="border-b border-white/6 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <form onSubmit={handleSubmit} className="flex-1">
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
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
                              <circle cx="11" cy="11" r="7" />
                              <path d="m20 20-3.5-3.5" />
                            </svg>
                          </span>

                          <input
                            id="busca-header-mobile-overlay"
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
                            placeholder="Pesquisar materiais..."
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/20 focus:bg-white/[0.06]"
                          />
                        </div>
                      </form>

                      <button
                        type="button"
                        onClick={resetMobileSearch}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08]"
                        aria-label="Fechar busca"
                        title="Fechar busca"
                      >
                        ✕
                      </button>
                    </div>

                    {errorMessage ? (
                      <p className="mt-3 text-xs text-red-400">{errorMessage}</p>
                    ) : null}
                  </div>

                  <div className="max-h-[70vh] overflow-y-auto">
                    {query.trim().length < 2 ? (
                      <div className="px-4 py-10 text-center">
                        <p className="text-sm text-zinc-400">
                          Digite pelo menos 2 letras para pesquisar.
                        </p>
                      </div>
                    ) : loading ? (
                      <div className="px-4 py-6 text-sm text-zinc-400">
                        Buscando...
                      </div>
                    ) : results.length > 0 ? (
                      <div>
                        {results.map((item) => (
                          <Link
                            key={item.id}
                            href={`/material/${item.id}`}
                            onClick={() => {
                              setOpen(false);
                              setErrorMessage("");
                              setIsMobileExpanded(false);
                            }}
                            className="block border-b border-white/6 px-4 py-4 transition last:border-b-0 hover:bg-white/[0.04]"
                          >
                            <p className="font-medium text-zinc-100">{item.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                              {item.description || "Sem descrição cadastrada."}
                            </p>
                          </Link>
                        ))}

                        <button
                          type="button"
                          onClick={handleViewAllResults}
                          className="w-full bg-white/[0.03] px-4 py-4 text-left text-sm font-medium text-amber-400 transition hover:bg-white/[0.06]"
                        >
                          Ver todos os resultados →
                        </button>
                      </div>
                    ) : (
                      <div className="px-4 py-10 text-center">
                        <p className="text-sm text-zinc-400">
                          Nenhum material encontrado.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}