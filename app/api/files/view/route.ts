import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function getPdfUrl(kind: string, id: string) {
  if (kind === "material") {
    const { data, error } = await supabase
      .from("materials")
      .select("pdf_url")
      .eq("id", id)
      .single();

    if (error || !data?.pdf_url) {
      return null;
    }

    return data.pdf_url as string;
  }

  if (kind === "volume") {
    const { data, error } = await supabase
      .from("material_volumes")
      .select("pdf_url")
      .eq("id", id)
      .single();

    if (error || !data?.pdf_url) {
      return null;
    }

    return data.pdf_url as string;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kind = String(searchParams.get("kind") ?? "").trim();
    const id = String(searchParams.get("id") ?? "").trim();

    if (!kind || !id) {
      return NextResponse.json(
        { error: "Parâmetros inválidos para visualização do PDF." },
        { status: 400 }
      );
    }

    const pdfUrl = await getPdfUrl(kind, id);

    if (!pdfUrl) {
      return NextResponse.json(
        { error: "PDF não encontrado." },
        { status: 404 }
      );
    }

    const rangeHeader = request.headers.get("range");

    const upstreamResponse = await fetch(pdfUrl, {
      headers: rangeHeader ? { Range: rangeHeader } : undefined,
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: "Falha ao buscar o PDF para visualização." },
        { status: upstreamResponse.status || 502 }
      );
    }

    const responseHeaders = new Headers();

    responseHeaders.set(
      "Content-Type",
      upstreamResponse.headers.get("content-type") || "application/pdf"
    );
    responseHeaders.set("Content-Disposition", "inline");

    const contentLength = upstreamResponse.headers.get("content-length");
    const contentRange = upstreamResponse.headers.get("content-range");
    const acceptRanges = upstreamResponse.headers.get("accept-ranges");
    const etag = upstreamResponse.headers.get("etag");
    const lastModified = upstreamResponse.headers.get("last-modified");
    const cacheControl = upstreamResponse.headers.get("cache-control");

    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    if (acceptRanges) {
      responseHeaders.set("Accept-Ranges", acceptRanges);
    } else {
      responseHeaders.set("Accept-Ranges", "bytes");
    }

    if (etag) {
      responseHeaders.set("ETag", etag);
    }

    if (lastModified) {
      responseHeaders.set("Last-Modified", lastModified);
    }

    if (cacheControl) {
      responseHeaders.set("Cache-Control", cacheControl);
    } else {
      responseHeaders.set("Cache-Control", "public, max-age=0, must-revalidate");
    }

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Erro ao visualizar PDF:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar o PDF." },
      { status: 500 }
    );
  }
}