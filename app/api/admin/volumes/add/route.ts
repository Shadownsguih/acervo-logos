import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sanitizeFileName, uploadPdfToR2 } from "@/lib/r2";

function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  return !!email && !!adminEmail && email.toLowerCase() === adminEmail;
}

async function validateAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    isAdmin: isAdminEmail(user?.email),
  };
}

export async function POST(request: Request) {
  try {
    const { supabase, isAdmin } = await validateAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();

      const materialId = String(body.materialId ?? "").trim();
      const title = String(body.title ?? "").trim();
      const description = String(body.description ?? "").trim();
      const pdfUrl = String(body.pdfUrl ?? "").trim();
      const volumeNumber = Number(body.volumeNumber ?? 0);

      if (!materialId || !title || !pdfUrl || volumeNumber <= 0) {
        return NextResponse.json(
          { error: "Dados obrigatórios do volume não informados." },
          { status: 400 }
        );
      }

      const { data: conflictingVolume, error: conflictError } = await supabase
        .from("material_volumes")
        .select("id")
        .eq("material_id", materialId)
        .eq("volume_number", volumeNumber)
        .maybeSingle();

      if (conflictError) {
        return NextResponse.json(
          { error: "Erro ao validar número do volume." },
          { status: 500 }
        );
      }

      if (conflictingVolume) {
        return NextResponse.json(
          {
            error:
              "Já existe um volume desta obra com esse número. Escolha outro número.",
          },
          { status: 400 }
        );
      }

      const volumeId = crypto.randomUUID();

      const { error } = await supabase.from("material_volumes").insert({
        id: volumeId,
        material_id: materialId,
        title,
        volume_number: volumeNumber,
        description: description || null,
        pdf_url: pdfUrl,
        views: 0,
      });

      if (error) {
        console.error("Erro ao salvar volume por metadados:", error);

        return NextResponse.json(
          { error: "Erro ao salvar volume." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        id: volumeId,
      });
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const materialId = String(formData.get("materialId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const volumeNumber = Number(formData.get("volumeNumber") ?? 0);
    const description = String(formData.get("description") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF inválido" }, { status: 400 });
    }

    if (!materialId || !title || volumeNumber <= 0) {
      return NextResponse.json(
        { error: "Dados obrigatórios do volume não informados." },
        { status: 400 }
      );
    }

    const { data: conflictingVolume, error: conflictError } = await supabase
      .from("material_volumes")
      .select("id")
      .eq("material_id", materialId)
      .eq("volume_number", volumeNumber)
      .maybeSingle();

    if (conflictError) {
      return NextResponse.json(
        { error: "Erro ao validar número do volume." },
        { status: 500 }
      );
    }

    if (conflictingVolume) {
      return NextResponse.json(
        {
          error:
            "Já existe um volume desta obra com esse número. Escolha outro número.",
        },
        { status: 400 }
      );
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
      description: description || null,
      pdf_url: publicUrl,
      views: 0,
    });

    if (error) {
      console.error("Erro ao salvar volume:", error);

      return NextResponse.json(
        { error: "Erro ao salvar volume" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: volumeId });
  } catch (err) {
    console.error("Erro ao adicionar volume:", err);

    return NextResponse.json(
      { error: "Erro ao adicionar volume" },
      { status: 500 }
    );
  }
}