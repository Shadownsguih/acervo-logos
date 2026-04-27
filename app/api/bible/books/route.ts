import { NextRequest, NextResponse } from "next/server";
import { getLocalBibleBooks } from "@/lib/local-bible-source";

export async function GET(request: NextRequest) {
  const version = request.nextUrl.searchParams.get("version")?.trim() ?? "";

  if (!version) {
    return NextResponse.json(
      { ok: false, error: "Versao nao informada.", books: [] },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json(
      {
        ok: true,
        books: await getLocalBibleBooks(version),
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
            : "Nao foi possivel carregar os livros da Biblia.",
        books: [],
      },
      { status: 500 }
    );
  }
}
