import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  parseRequestedDisplayOrder,
  resolveDisplayOrderForUpdate,
} from "@/lib/material-display-order";

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
    const categoryId =
      typeof body.categoryId === "string" && body.categoryId.trim()
        ? body.categoryId.trim()
        : null;
    const requestedDisplayOrder = parseRequestedDisplayOrder(body.displayOrder);

    if (!id) {
      return NextResponse.json(
        { error: "ID do material não informado." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "O título do material é obrigatório." },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "A categoria do material é obrigatória." },
        { status: 400 }
      );
    }

    const { data: categoryExists, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .maybeSingle();

    if (categoryError) {
      return NextResponse.json(
        { error: "Erro ao validar categoria." },
        { status: 500 }
      );
    }

    if (!categoryExists) {
      return NextResponse.json(
        { error: "Categoria informada não foi encontrada." },
        { status: 400 }
      );
    }

    const { data: existingMaterial, error: existingError } = await supabase
      .from("materials")
      .select("id, category_id, display_order")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Erro ao localizar material." },
        { status: 500 }
      );
    }

    if (!existingMaterial) {
      return NextResponse.json(
        { error: "Material não encontrado." },
        { status: 404 }
      );
    }

    const finalDisplayOrder = await resolveDisplayOrderForUpdate(supabase, {
      materialId: id,
      currentCategoryId: String(existingMaterial.category_id ?? ""),
      currentDisplayOrder:
        typeof existingMaterial.display_order === "number"
          ? existingMaterial.display_order
          : null,
      nextCategoryId: categoryId,
      requestedDisplayOrder,
    });

    const payload = {
      title,
      description: description || null,
      category_id: categoryId,
      display_order: finalDisplayOrder,
    };

    const { error: updateError } = await supabase
      .from("materials")
      .update(payload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar material." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Material atualizado com sucesso.",
      displayOrder: finalDisplayOrder,
    });
  } catch (error) {
    console.error("Erro ao atualizar material:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao atualizar material.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { supabase, isAdmin } = await validateAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await context.params;
    const cascade = request.nextUrl.searchParams.get("cascade") === "true";

    if (!id) {
      return NextResponse.json(
        { error: "ID do material não informado." },
        { status: 400 }
      );
    }

    const { data: existingMaterial, error: existingError } = await supabase
      .from("materials")
      .select("id, title, category_id, display_order")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json(
        { error: "Erro ao localizar material." },
        { status: 500 }
      );
    }

    if (!existingMaterial) {
      return NextResponse.json(
        { error: "Material não encontrado." },
        { status: 404 }
      );
    }

    const { data: relatedVolumes, error: volumesError } = await supabase
      .from("material_volumes")
      .select("id")
      .eq("material_id", id);

    if (volumesError) {
      return NextResponse.json(
        { error: "Erro ao verificar volumes relacionados." },
        { status: 500 }
      );
    }

    const volumeCount = relatedVolumes?.length ?? 0;

    if (volumeCount > 0 && !cascade) {
      return NextResponse.json(
        {
          error:
            "Este material possui volumes cadastrados. Para excluir a obra inteira, confirme a exclusão completa.",
          requiresCascade: true,
          volumeCount,
        },
        { status: 400 }
      );
    }

    if (volumeCount > 0) {
      const { error: deleteVolumesError } = await supabase
        .from("material_volumes")
        .delete()
        .eq("material_id", id);

      if (deleteVolumesError) {
        return NextResponse.json(
          { error: "Erro ao excluir volumes vinculados." },
          { status: 500 }
        );
      }
    }

    const { error: deleteMaterialError } = await supabase
      .from("materials")
      .delete()
      .eq("id", id);

    if (deleteMaterialError) {
      return NextResponse.json(
        { error: "Erro ao excluir material." },
        { status: 500 }
      );
    }

    if (
      existingMaterial.category_id &&
      typeof existingMaterial.display_order === "number" &&
      existingMaterial.display_order > 0
    ) {
      const { data: rowsToCompact, error: compactQueryError } = await supabase
        .from("materials")
        .select("id, display_order")
        .eq("category_id", existingMaterial.category_id)
        .gt("display_order", existingMaterial.display_order)
        .order("display_order", { ascending: true });

      if (!compactQueryError) {
        for (const row of rowsToCompact ?? []) {
          const currentOrder = Number(row.display_order ?? 0);

          if (!Number.isInteger(currentOrder) || currentOrder <= 0) {
            continue;
          }

          await supabase
            .from("materials")
            .update({ display_order: currentOrder - 1 })
            .eq("id", row.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message:
        volumeCount > 0
          ? `Obra excluída com sucesso, juntamente com ${volumeCount} volume(s).`
          : "Material excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir material:", error);

    return NextResponse.json(
      { error: "Erro interno ao excluir material." },
      { status: 500 }
    );
  }
}