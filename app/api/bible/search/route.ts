import { NextRequest, NextResponse } from "next/server";
import {
  getBibleBookOrder,
  getBibleBookSlug,
  normalizeBibleText,
} from "@/lib/bible-canon";
import { getBibleBooksMetadata } from "@/lib/bible-metadata";
import {
  getLocalBibleVerses,
  getLocalBibleVersesAcrossVersions,
  type FlatBibleVerse,
} from "@/lib/local-bible-source";

type BibleSearchRow = FlatBibleVerse;

type ReferenceMatch = {
  book: string;
  chapter: number;
  verse: number | null;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function scoreSearchMatch(text: string, query: string) {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedText || !normalizedQuery) {
    return 0;
  }

  if (normalizedText === normalizedQuery) {
    return 2000;
  }

  if (normalizedText.includes(normalizedQuery)) {
    if (normalizedText.startsWith(normalizedQuery)) {
      return 1400;
    }

    if (normalizedText.includes(` ${normalizedQuery}`)) {
      return 1100;
    }

    return 900;
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  if (!queryTokens.length) {
    return 0;
  }

  const missingToken = queryTokens.some(
    (token) => !normalizedText.includes(token)
  );

  if (missingToken) {
    return 0;
  }

  let score = 500;

  for (const token of queryTokens) {
    if (normalizedText.startsWith(token)) {
      score += 90;
      continue;
    }

    if (normalizedText.includes(` ${token}`)) {
      score += 70;
      continue;
    }

    score += 45;
  }

  return score;
}

function scoreBookAffinity(book: string, currentBookSlug: string | null) {
  if (!currentBookSlug) {
    return 0;
  }

  return getBibleBookSlug(book) === currentBookSlug ? 180 : 0;
}

function parseReferenceQuery(
  query: string,
  version: string
): ReferenceMatch | null {
  const normalizedQuery = query.trim().replace(/\s+/g, " ");

  if (!normalizedQuery) {
    return null;
  }

  const referenceMatch = normalizedQuery.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);

  if (!referenceMatch) {
    return null;
  }

  const rawBook = referenceMatch[1] ?? "";
  const chapter = Number(referenceMatch[2] ?? "");
  const verse = referenceMatch[3] ? Number(referenceMatch[3]) : null;

  if (!rawBook || !Number.isInteger(chapter) || chapter <= 0) {
    return null;
  }

  if (verse !== null && (!Number.isInteger(verse) || verse <= 0)) {
    return null;
  }

  const requestedBook = normalizeBibleText(rawBook);
  const matchingBook =
    getBibleBooksMetadata(version).find((item) => {
      const candidates = [
        item.id,
        normalizeBibleText(item.label),
        item.abbrev ? normalizeBibleText(item.abbrev) : "",
      ].filter(Boolean);

      return candidates.includes(requestedBook);
    }) ?? null;

  if (!matchingBook) {
    return null;
  }

  return {
    book: matchingBook.label,
    chapter,
    verse,
  };
}

function mapSearchResult(item: BibleSearchRow) {
  return {
    ...item,
    bookSlug: getBibleBookSlug(item.book),
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const version = request.nextUrl.searchParams.get("version")?.trim().toUpperCase() ?? "";
  const currentBookSlug =
    request.nextUrl.searchParams.get("book")?.trim().toLowerCase() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Consulta invalida.", results: [] },
      { status: 400 }
    );
  }

  const referenceMatch = version ? parseReferenceQuery(query, version) : null;

  try {
    const verses = version
      ? await getLocalBibleVerses(version)
      : await getLocalBibleVersesAcrossVersions();

    if (referenceMatch) {
      const matchingReferenceResults = verses
        .filter((item) => {
          if (
            item.book !== referenceMatch.book ||
            item.chapter !== referenceMatch.chapter
          ) {
            return false;
          }

          if (referenceMatch.verse !== null) {
            return item.verse === referenceMatch.verse;
          }

          return true;
        })
        .sort((left, right) => left.verse - right.verse)
        .slice(0, referenceMatch.verse !== null ? 1 : 60)
        .map(mapSearchResult);

      return NextResponse.json({
        ok: true,
        results: matchingReferenceResults,
      });
    }

    const normalizedQuery = normalizeSearchText(query);
    const rankedResults = verses
      .map((item) => ({
        item,
        score:
          scoreSearchMatch(item.text, normalizedQuery) +
          scoreBookAffinity(item.book, currentBookSlug || null),
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const versionDiff = left.item.version.localeCompare(
          right.item.version,
          "pt-BR",
          {
            sensitivity: "base",
          }
        );

        if (versionDiff !== 0) {
          return versionDiff;
        }

        const bookDiff =
          getBibleBookOrder(left.item.book) - getBibleBookOrder(right.item.book);

        if (bookDiff !== 0) {
          return bookDiff;
        }

        if (left.item.chapter !== right.item.chapter) {
          return left.item.chapter - right.item.chapter;
        }

        return left.item.verse - right.item.verse;
      })
      .slice(0, 40)
      .map(({ item }) => mapSearchResult(item));

    return NextResponse.json({
      ok: true,
      results: rankedResults,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel buscar na Biblia.",
        results: [],
      },
      { status: 500 }
    );
  }
}
