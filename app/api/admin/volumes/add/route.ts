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
    } = await supabase.auth.getUser();

    if (!isAdminEmail(user?.email)) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const materialId = String(formData.get("materialId"));
    const title = String(formData.get("title"));
    const volumeNumber = Number(formData.get("volumeNumber"));
    const description = String(formData.get("description") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF inválido" }, { status: 400 });
    }

    const volumeId = crypto.randomUUID();

    const fileName = sanitizeFileName(title);
    const key = `volumes/${materialId}/${volumeId}/${fileName}.pdf`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const publicUrl = await uploadPdfToR2({
      key,
      body: bytes,
    });

    const { error } = await supabase.from("material_volumes").insert({
      id: volumeId,
      material_id: materialId,
      title,
      volume_number: volumeNumber,
      description,
      pdf_url: publicUrl,
      views: 0,
    });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao salvar volume" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Erro ao adicionar volume" },
      { status: 500 }
    );
  }
}