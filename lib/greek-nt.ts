import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type GreekNtWord = {
  position: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  verseCode: string | null;
  partOfSpeech: string;
  parsing: string;
  text: string;
  word: string;
  normalizedWord: string;
  lemma: string;
  transliteration: string;
  lemmaTransliteration: string;
};

export type GreekNtVerse = {
  bookNumber: number;
  bookId: string;
  bookCode: string;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  greek: string;
  transliteration: string;
  words: GreekNtWord[];
  source: {
    greek: string;
    morphology: string;
    transliteration: string;
  };
};

type GreekNtData = {
  license: {
    greek: string;
    morphology: string;
    transliteration: string;
  };
  generatedAt: string;
  verses: GreekNtVerse[];
};

type GreekNtIndex = {
  license: GreekNtData["license"];
  generatedAt: string;
  chapters: Map<string, GreekNtVerse[]>;
};

const GREEK_NT_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "greek-nt-sblgnt.json"
);

let greekNtIndexPromise: Promise<GreekNtIndex> | null = null;

async function loadGreekNtIndex() {
  const raw = await readFile(GREEK_NT_PATH, "utf8");
  const data = JSON.parse(raw) as GreekNtData;
  const chapters = new Map<string, GreekNtVerse[]>();

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

async function getGreekNtIndex() {
  if (!greekNtIndexPromise) {
    greekNtIndexPromise = loadGreekNtIndex();
  }

  return greekNtIndexPromise;
}

export async function getGreekNtChapter(bookId: string, chapter: number) {
  const index = await getGreekNtIndex();

  return {
    license: index.license,
    generatedAt: index.generatedAt,
    verses: index.chapters.get(`${bookId}:${chapter}`) ?? [],
  };
}
