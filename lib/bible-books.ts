import { fetchAllBibleRows } from "@/lib/bible-data";
import {
  getBibleBookOrder,
  getBibleBookSlug,
  getBibleBookTestament,
} from "@/lib/bible-canon";

export type BibleBookAvailabilityRow = {
  book: string;
  abbrev: string | null;
  chapter: number;
};

export type AvailableBibleBook = {
  id: string;
  label: string;
  abbrev: string | null;
  chapters: number;
  testament: "AT" | "NT";
};

const availableBibleBooksPromiseCache = new Map<
  string,
  Promise<{
    data: AvailableBibleBook[] | null;
    error: unknown;
  }>
>();

async function loadAvailableBibleBooks(version: string) {
  const { data, error } = await fetchAllBibleRows<BibleBookAvailabilityRow>({
    columns: "book, abbrev, chapter",
    version,
  });

  if (error || !data) {
    return { data: null, error };
  }

  const bySlug = new Map<string, AvailableBibleBook>();

  for (const row of data) {
    const label = row.book?.trim();

    if (!label) {
      continue;
    }

    const slug = getBibleBookSlug(label);
    const current = bySlug.get(slug);

    if (!current) {
      bySlug.set(slug, {
        id: slug,
        label,
        abbrev: row.abbrev ?? null,
        chapters: row.chapter,
        testament: getBibleBookTestament(label),
      });
      continue;
    }

    current.chapters = Math.max(current.chapters, row.chapter);

    if (!current.abbrev && row.abbrev) {
      current.abbrev = row.abbrev;
    }
  }

  const books = [...bySlug.values()].sort((left, right) => {
    const orderDiff =
      getBibleBookOrder(left.label) - getBibleBookOrder(right.label);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    return left.label.localeCompare(right.label, "pt-BR");
  });

  return { data: books, error: null };
}

export async function getAvailableBibleBooks(version: string) {
  const normalizedVersion = version.trim().toUpperCase();

  if (!normalizedVersion) {
    return { data: null, error: new Error("Versao nao informada.") };
  }

  const cachedPromise = availableBibleBooksPromiseCache.get(normalizedVersion);

  if (cachedPromise) {
    return cachedPromise;
  }

  const nextPromise = loadAvailableBibleBooks(normalizedVersion).catch((error) => {
    availableBibleBooksPromiseCache.delete(normalizedVersion);
    throw error;
  });

  availableBibleBooksPromiseCache.set(normalizedVersion, nextPromise);

  return nextPromise;
}
