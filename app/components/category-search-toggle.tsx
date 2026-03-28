"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CategorySearchToggleProps = {
  categorySlug: string;
};

export default function CategorySearchToggle({
  categorySlug,
}: CategorySearchToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const handleSearch = () => {
    const trimmed = query.trim();

    if (!trimmed) {
      setError("Digite um termo para buscar.");
      return;
    }

    setError("");
    router.push(`/categoria/${categorySlug}?q=${encodeURIComponent(trimmed)}`);
    setOpen(false);
  };

  return (
    <div className="w-full max-w-xl">
      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError("");
          }}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
        >
          Buscar nesta categoria
        </button>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#11111a] p-3 md:p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (error) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="Buscar material..."
              className="w-full rounded-full border border-white/10 bg-[#0d0d14] px-5 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-amber-400/40"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:scale-105"
              >
                Buscar
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setQuery("");
                  setError("");
                }}
                className="rounded-full border border-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}