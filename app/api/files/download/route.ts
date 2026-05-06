import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAuthenticatedAccessContext } from "@/lib/user-access";

function sanitizeDownloadName(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return normalized || "arquivo";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const access = await getAuthenticatedAccessContext(supabase);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const kind = String(searchParams.get("kind") ?? "").trim();
    const id = String(searchParams.get("id") ?? "").trim();

    if (!kind || !id) {
      return NextResponse.json(
        { error: "Parametros de download invalidos." },
        { status: 400 }
      );
    }

    if (kind === "material") {
      const { data, error } = await supabase
        .from("materials")
        .select("title, pdf_url")
        .eq("id", id)
        .single();

      if (error || !data || !data.pdf_url) {
        return NextResponse.json(
          { error: "PDF do material nao encontrado." },
          { status: 404 }
        );
      }

      const pdfResponse = await fetch(data.pdf_url);

      if (!pdfResponse.ok) {
        return NextResponse.json(
          { error: "Falha ao buscar o PDF para download." },
          { status: 502 }
        );
      }

      const pdfBytes = await pdfResponse.arrayBuffer();
      const fileName = `${sanitizeDownloadName(data.title)}.pdf`;

      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    if (kind === "volume") {
      const { data, error } = await supabase
        .from("material_volumes")
        .select("title, pdf_url")
        .eq("id", id)
        .single();

      if (error || !data || !data.pdf_url) {
        return NextResponse.json(
          { error: "PDF do volume nao encontrado." },
          { status: 404 }
        );
      }

      const pdfResponse = await fetch(data.pdf_url);

      if (!pdfResponse.ok) {
        return NextResponse.json(
          { error: "Falha ao buscar o PDF para download." },
          { status: 502 }
        );
      }

      const pdfBytes = await pdfResponse.arrayBuffer();
      const fileName = `${sanitizeDownloadName(data.title)}.pdf`;

      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    return NextResponse.json(
      { error: "Tipo de download invalido." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro no download autenticado:", error);

    return NextResponse.json(
      { error: "Erro interno ao baixar o PDF." },
      { status: 500 }
    );
  }
}
