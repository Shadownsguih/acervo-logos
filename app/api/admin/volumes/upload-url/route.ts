import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { buildVolumePdfKey, createPresignedPdfUpload } from "@/lib/r2";

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

    const materialId = String(body.materialId ?? "").trim();
    const volumeId = String(body.volumeId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const fileType = String(body.fileType ?? "").trim();

    if (!materialId || !volumeId || !title) {
      return NextResponse.json(
        { error: "Dados do volume incompletos." },
        { status: 400 }
      );
    }

    if (fileType && fileType !== "application/pdf") {
      return NextResponse.json(
        { error: "Envie apenas arquivos PDF." },
        { status: 400 }
      );
    }

    const key = buildVolumePdfKey({
      materialId,
      volumeId,
      title,
    });

    const signed = await createPresignedPdfUpload({
      key,
      expiresIn: 900,
    });

    return NextResponse.json({
      success: true,
      ...signed,
    });
  } catch (error) {
    console.error("Erro ao gerar URL assinada do volume:", error);

    return NextResponse.json(
      { error: "Falha ao preparar o upload direto do volume para o R2." },
      { status: 500 }
    );
  }
}