"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BIBLE_DICTIONARY_ENTRIES,
  BibleDictionaryEntry,
  getBibleDictionaryEntryById,
  searchBibleDictionaryEntries,
} from "@/lib/bible-dictionary";

function languageLabel(language: BibleDictionaryEntry["language"]) {
  if (language === "grego") return "Grego";
  if (language === "hebraico") return "Hebraico";
  return "Português";
}

export default function BibleDictionaryExplorer() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(
    BIBLE_DICTIONARY_ENTRIES[0]?.id ?? ""
  );
  const [mobileMode, setMobileMode] = useState<"search" | "entry">("search");

  const results = useMemo(() => {
    return searchBibleDictionaryEntries(query);
  }, [query]);

  const selectedEntry =
    results.find((entry) => entry.id === selectedId) ??
    BIBLE_DICTIONARY_ENTRIES.find((entry) => entry.id === selectedId) ??
    results[0] ??
    null;

  const relatedEntries = useMemo(() => {
    if (!selectedEntry?.relatedTerms?.length) {
      return [];
    }

    return selectedEntry.relatedTerms
      .map((relatedId) => getBibleDictionaryEntryById(relatedId))
      .filter((entry): entry is BibleDictionaryEntry => entry !== null);
  }, [selectedEntry]);

  useEffect(() => {
    if (results.length === 0) {
      return;
    }

    const hasSelectedInResults = results.some((entry) => entry.id === selectedId);

    if (!hasSelectedInResults) {
      setSelectedId(results[0].id);
    }
  }, [results, selectedId]);

  function handleSelectEntry(entryId: string) {
    setSelectedId(entryId);
    setMobileMode("entry");
  }

  function handleBackToSearch() {
    setMobileMode("search");
  }

  function handleOpenRelatedEntry(entryId: string) {
    setSelectedId(entryId);
    setQuery("");
    setMobileMode("entry");
  }

  return (
    <section className="space-y-6 md:space-y-8">
      {/* MOBILE */}
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
                  Pesquise termos bíblicos em português, grego, hebraico ou por
                  número Strong.
                </p>
              </div>

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
                    placeholder="Ex.: graça, paz, igreja..."
                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-5 py-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSelectedId(BIBLE_DICTIONARY_ENTRIES[0]?.id ?? "");
                    }}
                    className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Limpar busca
                  </button>
                </div>

                <p className="mt-3 text-sm text-zinc-400">
                  Digite em português, original, transliteração ou Strong.
                </p>
              </div>

              {query.trim() ? (
                <div className="mt-6 space-y-3">
                  {results.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
                      <p className="text-sm font-medium text-white">
                        Nenhum termo encontrado
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Tente outra palavra ou outro formato de busca.
                      </p>
                    </div>
                  ) : (
                    results.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => handleSelectEntry(entry.id)}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-amber-400/40 hover:bg-white/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">
                              {entry.displayTerm}
                            </p>

                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                              {languageLabel(entry.language)}
                            </p>
                          </div>

                          {entry.strong ? (
                            <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300">
                              {entry.strong}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-200">
                          {entry.shortDefinition}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
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
                    Selecione um termo
                  </p>
                  <p className="mt-2 text-zinc-400">
                    Ao selecionar um resultado, o verbete aparecerá aqui.
                  </p>
                </div>
              ) : (
                <article>
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={handleBackToSearch}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      ← Voltar à pesquisa
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold text-white">
                      {selectedEntry.displayTerm}
                    </h3>

                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                      {languageLabel(selectedEntry.language)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm leading-7 text-zinc-300">
                      {selectedEntry.shortDefinition}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        Original
                      </p>
                      <p className="mt-2 break-words text-base text-white">
                        {selectedEntry.term || "Não informado"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        Transliteração
                      </p>
                      <p className="mt-2 break-words text-base text-white">
                        {selectedEntry.transliteration || "Não informada"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                        Strong
                      </p>
                      <p className="mt-2 break-words text-base text-white">
                        {selectedEntry.strong || "Não informado"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Pronúncia
                    </p>
                    <p className="mt-2 text-sm text-white">
                      {selectedEntry.pronunciation || "Não informada"}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Explicação
                    </p>
                    <p className="mt-3 whitespace-pre-line text-sm leading-8 text-zinc-200">
                      {selectedEntry.fullDefinition}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Referências bíblicas
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedEntry.references.map((reference) => (
                        <span
                          key={reference}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                        >
                          {reference}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Buscas equivalentes
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedEntry.aliases.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Termos relacionados
                    </p>

                    {relatedEntries.length === 0 ? (
                      <p className="mt-3 text-sm text-zinc-400">
                        Nenhum termo relacionado cadastrado para este verbete.
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {relatedEntries.map((entry) => (
                          <button
                            key={entry.id}
                            type="button"
                            onClick={() => handleOpenRelatedEntry(entry.id)}
                            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-amber-400/40 hover:bg-amber-400/10"
                          >
                            <p className="text-sm font-semibold text-white">
                              {entry.displayTerm}
                            </p>
                            <p className="mt-1 text-xs text-zinc-400">
                              {entry.term !== entry.displayTerm
                                ? `${entry.term} • ${languageLabel(entry.language)}`
                                : languageLabel(entry.language)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DESKTOP */}
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
              Pesquise termos bíblicos em português, grego, hebraico ou por número
              Strong. Os resultados priorizam a apresentação em português e
              mostram resumo imediato para facilitar a consulta.
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
                placeholder="Ex.: graça, paz, igreja, arrependimento, G3056..."
                className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-5 py-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
              />

              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setSelectedId(BIBLE_DICTIONARY_ENTRIES[0]?.id ?? "");
                }}
                className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Limpar busca
              </button>
            </div>

            <p className="mt-3 text-sm text-zinc-400">
              Você pode buscar por palavra em português, termo original,
              transliteração ou número Strong.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white">Resultados</h3>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
                {results.length} encontrados
              </span>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
                <p className="text-sm font-medium text-white">
                  Nenhum termo encontrado
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Tente buscar por outra palavra, tradução ou número Strong.
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
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-amber-400/40 bg-amber-400/10"
                          : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-white">
                            {entry.displayTerm}
                          </p>

                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                            {languageLabel(entry.language)}
                          </p>
                        </div>

                        {entry.strong ? (
                          <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-zinc-300">
                            {entry.strong}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-200">
                        {entry.shortDefinition}
                      </p>

                      <div className="mt-4 space-y-2">
                        {entry.term !== entry.displayTerm ? (
                          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                              Original
                            </p>
                            <p className="mt-1 text-sm text-white">
                              {entry.term}
                            </p>
                          </div>
                        ) : null}

                        {(entry.transliteration || entry.term !== entry.displayTerm) && (
                          <div className="flex flex-wrap gap-2">
                            {entry.transliteration ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                                Transl.: {entry.transliteration}
                              </span>
                            ) : null}

                            {entry.term !== entry.displayTerm ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300">
                                Termo bíblico
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 md:p-8">
            {!selectedEntry ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
                <p className="text-lg font-semibold text-white">
                  Selecione um termo
                </p>
                <p className="mt-2 text-zinc-400">
                  Ao selecionar um resultado, o verbete aparecerá aqui.
                </p>
              </div>
            ) : (
              <article>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-bold text-white md:text-3xl">
                    {selectedEntry.displayTerm}
                  </h3>

                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
                    {languageLabel(selectedEntry.language)}
                  </span>
                </div>

                <div className="mt-3 max-w-3xl">
                  <p className="text-sm leading-7 text-zinc-300 md:text-base">
                    {selectedEntry.shortDefinition}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Original
                    </p>
                    <p className="mt-2 break-words text-base text-white md:text-lg">
                      {selectedEntry.term || "Não informado"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Transliteração
                    </p>
                    <p className="mt-2 break-words text-base text-white md:text-lg">
                      {selectedEntry.transliteration || "Não informada"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Strong
                    </p>
                    <p className="mt-2 break-words text-base text-white md:text-lg">
                      {selectedEntry.strong || "Não informado"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Pronúncia
                  </p>
                  <p className="mt-2 text-sm text-white md:text-base">
                    {selectedEntry.pronunciation || "Não informada"}
                  </p>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Explicação
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-8 text-zinc-200 md:text-base">
                    {selectedEntry.fullDefinition}
                  </p>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Referências bíblicas
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedEntry.references.map((reference) => (
                        <span
                          key={reference}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                        >
                          {reference}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                      Buscas equivalentes
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedEntry.aliases.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Termos relacionados
                  </p>

                  {relatedEntries.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-400">
                      Nenhum termo relacionado cadastrado para este verbete.
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {relatedEntries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(entry.id);
                            setQuery("");
                          }}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-amber-400/40 hover:bg-amber-400/10"
                        >
                          <p className="text-sm font-semibold text-white">
                            {entry.displayTerm}
                          </p>
                          <p className="mt-1 text-xs text-zinc-400">
                            {entry.term !== entry.displayTerm
                              ? `${entry.term} • ${languageLabel(entry.language)}`
                              : languageLabel(entry.language)}
                          </p>
                        </button>
                      ))}
                    </div>
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