"use client";

import { useSyncExternalStore } from "react";
import {
  LAST_DOCUMENT_EVENT,
  LAST_DOCUMENT_STORAGE_KEY,
  type LastReadDocument,
  readLastDocumentFromStorage,
} from "@/app/components/recent-reading-utils";

let cachedRawValue: string | null | undefined;
let cachedSnapshot: LastReadDocument | null | undefined;

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key && event.key !== LAST_DOCUMENT_STORAGE_KEY) {
      return;
    }

    onStoreChange();
  }

  function handleCustomChange() {
    onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LAST_DOCUMENT_EVENT, handleCustomChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LAST_DOCUMENT_EVENT, handleCustomChange);
  };
}

function getSnapshot(): LastReadDocument | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(LAST_DOCUMENT_STORAGE_KEY);

  if (rawValue === cachedRawValue && cachedSnapshot !== undefined) {
    return cachedSnapshot;
  }

  cachedRawValue = rawValue;
  cachedSnapshot = readLastDocumentFromStorage();

  return cachedSnapshot;
}

function getServerSnapshot(): LastReadDocument | undefined {
  return undefined;
}

export function useLastReadDocument() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
