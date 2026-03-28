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

type VolumePayload = {
  id: string;
  title: string;
  volumeNumber: number;
  description: string;
  pdfUrl: string;
};

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

    const materialId = String(body.materialId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const categoryId = String(body.categoryId ?? "").trim();
    const requestedDisplayOrder = parseRequestedDisplayOrder(body.displayOrder);
    const volumes = Array.isArray(body.volumes)
      ? (body.volumes as VolumePayload[])
      : [];

    if (!materialId || !title || !categoryId || volumes.length === 0) {
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

    const { error: materialError } = await supabase.from("materials").insert({
      id: materialId,
      title,
      description: description || null,
      pdf_url: null,
      category_id: categoryId,
      views: 0,
      display_order: finalDisplayOrder,
    });

    if (materialError) {
      console.error("Erro ao salvar material principal:", materialError);

      return NextResponse.json(
        { error: "Não foi possível salvar a obra principal." },
        { status: 500 }
      );
    }

    const volumesToInsert = volumes.map((volume) => ({
      id: volume.id,
      material_id: materialId,
      title: volume.title,
      volume_number: volume.volumeNumber,
      pdf_url: volume.pdfUrl,
      description: volume.description || null,
      views: 0,
    }));

    const { error: volumesError } = await supabase
      .from("material_volumes")
      .insert(volumesToInsert);

    if (volumesError) {
      console.error("Erro ao salvar volumes:", volumesError);

      await supabase.from("materials").delete().eq("id", materialId);

      return NextResponse.json(
        { error: "Não foi possível salvar os volumes." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      displayOrder: finalDisplayOrder,
    });
  } catch (error) {
    console.error("Erro na criação de material com volumes:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao criar material com volumes.",
      },
      { status: 500 }
    );
  }
}