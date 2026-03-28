import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sanitizeFileName, uploadPdfToR2 } from "@/lib/r2";

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

    const formData = await request.formData();

    const file = formData.get("file");
    const materialId = String(formData.get("materialId") ?? "").trim();
    const volumeId = String(formData.get("volumeId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo PDF não enviado." },
        { status: 400 }
      );
    }

    if (!materialId || !volumeId || !title) {
      return NextResponse.json(
        { error: "Dados do volume incompletos." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Envie apenas arquivos PDF." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const fileName = sanitizeFileName(title || file.name.replace(/\.pdf$/i, ""));
    const key = `volumes/${materialId}/${volumeId}/${fileName}.pdf`;

    const publicUrl = await uploadPdfToR2({
      key,
      body: bytes,
    });

    return NextResponse.json({
      success: true,
      key,
      publicUrl,
    });
  } catch (error) {
    console.error("Erro no upload de volume:", error);

    return NextResponse.json(
      { error: "Falha ao enviar volume para o R2." },
      { status: 500 }
    );
  }
}