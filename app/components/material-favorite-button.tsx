"use client";

import { useEffect, useState } from "react";

type MaterialFavoriteButtonProps = {
  materialId: string;
  variant?: "full" | "icon";
  redirectTo?: string;
  className?: string;
};

type FavoriteStateResponse = {
  authenticated?: boolean;
  isFavorited?: boolean;
  error?: string;
};

function HeartIcon({ isFilled }: { isFilled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={isFilled ? "currentColor" : "none"}
      className="shrink-0"
    >
      <path
        d="M12 20.2C11.74 20.2 11.48 20.1 11.28 19.9C10.52 19.2 9.8 18.56 9.16 17.98L9.16 17.98C5.32 14.56 2.8 12.32 2.8 8.94C2.8 6.18 4.96 4 7.7 4C9.24 4 10.72 4.72 11.68 5.86C12.64 4.72 14.12 4 15.66 4C18.4 4 20.56 6.18 20.56 8.94C20.56 12.32 18.04 14.56 14.2 17.98C13.56 18.56 12.84 19.2 12.08 19.9C11.88 20.1 11.62 20.2 12 20.2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MaterialFavoriteButton({
  materialId,
  variant = "full",
  redirectTo,
  className = "",
}: MaterialFavoriteButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadFavoriteState() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(
          `/api/favorites?materialId=${encodeURIComponent(materialId)}`,
          {
            cache: "no-store",
          }
        );

        const payload = (await response.json()) as FavoriteStateResponse;

        if (!response.ok) {
          throw new Error(
            payload.error || "Nao foi possivel carregar os favoritos."
          );
        }

        if (!isActive) {
          return;
        }

        setIsAuthenticated(Boolean(payload.authenticated));
        setIsFavorited(Boolean(payload.isFavorited));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar os favoritos."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadFavoriteState();

    return () => {
      isActive = false;
    };
  }, [materialId]);

  async function handleClick() {
    if (!isAuthenticated) {
      const nextPath =
        redirectTo ||
        `${window.location.pathname}${window.location.search}${window.location.hash}`;

      window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const response = await fetch(
        `/api/favorites?materialId=${encodeURIComponent(materialId)}`,
        {
          method: isFavorited ? "DELETE" : "POST",
        }
      );

      const payload = (await response.json()) as FavoriteStateResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ||
            (isFavorited
              ? "Nao foi possivel remover o favorito."
              : "Nao foi possivel salvar o favorito.")
        );
      }

      setIsFavorited(Boolean(payload.isFavorited));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar os favoritos."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const label = !isAuthenticated
    ? "Entrar para favoritar"
    : isFavorited
      ? "Nos favoritos"
      : "Favoritar";

  if (variant === "icon") {
    return (
      <div className={`flex flex-col items-end gap-2 ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading || isSubmitting}
          aria-pressed={isFavorited}
          aria-label={isLoading ? "Carregando favorito" : label}
          title={label}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
            isFavorited
              ? "border-amber-400/25 bg-amber-400/12 text-amber-300 hover:bg-amber-400/18"
              : "border-white/10 bg-black/25 text-zinc-200 hover:bg-white/10 hover:text-white"
          } ${isLoading || isSubmitting ? "cursor-wait opacity-80" : ""}`}
        >
          <HeartIcon isFilled={isFavorited} />
        </button>

        {errorMessage ? (
          <p className="max-w-[180px] text-right text-[11px] text-red-300">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || isSubmitting}
        aria-pressed={isFavorited}
        className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition sm:text-base ${
          isFavorited
            ? "border border-amber-400/25 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15"
            : "border border-white/10 bg-white/5 text-white hover:bg-white/10"
        } ${isLoading || isSubmitting ? "cursor-wait opacity-80" : ""}`}
      >
        <HeartIcon isFilled={isFavorited} />
        <span>{isLoading ? "Carregando..." : label}</span>
      </button>

      {errorMessage ? (
        <p className="text-xs text-red-300">{errorMessage}</p>
      ) : null}
    </div>
  );
}
