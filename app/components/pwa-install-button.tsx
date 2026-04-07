"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const DISMISS_KEY = "acervo-logos-pwa-dismissed-at";
const DISMISS_DAYS = 7;

function hasRecentDismiss() {
  if (typeof window === "undefined") {
    return false;
  }

  const rawValue = window.localStorage.getItem(DISMISS_KEY);

  if (!rawValue) {
    return false;
  }

  const dismissedAt = Number(rawValue);

  if (!Number.isFinite(dismissedAt)) {
    window.localStorage.removeItem(DISMISS_KEY);
    return false;
  }

  const limit = DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt < limit;
}

function saveDismiss() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [canRender, setCanRender] = useState(false);

  const showBanner = useMemo(() => {
    return canRender && !isInstalled && !isDismissed && !!installPrompt;
  }, [canRender, isInstalled, isDismissed, installPrompt]);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true;

    if (standalone) {
      setIsInstalled(true);
      setIsDismissed(true);
      setCanRender(true);
      return;
    }

    setIsDismissed(hasRecentDismiss());

    const timer = window.setTimeout(() => {
      setCanRender(true);
    }, 1200);

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);

      if (!hasRecentDismiss()) {
        setIsDismissed(false);
      }
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setIsDismissed(true);
      window.localStorage.removeItem(DISMISS_KEY);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      return;
    }

    setIsInstalling(true);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
        setIsDismissed(true);
      }
    } catch {
      // evita quebrar a interface se o prompt falhar
    } finally {
      setIsInstalling(false);
    }
  }

  function handleDismiss() {
    saveDismiss();
    setIsDismissed(true);
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] px-3 sm:bottom-5 sm:px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-md items-end justify-between gap-3 rounded-3xl border border-white/10 bg-[#0b0d14]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:max-w-lg sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white sm:text-base">
            Instale o Acervo Logos
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-300 sm:text-sm">
            Tenha acesso mais rápido, visual de aplicativo e uma experiência mais
            fluida no seu celular.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleInstall}
              disabled={isInstalling}
              className="rounded-full bg-amber-400 px-4 py-2 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {isInstalling ? "Instalando..." : "Instalar agora"}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/10 sm:text-sm"
            >
              Agora não
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Fechar aviso de instalação"
          className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}