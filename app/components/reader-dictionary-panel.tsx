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

export default function ReaderDictionaryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [mobileMode, setMobileMode] = useState<"search" | "entry">("search");

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasQuery = query.trim().length > 0;

  const results = useMemo(() => {
    return searchBibleDictionaryEntries(query);
  }, [query]);

  const mobileResults = useMemo(() => {
    return results.slice(0, 3);
  }, [results]);

  const selectedEntry =
    results.find((entry) => entry.id === selectedId) ??
    (selectedId ? getBibleDictionaryEntryById(selectedId) : null) ??
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
      setSelectedId("");
      return;
    }

    const hasSelectedInResults = results.some((entry) => entry.id === selectedId);

    if (!hasSelectedInResults) {
      setSelectedId(results[0].id);
    }
  }, [results, selectedId]);

  function openPanel() {
    setIsOpen(true);
    setIsMinimized(false);
  }

  function closePanel() {
    setIsOpen(false);
    setIsMinimized(false);
    setMobileMode("search");
  }

  function handleSelectEntry(entryId: string) {
    setSelectedId(entryId);

    if (isMobile) {
      setMobileMode("entry");
    }
  }

  function handleBackToSearch() {
    setMobileMode("search");
  }

  function handleOpenRelatedEntry(entryId: string) {
    setSelectedId(entryId);

    if (isMobile) {
      setMobileMode("entry");
    }
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
                          {selectedEntry?.displayTerm || "Consulta bíblica"}
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

                  <div className={`flex shrink-0 items-center ${isMinimized ? "gap-1.5" : "gap-2"}`}>
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

                <p
                  className={`text-zinc-500 ${
                    isMinimized ? "mt-1 text-[10px]" : "mt-2 text-[11px]"
                  }`}
                >
                  {isMobile
                    ? "Modo móvel com foco na busca e leitura."
                    : isMinimized
                    ? "Painel minimizado"
                    : "Consulte o dicionário enquanto lê o material."}
                </p>
              </div>

              {!isMinimized ? (
                <>
                  {/* MOBILE */}
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
                              {mobileResults.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center">
                                  <p className="text-sm font-medium text-white">
                                    Esta palavra não existe no dicionário.
                                  </p>
                                  <p className="mt-2 text-sm text-zinc-400">
                                    Tente buscar pelo termo principal, transliteração ou Strong.
                                  </p>
                                </div>
                              ) : (
                                <>
                                  {mobileResults.map((entry) => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      onClick={() => handleSelectEntry(entry.id)}
                                      className="w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-sky-300/40 hover:bg-white/5"
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
                              placeholder="Ex.: graça, paz, igreja..."
                              className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-5 py-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-sky-300/40"
                            />

                            <div className="mt-3 flex gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setQuery("");
                                  setSelectedId("");
                                }}
                                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                              >
                                Limpar busca
                              </button>
                            </div>

                            <p className="mt-3 text-sm text-zinc-400">
                              Busque pela palavra principal, original, transliteração ou Strong.
                            </p>
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

                                <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-200">
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
                                  Termos relacionados
                                </p>

                                {relatedEntries.length === 0 ? (
                                  <p className="mt-3 text-sm text-zinc-400">
                                    Nenhum termo relacionado cadastrado.
                                  </p>
                                ) : (
                                  <div className="mt-4 flex flex-wrap gap-3">
                                    {relatedEntries.map((entry) => (
                                      <button
                                        key={entry.id}
                                        type="button"
                                        onClick={() => handleOpenRelatedEntry(entry.id)}
                                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-sky-300/40 hover:bg-sky-300/10"
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
                  ) : (
                    /* DESKTOP */
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
                              setSelectedId("");
                            }}
                            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                          >
                            Limpar busca
                          </button>

                          <p className="mt-3 text-xs text-zinc-500">
                            Busque pela palavra principal, transliteração, original ou Strong.
                          </p>
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
                          ) : results.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center">
                              <p className="text-sm font-medium text-white">
                                Esta palavra não existe no dicionário.
                              </p>
                              <p className="mt-2 text-xs text-zinc-400">
                                Tente buscar pelo termo principal, transliteração ou Strong.
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
                                    onClick={() => handleSelectEntry(entry.id)}
                                    className={`w-full rounded-2xl border p-4 text-left transition ${
                                      active
                                        ? "border-sky-300/40 bg-sky-300/10"
                                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                          {entry.displayTerm}
                                        </p>
                                        <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                                          {languageLabel(entry.language)}
                                        </p>
                                      </div>

                                      {entry.strong ? (
                                        <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-zinc-300">
                                          {entry.strong}
                                        </span>
                                      ) : null}
                                    </div>

                                    <p className="mt-3 line-clamp-2 text-xs leading-6 text-zinc-200">
                                      {entry.shortDefinition}
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
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-3xl font-bold text-white">
                                {selectedEntry.displayTerm}
                              </h3>

                              <span className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1 text-xs font-medium text-sky-200">
                                {languageLabel(selectedEntry.language)}
                              </span>
                            </div>

                            <div className="mt-3 max-w-3xl">
                              <p className="text-base leading-7 text-zinc-300">
                                {selectedEntry.shortDefinition}
                              </p>
                            </div>

                            <div className="mt-6 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                                  Original
                                </p>
                                <p className="mt-2 break-words text-lg text-white">
                                  {selectedEntry.term || "Não informado"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                                  Transliteração
                                </p>
                                <p className="mt-2 break-words text-lg text-white">
                                  {selectedEntry.transliteration || "Não informada"}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                                  Strong
                                </p>
                                <p className="mt-2 break-words text-lg text-white">
                                  {selectedEntry.strong || "Não informado"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                                Pronúncia
                              </p>
                              <p className="mt-2 text-base text-white">
                                {selectedEntry.pronunciation || "Não informada"}
                              </p>
                            </div>

                            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                                Explicação
                              </p>
                              <p className="mt-3 whitespace-pre-line text-base leading-8 text-zinc-200">
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
                                  Nenhum termo relacionado cadastrado.
                                </p>
                              ) : (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  {relatedEntries.map((entry) => (
                                    <button
                                      key={entry.id}
                                      type="button"
                                      onClick={() => handleOpenRelatedEntry(entry.id)}
                                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-sky-300/40 hover:bg-sky-300/10"
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