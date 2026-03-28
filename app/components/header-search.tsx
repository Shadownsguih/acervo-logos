"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchItem = {
  id: string;
  title: string;
  description: string | null;
};

export default function HeaderSearch() {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setErrorMessage("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (trimmed.length < 2) {
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
    }, 350);

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
    router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <form onSubmit={handleSubmit}>
        <input
          id="busca-header"
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
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 outline-none transition focus:border-zinc-600"
        />
      </form>

      {errorMessage ? (
        <p className="mt-2 text-sm text-red-400">{errorMessage}</p>
      ) : null}

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-400">Buscando...</div>
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
                  className="block border-b border-zinc-800 px-4 py-3 transition last:border-b-0 hover:bg-zinc-900"
                >
                  <p className="font-medium text-zinc-100">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                    {item.description || "Sem descrição cadastrada."}
                  </p>
                </Link>
              ))}

              <button
                type="button"
                onClick={() => {
                  const trimmed = query.trim();

                  if (!trimmed) {
                    setErrorMessage("Digite algo para realizar a busca.");
                    inputRef.current?.focus();
                    return;
                  }

                  setErrorMessage("");
                  setOpen(false);
                  router.push(`/buscar?q=${encodeURIComponent(trimmed)}`);
                }}
                className="w-full bg-zinc-900 px-4 py-3 text-left text-sm font-medium text-amber-400 transition hover:bg-zinc-800"
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
      )}
    </div>
  );
}