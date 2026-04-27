import { NextRequest, NextResponse } from "next/server";
import { getBibleBooksMetadata } from "@/lib/bible-metadata";
import { getAvailableBibleBooks } from "@/lib/bible-books";

export async function GET(request: NextRequest) {
  const version = request.nextUrl.searchParams.get("version")?.trim() ?? "";

  if (!version) {
    return NextResponse.json(
      { ok: false, error: "Versao nao informada.", books: [] },
      { status: 400 }
    );
  }

  const availableBooks = await getAvailableBibleBooks(version);

  if (availableBooks.data?.length) {
    return NextResponse.json(
      {
        ok: true,
        books: availableBooks.data,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      books: getBibleBooksMetadata(version),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
