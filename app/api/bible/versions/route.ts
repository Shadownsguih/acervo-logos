import { NextResponse } from "next/server";
import { getBibleVersionsMetadata } from "@/lib/bible-metadata";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      versions: getBibleVersionsMetadata(),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
