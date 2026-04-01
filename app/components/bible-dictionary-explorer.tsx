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
}: {
  title: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${title}-${item}`}
            className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-zinc-100"
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
      <section className="overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-400">
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
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-amber-300">
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
          <h4 className="text-sm font-semibold text-white">Significado Etimólogico</h4>
          <p className="mt-3 text-sm leading-7 text-zinc-200">
            {entry.etymologyMeaning}
          </p>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 md:p-6">
        <h4 className="text-sm font-semibold text-white">Definição completa</h4>
        <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-200 whitespace-pre-line">
          {entry.fullDefinition}
        </div>
      </section>

      <BadgeList title="Referências bíblicas" items={entry.references} />
      <BadgeList title="Nomes e buscas equivalentes" items={entry.aliases} />
      <BadgeList title="Termos relacionados" items={entry.relatedTerms} />
    </div>
  );
}

export default function BibleDictionaryExplorer() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<EntryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [mobileMode, setMobileMode] = useState<"search" | "entry">("search");

  const hasQuery = query.trim().length > 0;

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

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="block md:hidden">
        <div className="relative overflow-hidden">
          <div
            className={`transition-all duration-300 ease-out ${
              mobileMode === "search"
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none absolute inset-0 -translate-x-6 opacity-0"
            }`}
          >
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
                  Ferramenta de consulta
                </p>

                <h2 className="mt-3 text-2xl font-bold text-white">
                  Dicionário Bíblico
                </h2>

                <p className="mt-4 text-sm leading-7 text-zinc-300">
                  Pesquise termos bíblicos em português e consulte o verbete completo.
                </p>
              </div>

              {hasQuery ? (
                <div className="mt-6 space-y-3">
                  {loading ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-center">
                      <p className="text-sm text-zinc-300">Buscando...</p>
                    </div>
                  ) : mobileResults.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center">
                      <p className="text-sm font-medium text-white">
                        Esta palavra não existe no dicionário.
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Tente outra palavra.
                      </p>
                    </div>
                  ) : (
                    <>
                      {mobileResults.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => openEntry(entry.id, true)}
                          className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-amber-400/40 hover:bg-white/5"
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

              <div className="mt-6">
                <label htmlFor="dictionary-search-mobile" className="sr-only">
                  Buscar palavra bíblica
                </label>

                <div className="flex flex-col gap-3">
                  <input
                    id="dictionary-search-mobile"
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ex.: amor, graça, Abraão..."
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-5 py-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResults([]);
                      setSelectedEntry(null);
                    }}
                    className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Limpar busca
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ease-out ${
              mobileMode === "entry"
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none absolute inset-0 translate-x-6 opacity-0"
            }`}
          >
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              {!selectedEntry ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
                  <p className="text-lg font-semibold text-white">
                    Nenhum verbete selecionado
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

                  <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
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
      </div>

      <div className="hidden md:block">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
              Ferramenta de consulta
            </p>

            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">
              Dicionário Bíblico
            </h2>

            <p className="mt-4 text-base leading-7 text-zinc-300 md:text-lg">
              Pesquise termos bíblicos em português e consulte o verbete completo.
            </p>
          </div>

          <div className="mt-6">
            <label htmlFor="dictionary-search-desktop" className="sr-only">
              Buscar palavra bíblica
            </label>

            <div className="flex flex-col gap-3 md:flex-row">
              <input
                id="dictionary-search-desktop"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ex.: amor, graça, Abraão..."
                className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-5 py-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
              />

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setSelectedEntry(null);
                }}
                className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Limpar busca
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Resultados</h3>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {hasQuery ? results.length : 0} encontrados
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
              <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {results.map((entry) => {
                  const active = entry.id === selectedEntry?.id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => openEntry(entry.id, false)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-amber-400/40 bg-amber-400/10"
                          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <p className="text-base font-semibold text-white">
                        {entry.word}
                      </p>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-200">
                        {entry.preview}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-8">
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
                <div className="rounded-3xl border border-white/10 bg-black/20 p-6">
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
    </section>
  );
}