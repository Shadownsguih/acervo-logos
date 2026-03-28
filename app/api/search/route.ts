import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data, error } = await supabase
    .from("materials")
    .select("id, title, description")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("title", { ascending: true })
    .limit(6);

  if (error) {
    return NextResponse.json(
      { results: [], error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ results: data || [] });
}