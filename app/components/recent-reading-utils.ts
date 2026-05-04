export type LastReadDocument = {
  documentId: string;
  documentTitle: string;
  documentType: "material" | "volume";
  readerHref: string;
  lastPage?: number | null;
  updatedAt: number;
};

export const LAST_DOCUMENT_STORAGE_KEY = "acervo-logos:last-read-document";
export const LAST_DOCUMENT_EVENT = "acervo-logos:last-read-document-change";

export function formatRecentReadingRelativeText(updatedAt: number) {
  const now = Date.now();
  const diffMs = Math.max(0, now - updatedAt);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Lido agora ha pouco";
  }

  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return minutes === 1 ? "Lido ha 1 minuto" : `Lido ha ${minutes} minutos`;
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return hours === 1 ? "Lido ha 1 hora" : `Lido ha ${hours} horas`;
  }

  const days = Math.floor(diffMs / day);
  return days === 1 ? "Lido ha 1 dia" : `Lido ha ${days} dias`;
}

export function readLastDocumentFromStorage(): LastReadDocument | null {
  try {
    const rawValue = window.localStorage.getItem(LAST_DOCUMENT_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<LastReadDocument>;

    if (
      !parsedValue ||
      typeof parsedValue.documentId !== "string" ||
      typeof parsedValue.documentTitle !== "string" ||
      typeof parsedValue.documentType !== "string" ||
      typeof parsedValue.readerHref !== "string" ||
      typeof parsedValue.updatedAt !== "number"
    ) {
      return null;
    }

    return {
      documentId: parsedValue.documentId,
      documentTitle: parsedValue.documentTitle,
      documentType: parsedValue.documentType as "material" | "volume",
      readerHref: parsedValue.readerHref,
      lastPage:
        typeof parsedValue.lastPage === "number" &&
        Number.isInteger(parsedValue.lastPage) &&
        parsedValue.lastPage >= 1
          ? parsedValue.lastPage
          : null,
      updatedAt: parsedValue.updatedAt,
    };
  } catch {
    return null;
  }
}

export function dispatchLastReadDocumentChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(LAST_DOCUMENT_EVENT));
}
