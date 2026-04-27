import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBibleBookSlug } from "@/lib/bible-canon";
import { getBibleBookMetadataBySlug } from "@/lib/bible-metadata";
import { getAvailableBibleBooks } from "@/lib/bible-books";

type BibleVerseRow = {
  version: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

export async function GET(request: NextRequest) {
  const version = request.nextUrl.searchParams.get("version")?.trim() ?? "";
  const book = request.nextUrl.searchParams.get("book")?.trim() ?? "";
  const chapterParam =
    request.nextUrl.searchParams.get("chapter")?.trim() ?? "";
  const chapter = Number(chapterParam);

  if (!version || !book || !Number.isInteger(chapter) || chapter <= 0) {
    return NextResponse.json(
      { ok: false, error: "Parametros invalidos.", passage: null },
      { status: 400 }
    );
  }

  const availableBooks = await getAvailableBibleBooks(version);

  if (availableBooks.error) {
    return NextResponse.json(
      { ok: false, error: availableBooks.error.message, passage: null },
      { status: 500 }
    );
  }

  const resolvedBook =
    availableBooks.data?.find((item) => item.id === book)?.label ??
    getBibleBookMetadataBySlug(version, book)?.label ??
    null;

  if (!resolvedBook) {
    return NextResponse.json(
      { ok: false, error: "Livro nao encontrado.", passage: null },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("bible_verses")
    .select("version, book, abbrev, chapter, verse, reference, text")
    .eq("version", version)
    .eq("book", resolvedBook)
    .eq("chapter", chapter)
    .order("verse", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message, passage: null },
      { status: 500 }
    );
  }

  const verses = (data ?? []) as BibleVerseRow[];

  if (verses.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Capitulo nao encontrado.", passage: null },
      { status: 404 }
    );
  }

  const firstVerse = verses[0];

  return NextResponse.json(
    {
      ok: true,
      passage: {
        version: firstVerse.version,
        book: firstVerse.book,
        bookSlug: getBibleBookSlug(firstVerse.book),
        abbrev: firstVerse.abbrev,
        chapter: firstVerse.chapter,
        verses,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
