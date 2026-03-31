import { NextRequest, NextResponse } from "next/server";
import { getMyBibleDictionaryEntry } from "@/lib/mybible-dictionary";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";

    if (!id) {
      return NextResponse.json(
        {
          ok: false,
          message: "ID do verbete não informado.",
        },
        { status: 400 }
      );
    }

    const entry = await getMyBibleDictionaryEntry(id);

    if (!entry) {
      return NextResponse.json(
        {
          ok: false,
          message: "Verbete não encontrado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      entry,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar verbete.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}