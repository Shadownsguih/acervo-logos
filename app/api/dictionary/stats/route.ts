import { NextResponse } from "next/server";
import { getMyBibleDictionaryStats } from "@/lib/mybible-dictionary";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getMyBibleDictionaryStats();

    return NextResponse.json({
      ok: true,
      stats,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar estatísticas.";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    );
  }
}