import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAuthenticatedAccessContext } from "@/lib/user-access";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const access = await getAuthenticatedAccessContext(supabase);

    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status }
      );
    }

    const body = await request.json();

    const materialId =
      typeof body.materialId === "string" ? body.materialId.trim() : "";
    const volumeId =
      typeof body.volumeId === "string" ? body.volumeId.trim() : "";

    if (!materialId && !volumeId) {
      return NextResponse.json(
        { error: "materialId ou volumeId e obrigatorio." },
        { status: 400 }
      );
    }

    if (volumeId) {
      const { data: volume, error: volumeFetchError } = await supabase
        .from("material_volumes")
        .select("id, material_id, views")
        .eq("id", volumeId)
        .single();

      if (volumeFetchError || !volume) {
        return NextResponse.json(
          { error: "Volume nao encontrado." },
          { status: 404 }
        );
      }

      const { data: parentMaterial, error: materialFetchError } = await supabase
        .from("materials")
        .select("id, views")
        .eq("id", volume.material_id)
        .single();

      if (materialFetchError || !parentMaterial) {
        return NextResponse.json(
          { error: "Material principal nao encontrado." },
          { status: 404 }
        );
      }

      const { error: updateVolumeError } = await supabase
        .from("material_volumes")
        .update({ views: (volume.views || 0) + 1 })
        .eq("id", volumeId);

      if (updateVolumeError) {
        return NextResponse.json(
          { error: "Erro ao atualizar visualizacoes do volume." },
          { status: 500 }
        );
      }

      const { error: updateMaterialError } = await supabase
        .from("materials")
        .update({ views: (parentMaterial.views || 0) + 1 })
        .eq("id", volume.material_id);

      if (updateMaterialError) {
        return NextResponse.json(
          { error: "Erro ao atualizar visualizacoes do material." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        type: "volume",
      });
    }

    const { data: material, error: fetchError } = await supabase
      .from("materials")
      .select("id, views")
      .eq("id", materialId)
      .single();

    if (fetchError || !material) {
      return NextResponse.json(
        { error: "Material nao encontrado." },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("materials")
      .update({ views: (material.views || 0) + 1 })
      .eq("id", materialId);

    if (updateError) {
      return NextResponse.json(
        { error: "Erro ao atualizar visualizacoes do material." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      type: "material",
    });
  } catch (error) {
    console.error("Erro ao registrar visualizacao:", error);

    return NextResponse.json(
      { error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
