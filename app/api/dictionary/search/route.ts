import { NextRequest, NextResponse } from "next/server";
import { searchMyBibleDictionary } from "@/lib/mybible-dictionary";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const limitParam = request.nextUrl.searchParams.get("limit")?.trim() ?? "";
    const parsedLimit = Number(limitParam);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 50)
        : 20;

    const results = await searchMyBibleDictionary(query, limit);

    return NextResponse.json({
      ok: true,
      query,
      count: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao buscar dicionário.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}