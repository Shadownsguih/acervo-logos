"use client";

import { useRef } from "react";

type Props = {
  children: React.ReactNode;
};

export default function CategoryScroll({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollLeft() {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -320,
        behavior: "smooth",
      });
    }
  }

  function scrollRight() {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: 320,
        behavior: "smooth",
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={scrollLeft}
        className="hidden lg:flex absolute left-0 top-1/2 z-20 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
        aria-label="Rolar categorias para a esquerda"
        type="button"
      >
        ←
      </button>

      <button
        onClick={scrollRight}
        className="hidden lg:flex absolute right-0 top-1/2 z-20 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
        aria-label="Rolar categorias para a direita"
        type="button"
      >
        →
      </button>

      <div
        ref={scrollRef}
        className="
          flex gap-3 overflow-x-auto px-1 pb-3 snap-x snap-mandatory
          [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden
          sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none
          lg:grid-cols-3
        "
      >
        <div className="w-1 shrink-0 snap-none sm:hidden" aria-hidden="true" />

        {children}

        <div className="w-1 shrink-0 snap-none sm:hidden" aria-hidden="true" />
      </div>
    </div>
  );
}