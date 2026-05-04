"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import HeaderSearch from "@/app/components/header-search";
import { formatRecentReadingRelativeText } from "@/app/components/recent-reading-utils";
import { useLastReadDocument } from "@/app/components/use-last-read-document";

type AppHeaderDrawerProps = {
  isLoggedIn: boolean;
  isAdminUser: boolean;
  profileFullName: string;
  userEmail: string;
  profileAvatarUrl: string | null;
  avatarInitials: string;
  logoutAction: (formData: FormData) => void;
};

type DrawerLink = {
  href: string;
  label: string;
  accent?: boolean;
};

export default function AppHeaderDrawer({
  isLoggedIn,
  isAdminUser,
  profileFullName,
  userEmail,
  profileAvatarUrl,
  avatarInitials,
  logoutAction,
}: AppHeaderDrawerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const lastRead = useLastReadDocument();

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | PointerEvent) {
      if (!containerRef.current && !panelRef.current) {
        return;
      }

      const target = event.target as Node;
      const isInsideTrigger = containerRef.current?.contains(target) ?? false;
      const isInsidePanel = panelRef.current?.contains(target) ?? false;

      if (!isInsideTrigger && !isInsidePanel) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const recentReadingLabel = useMemo(() => {
    if (!lastRead) {
      return "";
    }

    return formatRecentReadingRelativeText(lastRead.updatedAt);
  }, [lastRead]);

  const links: DrawerLink[] = [
    { href: "/", label: "Inicio" },
    { href: "/categorias", label: "Categorias" },
    { href: "/biblia", label: "Biblia" },
    ...(isLoggedIn
      ? [
          { href: "/perfil#perfil-topo", label: "Meu perfil" },
          { href: "/perfil#leituras-recentes", label: "Leituras recentes" },
          { href: "/perfil#favoritos-salvos", label: "Favoritos" },
          { href: "/perfil#notas-salvas", label: "Notas salvas" },
          { href: "/perfil#seguranca", label: "Seguranca" },
        ]
      : []),
    ...(isAdminUser ? [{ href: "/admin", label: "Admin", accent: true }] : []),
  ];

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <div ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
        aria-label="Abrir menu"
        title="Abrir menu"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {typeof document !== "undefined" && isOpen
        ? createPortal(
        <div className="fixed inset-0 z-[110] bg-black/45 [animation:drawer-overlay-in_180ms_ease-out]">
          <div
            ref={panelRef}
            className="absolute inset-y-0 left-0 flex w-[min(86vw,372px)] flex-col bg-[#171827] text-white shadow-2xl [animation:drawer-panel-in_240ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <div className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-zinc-100 [&_input]:hidden [&_svg]:h-5 [&_svg]:w-5">
                  <HeaderSearch />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                    Acervo Logos
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">Menu rapido</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Fechar menu"
                title="Fechar menu"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <path d="M6 6 18 18" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {isLoggedIn ? (
                <div className="rounded-[28px] border border-white/8 bg-[#202236] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                  <div className="flex items-center gap-3">
                    {profileAvatarUrl ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-amber-400/60 bg-white/10 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                        <Image
                          src={profileAvatarUrl}
                          alt={`Foto de perfil de ${profileFullName}`}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-amber-400/50 bg-[#2a2d45] text-base font-semibold text-amber-300 shadow-[0_0_0_3px_rgba(245,158,11,0.12)]">
                        {avatarInitials}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {profileFullName}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {userEmail}
                      </p>
                    </div>
                  </div>

                  {lastRead ? (
                    <Link
                      href={lastRead.readerHref}
                      onClick={handleClose}
                      className="mt-4 block rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 transition hover:bg-amber-400/15"
                    >
                      <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">
                        Continuar leitura
                      </p>
                      <p className="mt-2 truncate text-sm font-medium text-white">
                        {lastRead.documentTitle}
                      </p>
                      <p className="mt-1 text-xs text-zinc-300">
                        {recentReadingLabel}
                        {lastRead.lastPage ? ` | Pagina ${lastRead.lastPage}` : ""}
                      </p>
                    </Link>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-[28px] border border-white/8 bg-[#202236] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                  <p className="text-sm leading-6 text-zinc-300">
                    Entre para acessar materiais, favoritos, leitura e toda a
                    area pessoal do acervo.
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-[28px] border border-white/8 bg-[#202236] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <nav>
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={handleClose}
                      className={`flex min-h-[54px] items-center justify-between rounded-2xl px-4 text-sm transition ${
                        link.accent
                          ? "text-amber-300 hover:bg-amber-400/10"
                          : "text-zinc-100 hover:bg-white/5"
                      }`}
                    >
                      <span>{link.label}</span>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 ${
                          link.accent ? "text-amber-300/80" : "text-zinc-500"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            <div className="border-t border-white/8 px-4 py-4">
              {isLoggedIn ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
                  >
                    Sair
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  onClick={handleClose}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-medium text-black transition hover:bg-amber-300"
                >
                  Entrar
                </Link>
              )}
            </div>
          </div>
        </div>
          ,
          document.body
        )
        : null}
    </div>
  );
}
