"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CategoryScroll from "@/app/components/category-scroll";
import { formatRecentReadingRelativeText } from "@/app/components/recent-reading-utils";
import { useLastReadDocument } from "@/app/components/use-last-read-document";

type FavoriteItem = {
  created_at: string;
  materials:
    | {
        id: string;
        title: string;
        description: string | null;
      }
    | Array<{
        id: string;
        title: string;
        description: string | null;
      }>
    | null;
};

type FavoritePayload = {
  authenticated?: boolean;
  favorites?: FavoriteItem[];
  error?: string;
};

type TabKey = "recent" | "favorites";

function getMaterialPreview(description: string | null) {
  const normalized = String(description ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Material salvo para retomar depois.";
  }

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 120).trim()}...`;
}

export default function CategoriesContinueReadingCard() {
  const [activeTab, setActiveTab] = useState<TabKey>("recent");
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoritesError, setFavoritesError] = useState("");
  const lastRead = useLastReadDocument();
  const isRecentLoaded = lastRead !== undefined;

  useEffect(() => {
    let isActive = true;

    async function loadFavorites() {
      try {
        setFavoritesError("");

        const response = await fetch("/api/favorites?list=1&limit=3", {
          cache: "no-store",
        });

        const payload = (await response.json()) as FavoritePayload;

        if (!response.ok) {
          throw new Error(
            payload.error || "Nao foi possivel carregar os favoritos."
          );
        }

        if (!isActive) {
          return;
        }

        setFavoriteItems(payload.favorites ?? []);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setFavoritesError(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os favoritos."
        );
      } finally {
        if (isActive) {
          setFavoritesLoaded(true);
        }
      }
    }

    void loadFavorites();

    return () => {
      isActive = false;
    };
  }, []);

  const recentSubtitle = useMemo(() => {
    if (!lastRead) {
      return "";
    }

    return formatRecentReadingRelativeText(lastRead.updatedAt);
  }, [lastRead]);

  const favoriteMaterials = useMemo(() => {
    return favoriteItems
      .map((item) => {
        const material = Array.isArray(item.materials)
          ? item.materials[0] ?? null
          : item.materials;

        if (!material) {
          return null;
        }

        return {
          createdAt: item.created_at,
          id: material.id,
          title: material.title,
          description: material.description,
        };
      })
      .filter(
        (
          item
        ): item is {
          createdAt: string;
          id: string;
          title: string;
          description: string | null;
        } => item !== null
      );
  }, [favoriteItems]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-950 shadow-[0_18px_60px_-28px_rgba(0,0,0,0.9)] sm:rounded-[28px]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("recent")}
            className={`inline-flex min-h-[42px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "recent"
                ? "bg-indigo-500 text-white shadow-lg shadow-black/20"
                : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            Leituras recentes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("favorites")}
            className={`inline-flex min-h-[42px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "favorites"
                ? "bg-amber-400 text-black shadow-lg shadow-black/20"
                : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            Favoritos
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {activeTab === "recent" ? (
          !isRecentLoaded ? (
            <div className="animate-pulse">
              <div className="h-3 w-32 rounded-full bg-white/10" />
              <div className="mt-4 h-7 w-52 rounded-xl bg-white/10" />
              <div className="mt-3 h-4 w-40 rounded-xl bg-white/10" />
              <div className="mt-6 h-11 w-36 rounded-full bg-white/10" />
            </div>
          ) : !lastRead ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300 sm:text-xs">
                  Continuar leitura
                </p>

                <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">
                  Nenhuma leitura recente encontrada
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Abra um material do acervo e ele aparecera aqui para voce
                  retomar depois com mais facilidade.
                </p>
              </div>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-xl text-zinc-300">
                Livro
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="max-w-[80%]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-300 sm:text-xs">
                    Continuar leitura
                  </p>

                  <h2 className="mt-3 text-lg font-bold leading-snug text-white sm:text-2xl">
                    {lastRead.documentTitle}
                  </h2>

                  <p className="mt-2 text-sm text-indigo-100/80">
                    {recentSubtitle}
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-sm font-semibold text-indigo-100 shadow-lg shadow-black/20 sm:h-14 sm:w-14">
                  Ler
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300">
                    {lastRead.documentType === "volume" ? "Volume" : "Material"}
                  </div>

                  {lastRead.lastPage ? (
                    <div className="inline-flex rounded-full border border-indigo-300/15 bg-indigo-400/10 px-3 py-2 text-xs font-medium text-indigo-100">
                      Pagina {lastRead.lastPage}
                    </div>
                  ) : null}
                </div>

                <Link
                  href={lastRead.readerHref}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  <span>Retomar leitura</span>
                  <span aria-hidden="true">-&gt;</span>
                </Link>
              </div>
            </>
          )
        ) : !favoritesLoaded ? (
          <div className="animate-pulse">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="mt-4 h-7 w-56 rounded-xl bg-white/10" />
            <div className="mt-3 h-4 w-44 rounded-xl bg-white/10" />
            <div className="mt-3 h-4 w-40 rounded-xl bg-white/10" />
          </div>
        ) : favoritesError ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {favoritesError}
          </div>
        ) : favoriteMaterials.length === 0 ? (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300 sm:text-xs">
              Favoritos
            </p>

            <h2 className="mt-3 text-lg font-semibold text-white sm:text-xl">
              Nenhum favorito salvo ainda
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Use o coracao nos materiais para montar sua selecao e voltar aqui
              quando quiser.
            </p>
          </div>
        ) : (
          <CategoryScroll>
            {favoriteMaterials.map((material) => (
              <article
                key={`${material.id}:${material.createdAt}`}
                className="
                  group min-w-[78vw] max-w-[78vw] flex-shrink-0 snap-center
                  overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]
                  p-5 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.85)]
                  transition duration-300 active:scale-[0.985]
                  hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[0.06]
                  hover:shadow-[0_24px_60px_-25px_rgba(0,0,0,0.9)]
                  sm:min-w-0 sm:max-w-none sm:snap-start sm:p-6 sm:active:scale-100
                "
              >
                <div className="pointer-events-none absolute" />

                <div className="relative flex min-h-[190px] flex-col justify-between sm:min-h-[220px]">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-300 sm:text-[11px]">
                        Favorito
                      </span>

                      <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
                        Salvo
                      </div>
                    </div>

                    <h3 className="mt-5 text-lg font-semibold leading-snug text-white transition group-hover:text-amber-300 sm:text-2xl">
                      {material.title}
                    </h3>

                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-400 sm:line-clamp-3">
                      {getMaterialPreview(material.description)}
                    </p>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/material/${material.id}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
                    >
                      Abrir material
                    </Link>

                    <Link
                      href={`/ler/${material.id}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Ler agora
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </CategoryScroll>
        )}
      </div>
    </div>
  );
}
