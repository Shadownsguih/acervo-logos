"use client";

import { useEffect } from "react";

type ReaderLastDocumentTrackerProps = {
  documentId: string;
  documentTitle: string;
  documentType: "material" | "volume";
  readerHref: string;
  readingProgressKey?: string;
};

const LAST_DOCUMENT_STORAGE_KEY = "acervo-logos:last-read-document";

export default function ReaderLastDocumentTracker({
  documentId,
  documentTitle,
  documentType,
  readerHref,
  readingProgressKey,
}: ReaderLastDocumentTrackerProps) {
  useEffect(() => {
    function getSavedPage() {
      if (!readingProgressKey) {
        return null;
      }

      try {
        const rawValue = window.localStorage.getItem(readingProgressKey);

        if (!rawValue) {
          return null;
        }

        const parsedValue = Number(rawValue);

        if (!Number.isInteger(parsedValue) || parsedValue < 1) {
          return null;
        }

        return parsedValue;
      } catch {
        return null;
      }
    }

    function persistLastDocument() {
      try {
        const payload = {
          documentId,
          documentTitle,
          documentType,
          readerHref,
          lastPage: getSavedPage(),
          updatedAt: Date.now(),
        };

        window.localStorage.setItem(
          LAST_DOCUMENT_STORAGE_KEY,
          JSON.stringify(payload)
        );
      } catch {
        // evita quebrar a aplicacao se o localStorage falhar
      }
    }

    persistLastDocument();

    const syncInterval = window.setInterval(() => {
      persistLastDocument();
    }, 1500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistLastDocument();
      }
    };

    const handleBeforeUnload = () => {
      persistLastDocument();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(syncInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      persistLastDocument();
    };
  }, [documentId, documentTitle, documentType, readerHref, readingProgressKey]);

  return null;
}
