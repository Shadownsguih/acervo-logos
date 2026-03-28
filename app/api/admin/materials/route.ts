import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  parseRequestedDisplayOrder,
  resolveDisplayOrderForCreate,
} from "@/lib/material-display-order";

function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  return !!email && !!adminEmail && email.toLowerCase() === adminEmail;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !isAdminEmail(user?.email)) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const id = String(body.id ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const categoryId = String(body.categoryId ?? "").trim();
    const pdfUrl = String(body.pdfUrl ?? "").trim();
    const requestedDisplayOrder = parseRequestedDisplayOrder(body.displayOrder);

    if (!id || !title || !categoryId || !pdfUrl) {
      return NextResponse.json(
        { error: "Dados obrigatórios não informados." },
        { status: 400 }
      );
    }

    const finalDisplayOrder = await resolveDisplayOrderForCreate(
      supabase,
      categoryId,
      requestedDisplayOrder
    );

    const { error } = await supabase.from("materials").insert({
      id,
      title,
      description: description || null,
      pdf_url: pdfUrl,
      category_id: categoryId,
      views: 0,
      display_order: finalDisplayOrder,
    });

    if (error) {
      console.error("Erro ao salvar material:", error);

      return NextResponse.json(
        { error: "Não foi possível salvar o material no banco." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      displayOrder: finalDisplayOrder,
    });
  } catch (error) {
    console.error("Erro na criação do material:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao criar material.",
      },
      { status: 500 }
    );
  }
}