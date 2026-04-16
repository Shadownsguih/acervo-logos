"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    async function resetDevelopmentPwaState() {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );

      if ("caches" in window) {
        const cacheKeys = await window.caches.keys();

        await Promise.all(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
      }
    }

    async function registerServiceWorker() {
      try {
        if (process.env.NODE_ENV !== "production") {
          await resetDevelopmentPwaState();
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        await navigator.serviceWorker.ready;

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (error) {
        console.error("Erro ao registrar service worker do Acervo Logos:", error);
      }
    }

    void registerServiceWorker();
  }, []);

  return null;
}
