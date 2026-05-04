import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function getMaterialId(request: NextRequest) {
  return request.nextUrl.searchParams.get("materialId")?.trim() ?? "";
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function GET(request: NextRequest) {
  try {
    const materialId = getMaterialId(request);
    const wantsList =
      request.nextUrl.searchParams.get("list") === "1" ||
      request.nextUrl.searchParams.get("list") === "true";
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "6");

    if (!materialId && !wantsList) {
      return NextResponse.json(
        { error: "Informe o material para consultar o favorito." },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      if (wantsList) {
        return NextResponse.json({
          authenticated: false,
          favorites: [],
        });
      }

      return NextResponse.json({
        authenticated: false,
        isFavorited: false,
      });
    }

    const adminSupabase = createAdminClient();

    if (wantsList) {
      const { data, error } = await adminSupabase
        .from("material_favorites")
        .select(
          `
            created_at,
            materials (
              id,
              title,
              description
            )
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(Number.isFinite(limit) && limit > 0 ? limit : 6);

      if (error) {
        return NextResponse.json(
          { error: error.message || "Nao foi possivel carregar os favoritos." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        authenticated: true,
        favorites: data ?? [],
      });
    }

    const { data, error } = await adminSupabase
      .from("material_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("material_id", materialId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel consultar o favorito." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      isFavorited: Boolean(data),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao consultar favorito.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const materialId = getMaterialId(request);

    if (!materialId) {
      return NextResponse.json(
        { error: "Informe o material para salvar nos favoritos." },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: "Login necessario." },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.from("material_favorites").insert({
      user_id: user.id,
      material_id: materialId,
    });

    if (error && error.code !== "23505") {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel salvar o favorito." },
        { status: 500 }
      );
    }

    revalidatePath("/perfil");

    return NextResponse.json({
      authenticated: true,
      isFavorited: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao salvar favorito.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const materialId = getMaterialId(request);

    if (!materialId) {
      return NextResponse.json(
        { error: "Informe o material para remover dos favoritos." },
        { status: 400 }
      );
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: "Login necessario." },
        { status: 401 }
      );
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("material_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("material_id", materialId);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel remover o favorito." },
        { status: 500 }
      );
    }

    revalidatePath("/perfil");

    return NextResponse.json({
      authenticated: true,
      isFavorited: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao remover favorito.",
      },
      { status: 500 }
    );
  }
}
