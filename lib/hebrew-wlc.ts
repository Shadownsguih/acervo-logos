import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type HebrewWlcVerse = {
  bookNumber: number;
  bookId: string;
  bookCode: string;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  hebrew: string;
  transliteration: string;
  vid: string;
  source: {
    hebrew: string;
    transliteration: string;
  };
};

type HebrewWlcData = {
  license: {
    hebrew: string;
    transliteration: string;
  };
  generatedAt: string;
  verses: HebrewWlcVerse[];
};

type HebrewWlcIndex = {
  license: HebrewWlcData["license"];
  generatedAt: string;
  chapters: Map<string, HebrewWlcVerse[]>;
};

const HEBREW_WLC_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "hebrew-wlc-transliteration.json"
);

let hebrewWlcIndexPromise: Promise<HebrewWlcIndex> | null = null;

async function loadHebrewWlcIndex() {
  const raw = await readFile(HEBREW_WLC_PATH, "utf8");
  const data = JSON.parse(raw) as HebrewWlcData;
  const chapters = new Map<string, HebrewWlcVerse[]>();

  for (const verse of data.verses) {
    const key = `${verse.bookId}:${verse.chapter}`;
    const chapterVerses = chapters.get(key);

    if (chapterVerses) {
      chapterVerses.push(verse);
      continue;
    }

    chapters.set(key, [verse]);
  }

  return {
    license: data.license,
    generatedAt: data.generatedAt,
    chapters,
  };
}

async function getHebrewWlcIndex() {
  if (!hebrewWlcIndexPromise) {
    hebrewWlcIndexPromise = loadHebrewWlcIndex();
  }

  return hebrewWlcIndexPromise;
}

export async function getHebrewWlcChapter(bookId: string, chapter: number) {
  const index = await getHebrewWlcIndex();

  return {
    license: index.license,
    generatedAt: index.generatedAt,
    verses: index.chapters.get(`${bookId}:${chapter}`) ?? [],
  };
}
