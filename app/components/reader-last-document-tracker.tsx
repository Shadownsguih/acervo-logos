"use client";

import { useEffect } from "react";

type ReaderLastDocumentTrackerProps = {
  documentId: string;
  documentTitle: string;
  documentType: "material" | "volume";
  readerHref: string;
};

const LAST_DOCUMENT_STORAGE_KEY = "acervo-logos:last-read-document";

export default function ReaderLastDocumentTracker({
  documentId,
  documentTitle,
  documentType,
  readerHref,
}: ReaderLastDocumentTrackerProps) {
  useEffect(() => {
    try {
      const payload = {
        documentId,
        documentTitle,
        documentType,
        readerHref,
        updatedAt: Date.now(),
      };

      window.localStorage.setItem(
        LAST_DOCUMENT_STORAGE_KEY,
        JSON.stringify(payload)
      );
    } catch {
      // evita quebrar a aplicação se o localStorage falhar
    }
  }, [documentId, documentTitle, documentType, readerHref]);

  return null;
}