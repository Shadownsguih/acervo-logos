import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function validateAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  const isAdmin =
    !!user?.email && !!adminEmail && user.email.toLowerCase() === adminEmail;

  return { supabase, isAdmin };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, isAdmin } = await validateAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const parsedVolumeNumber = Number(body.volumeNumber);

    if (!id) {
      return NextResponse.json(
        { error: "ID do volume não informado." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "O título do volume é obrigatório." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(parsedVolumeNumber) || parsedVolumeNumber <= 0) {
      return NextResponse.json(
        { error: "O número do volume deve ser um inteiro maior que zero." },
        { status: 400 }
      );
    }

    const { data: existingVolume, error: existingError } = await supabase
      .from("material_volumes")
      .select("id, material_id")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Erro ao localizar volume." },
        { status: 500 }
      );
    }

    if (!existingVolume) {
      return NextResponse.json(
        { error: "Volume não encontrado." },
        { status: 404 }
      );
    }

    const { data: conflictingVolume, error: conflictError } = await supabase
      .from("material_volumes")
      .select("id")
      .eq("material_id", existingVolume.material_id)
      .eq("volume_number", parsedVolumeNumber)
      .neq("id", id)
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
            "Já existe outro volume desta obra com esse número. Escolha outro número de volume.",
        },
        { status: 400 }
      );
    }

    const payload = {
      title,
      description: description || null,
      volume_number: parsedVolumeNumber,
    };

    const { error: updateError } = await supabase
      .from("material_volumes")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar volume." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Volume atualizado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao atualizar volume:", error);

    return NextResponse.json(
      { error: "Erro interno ao atualizar volume." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { supabase, isAdmin } = await validateAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "ID do volume não informado." },
        { status: 400 }
      );
    }

    const { data: existingVolume, error: existingError } = await supabase
      .from("material_volumes")
      .select("id, material_id, title, volume_number")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Erro ao localizar volume." },
        { status: 500 }
      );
    }

    if (!existingVolume) {
      return NextResponse.json(
        { error: "Volume não encontrado." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("material_volumes")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Erro ao excluir volume." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Volume ${existingVolume.volume_number} excluído com sucesso.`,
    });
  } catch (error) {
    console.error("Erro ao excluir volume:", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir volume." },
      { status: 500 }
    );
  }
}