import { NextRequest, NextResponse } from "next/server";
import { getGreekNtChapter } from "@/lib/greek-nt";

export async function GET(request: NextRequest) {
  const book = request.nextUrl.searchParams.get("book")?.trim().toLowerCase() ?? "";
  const chapterValue = request.nextUrl.searchParams.get("chapter")?.trim() ?? "";
  const chapter = Number(chapterValue);

  if (!book || !Number.isInteger(chapter) || chapter <= 0) {
    return NextResponse.json(
      { ok: false, error: "Parametros invalidos.", passage: null },
      { status: 400 }
    );
  }

  try {
    const result = await getGreekNtChapter(book, chapter);

    if (!result.verses.length) {
      return NextResponse.json(
        { ok: false, error: "Capitulo grego nao encontrado.", passage: null },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        passage: {
          bookId: book,
          chapter,
          verses: result.verses,
          license: result.license,
          generatedAt: result.generatedAt,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao carregar o texto grego.",
        passage: null,
      },
      { status: 500 }
    );
  }
}
