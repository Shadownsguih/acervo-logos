"use client";

import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  id: string;
  word: string;
  normalizedWord: string;
  preview: string;
};

type EntryResponse = {
  id: string;
  word: string;
  normalizedWord: string;
  preview: string;
  displayTerm: string;
  term: string;
  language: string;
  transliteration: string;
  strong: string;
  pronunciation: string;
  shortDefinition: string;
  fullDefinition: string;
  references: string[];
  aliases: string[];
  relatedTerms: string[];
  original: string;
  etymologyMeaning: string;
};

function MetaCard({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white">{value}</p>
    </div>
  );
}

function BadgeList({
  title,
  items,
  tone = "sky",
}: {
  title: string;
  items: string[];
  tone?: "sky" | "amber";
}) {
  if (!items.length) return null;

  const classes =
    tone === "amber"
      ? "border-amber-400/20 bg-amber-400/10"
      : "border-sky-300/20 bg-sky-300/10";

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${title}-${item}`}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs text-zinc-100 ${classes}`}
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function EntryContent({ entry }: { entry: EntryResponse }) {
  return (
    <div>
      <section className="overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-300/10 via-white/5 to-transparent p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
          Verbete bíblico
        </p>

        <h3 className="mt-3 text-3xl font-bold text-white">{entry.displayTerm}</h3>

        {entry.original ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-400">
              Original
            </p>
            <p className="mt-2 text-xl font-semibold leading-8 text-white">
              {entry.original}
            </p>
          </div>
        ) : null}

        {entry.shortDefinition ? (
          <div className="mt-5 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-sky-200">
              Definição breve
            </p>
            <p className="mt-2 text-sm leading-7 text-zinc-100">
              {entry.shortDefinition}
            </p>
          </div>
        ) : null}
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetaCard label="Idioma" value={entry.language} />
        <MetaCard label="Transliteração" value={entry.transliteration} />
        <MetaCard label="Pronúncia" value={entry.pronunciation} />
        <MetaCard label="Strong" value={entry.strong} />
      </section>

      {entry.etymologyMeaning ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
          <h4 className="text-sm font-semibold text-white">Etimologia da palavra</h4>
          <p className="mt-3 text-sm leading-7 text-zinc-200">
            {entry.etymologyMeaning}
          </p>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
        <h4 className="text-sm font-semibold text-white">Definição completa</h4>
        <div className="mt-4 space-y-4 whitespace-pre-line text-sm leading-7 text-zinc-200">
          {entry.fullDefinition}
        </div>
      </section>

      <BadgeList title="Referências bíblicas" items={entry.references} />
      <BadgeList title="Nomes e buscas equivalentes" items={entry.aliases} />
      <BadgeList title="Termos relacionados" items={entry.relatedTerms} />
    </div>
  );
}

export default function ReaderDictionaryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EntryResponse | null>(null);
  const [mobileMode, setMobileMode] = useState<"search" | "entry">("search");
  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function runSearch() {
      if (!hasQuery) {
        setResults([]);
        setSelectedEntry(null);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(
          `/api/dictionary/search?q=${encodeURIComponent(query)}&limit=20`,
          { signal: controller.signal }
        );
        const data = await response.json();

        if (data.ok) {
          setResults(data.results || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(runSearch, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, hasQuery]);

  useEffect(() => {
    if (!results.length) {
      setSelectedEntry(null);
      return;
    }

    const first = results[0];
    if (!selectedEntry || !results.some((item) => item.id === selectedEntry.id)) {
      void openEntry(first.id, false);
    }
  }, [results]);

  async function openEntry(id: string, switchMobile = true) {
    setLoadingEntry(true);

    try {
      const response = await fetch(
        `/api/dictionary/entry?id=${encodeURIComponent(id)}`
      );
      const data = await response.json();

      if (data.ok) {
        setSelectedEntry(data.entry);
        if (switchMobile) {
          setMobileMode("entry");
        }
      }
    } catch {
      // silêncio proposital
    } finally {
      setLoadingEntry(false);
    }
  }

  const mobileResults = useMemo(() => results.slice(0, 3), [results]);

  function openPanel() {
    setIsOpen(true);
    setIsMinimized(false);
  }

  function closePanel() {
    setIsOpen(false);
    setIsMinimized(false);
    setMobileMode("search");
  }

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className={`fixed z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-sky-400 font-semibold text-black shadow-lg transition hover:bg-sky-300 ${
          isMobile
            ? "bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 px-3.5 py-3 text-[13px]"
            : "bottom-5 left-5 px-4 py-3 text-sm"
        }`}
      >
        <span aria-hidden="true">📖</span>
        <span>{isMobile ? "Dicionário" : "Dicionário bíblico"}</span>
      </button>

      {isOpen ? (
        <div className="pointer-events-none fixed inset-0 z-50">
          <div
            className="pointer-events-auto absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closePanel}
          />

          <div
            className={`pointer-events-auto overflow-hidden border border-white/10 bg-[#0f1117] text-white shadow-2xl ${
              isMobile
                ? "fixed inset-x-0 bottom-0 h-[84vh] rounded-t-[1.5rem] rounded-b-none"
                : isMinimized
                ? "fixed bottom-5 left-5 h-[92px] w-[360px] rounded-2xl"
                : "fixed bottom-5 left-5 h-[76vh] w-[min(920px,calc(100vw-3rem))] max-w-[920px] rounded-2xl"
            }`}
            style={
              isMobile
                ? { paddingBottom: "env(safe-area-inset-bottom)" }
                : undefined
            }
          >
            <div className="flex h-full min-h-0 flex-col">
              <div
                className={`shrink-0 border-b border-white/10 bg-[#12151d] ${
                  isMobile ? "px-4 py-3" : isMinimized ? "px-3 py-2" : "px-4 py-3"
                }`}
              >
                {isMobile ? (
                  <div className="mb-2 flex justify-center">
                    <span className="h-1.5 w-12 rounded-full bg-white/15" />
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`uppercase tracking-[0.24em] text-sky-300 ${
                        isMinimized ? "text-[10px]" : "text-[11px]"
                      }`}
                    >
                      Dicionário bíblico
                    </p>

                    {isMinimized ? (
                      <div className="mt-1">
                        <h2 className="truncate text-[13px] font-semibold text-white">
                          {selectedEntry?.word || "Consulta bíblica"}
                        </h2>
                        <p className="truncate text-[10px] text-zinc-400">
                          Painel minimizado
                        </p>
                      </div>
                    ) : (
                      <>
                        <h2 className="mt-1 text-sm font-semibold">
                          Consulta durante a leitura
                        </h2>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          Pesquise termos sem sair do PDF.
                        </p>
                      </>
                    )}
                  </div>

                  <div
                    className={`flex shrink-0 items-center ${
                      isMinimized ? "gap-1.5" : "gap-2"
                    }`}
                  >
                    {!isMobile ? (
                      <button
                        type="button"
                        onClick={() => setIsMinimized((prev) => !prev)}
                        className={`rounded-lg border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10 ${
                          isMinimized
                            ? "px-2.5 py-1 text-[10px]"
                            : "px-3 py-1.5 text-[11px]"
                        }`}
                      >
                        {isMinimized ? "Restaurar" : "Minimizar"}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={closePanel}
                      className={`rounded-lg border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10 ${
                        isMinimized
                          ? "px-2.5 py-1 text-[10px]"
                          : "px-3 py-1.5 text-[11px]"
                      }`}
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>

              {!isMinimized ? (
                <>
                  {isMobile ? (
                    <div className="flex-1 overflow-hidden">
                      <div className="relative h-full overflow-hidden">
                        <div
                          className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 ease-out ${
                            mobileMode === "search"
                              ? "pointer-events-auto translate-x-0 opacity-100"
                              : "pointer-events-none -translate-x-6 opacity-0"
                          }`}
                        >
                          {hasQuery ? (
                            <div className="mb-6 space-y-3">
                              {loading ? (
                                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-center">
                                  <p className="text-sm text-zinc-300">Buscando...</p>
                                </div>
                              ) : mobileResults.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center">
                                  <p className="text-sm font-medium text-white">
                                    Esta palavra não existe no dicionário.
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {mobileResults.map((entry) => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      onClick={() => openEntry(entry.id, true)}
                                      className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-sky-300/40 hover:bg-white/5"
                                    >
                                      <p className="text-base font-semibold text-white">
                                        {entry.word}
                                      </p>

                                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-200">
                                        {entry.preview}
                                      </p>
                                    </button>
                                  ))}

                                  {results.length > 3 ? (
                                    <p className="px-1 text-xs text-zinc-500">
                                      Mostrando os 3 primeiros resultados.
                                    </p>
                                  ) : null}
                                </>
                              )}
                            </div>
                          ) : null}

                          <div>
                            <label htmlFor="reader-dictionary-mobile-search" className="sr-only">
                              Buscar termo bíblico
                            </label>

                            <input
                              id="reader-dictionary-mobile-search"
                              type="text"
                              value={query}
                              onChange={(event) => setQuery(event.target.value)}
                              placeholder="Ex.: amor, graça, Abraão..."
                              className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-5 py-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-sky-300/40"
                            />

                            <div className="mt-3 flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuery("");
                                  setResults([]);
                                  setSelectedEntry(null);
                                }}
                                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                              >
                                Limpar busca
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`absolute inset-0 overflow-y-auto p-4 transition-all duration-300 ease-out ${
                            mobileMode === "entry"
                              ? "pointer-events-auto translate-x-0 opacity-100"
                              : "pointer-events-none translate-x-6 opacity-0"
                          }`}
                        >
                          {!selectedEntry ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
                              <p className="text-lg font-semibold text-white">
                                Nenhum verbete encontrado
                              </p>
                            </div>
                          ) : (
                            <article>
                              <div className="mb-5">
                                <button
                                  type="button"
                                  onClick={() => setMobileMode("search")}
                                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                                >
                                  ← Voltar à pesquisa
                                </button>
                              </div>

                              <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
                                {loadingEntry ? (
                                  <p className="text-sm text-zinc-400">Carregando verbete...</p>
                                ) : (
                                  <EntryContent entry={selectedEntry} />
                                )}
                              </div>
                            </article>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)]">
                      <aside className="flex min-h-0 flex-col border-r border-white/10 bg-[#11141b]">
                        <div className="shrink-0 border-b border-white/10 p-4">
                          <label htmlFor="reader-dictionary-desktop-search" className="sr-only">
                            Buscar termo bíblico
                          </label>

                          <input
                            id="reader-dictionary-desktop-search"
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar no dicionário..."
                            className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-sky-300/40"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              setQuery("");
                              setResults([]);
                              setSelectedEntry(null);
                            }}
                            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                          >
                            Limpar busca
                          </button>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-white">
                              Resultados
                            </h3>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-zinc-400">
                              {hasQuery ? results.length : 0}
                            </span>
                          </div>

                          {!hasQuery ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
                              <p className="text-sm font-medium text-white">
                                Digite uma palavra para pesquisar no dicionário.
                              </p>
                            </div>
                          ) : loading ? (
                            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center">
                              <p className="text-sm text-zinc-300">Buscando...</p>
                            </div>
                          ) : results.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
                              <p className="text-sm font-medium text-white">
                                Esta palavra não existe no dicionário.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {results.map((entry) => {
                                const active = entry.id === selectedEntry?.id;

                                return (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => openEntry(entry.id, false)}
                                    className={`w-full rounded-2xl border p-4 text-left transition ${
                                      active
                                        ? "border-sky-300/40 bg-sky-300/10"
                                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                                    }`}
                                  >
                                    <p className="text-sm font-semibold text-white">
                                      {entry.word}
                                    </p>

                                    <p className="mt-3 line-clamp-2 text-xs leading-6 text-zinc-200">
                                      {entry.preview}
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </aside>

                      <div className="min-h-0 overflow-y-auto p-5">
                        {!hasQuery ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
                            <p className="text-lg font-semibold text-white">
                              Digite uma palavra para consultar o dicionário
                            </p>
                          </div>
                        ) : !selectedEntry ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
                            <p className="text-lg font-semibold text-white">
                              Nenhum verbete encontrado
                            </p>
                          </div>
                        ) : (
                          <article>
                            <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-6">
                              {loadingEntry ? (
                                <p className="text-sm text-zinc-400">Carregando verbete...</p>
                              ) : (
                                <EntryContent entry={selectedEntry} />
                              )}
                            </div>
                          </article>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}