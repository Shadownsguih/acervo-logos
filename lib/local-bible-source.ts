import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { getBibleBookSlug } from "@/lib/bible-canon";
import { getBibleBooksMetadata, type BibleMetadataBook } from "@/lib/bible-metadata";

type FlatBibleVerse = {
  version: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

type LocalBibleVersionIndex = {
  books: BibleMetadataBook[];
  chapters: Map<string, FlatBibleVerse[]>;
};

const localBibleIndexCache = new Map<string, Promise<LocalBibleVersionIndex>>();

function getFlatBiblePath(version: string) {
  return path.join(process.cwd(), "temp-bible-data", `${version.toUpperCase()}-flat.json`);
}

async function loadLocalBibleVersionIndex(version: string) {
  const normalizedVersion = version.trim().toUpperCase();
  const raw = await readFile(getFlatBiblePath(normalizedVersion), "utf8");
  const verses = JSON.parse(raw) as FlatBibleVerse[];
  const metadataBooks = getBibleBooksMetadata(normalizedVersion);
  const booksBySlug = new Map(metadataBooks.map((book) => [book.id, book]));
  const chapters = new Map<string, FlatBibleVerse[]>();

  for (const verse of verses) {
    const bookSlug = getBibleBookSlug(verse.book);
    const metadataBook = booksBySlug.get(bookSlug);

    if (!metadataBook) {
      continue;
    }

    const normalizedVerse: FlatBibleVerse = {
      ...verse,
      book: metadataBook.label,
      abbrev: verse.abbrev ?? metadataBook.abbrev ?? null,
      reference: `${metadataBook.label} ${verse.chapter}:${verse.verse}`,
    };
    const chapterKey = `${bookSlug}:${verse.chapter}`;
    const chapterVerses = chapters.get(chapterKey);

    if (chapterVerses) {
      chapterVerses.push(normalizedVerse);
      continue;
    }

    chapters.set(chapterKey, [normalizedVerse]);
  }

  return {
    books: metadataBooks,
    chapters,
  };
}

async function getLocalBibleVersionIndex(version: string) {
  const normalizedVersion = version.trim().toUpperCase();
  const cached = localBibleIndexCache.get(normalizedVersion);

  if (cached) {
    return cached;
  }

  const nextPromise = loadLocalBibleVersionIndex(normalizedVersion).catch((error) => {
    localBibleIndexCache.delete(normalizedVersion);
    throw error;
  });

  localBibleIndexCache.set(normalizedVersion, nextPromise);

  return nextPromise;
}

export async function getLocalBibleBooks(version: string) {
  const index = await getLocalBibleVersionIndex(version);
  return index.books;
}

export async function getLocalBiblePassage(
  version: string,
  bookSlug: string,
  chapter: number
) {
  const index = await getLocalBibleVersionIndex(version);
  return index.chapters.get(`${bookSlug}:${chapter}`) ?? [];
}
