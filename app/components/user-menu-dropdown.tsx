"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type UserMenuDropdownProps = {
  profileFullName: string;
  userEmail: string;
  profileAvatarUrl: string | null;
  avatarInitials: string;
  logoutAction: (formData: FormData) => void;
};

export default function UserMenuDropdown({
  profileFullName,
  userEmail,
  profileAvatarUrl,
  avatarInitials,
  logoutAction,
}: UserMenuDropdownProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | PointerEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
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

  function handleMenuLinkClick() {
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1.5 transition hover:bg-white/10"
      >
        {profileAvatarUrl ? (
          <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
            <img
              src={profileAvatarUrl}
              alt={`Foto de perfil de ${profileFullName}`}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#12151d] text-sm font-semibold text-amber-300">
            {avatarInitials}
          </div>
        )}

        <span className="hidden max-w-[140px] truncate text-sm text-white md:block">
          {profileFullName}
        </span>

        <span
          aria-hidden="true"
          className={`pr-2 text-zinc-400 transition duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            className="block"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-3xl border border-white/10 bg-[#0f1117] shadow-2xl"
        >
          <div className="border-b border-white/10 bg-black/20 px-4 py-4">
            <p className="truncate text-sm font-semibold text-white">
              {profileFullName}
            </p>
            <p className="mt-1 truncate text-xs text-zinc-500">{userEmail}</p>
          </div>

          <div className="p-2">
            <Link
              href="/perfil#perfil-topo"
              onClick={handleMenuLinkClick}
              className="flex items-center rounded-2xl px-4 py-3 text-sm text-white transition hover:bg-white/5"
            >
              Meu perfil
            </Link>

            <Link
              href="/perfil#notas-salvas"
              onClick={handleMenuLinkClick}
              className="flex items-center rounded-2xl px-4 py-3 text-sm text-white transition hover:bg-white/5"
            >
              Notas salvas
            </Link>

            <Link
              href="/perfil#seguranca"
              onClick={handleMenuLinkClick}
              className="flex items-center rounded-2xl px-4 py-3 text-sm text-white transition hover:bg-white/5"
            >
              Segurança
            </Link>

            <div className="my-2 border-t border-white/10" />

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/10"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}