import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type MaterialSearchRow = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
};

type VolumeRow = {
  id: string;
  material_id: string;
  title: string;
  volume_number: number | null;
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { data: materialsData, error: materialsError } = await supabase
    .from("materials")
    .select("id, title, description, pdf_url")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    .order("title", { ascending: true })
    .limit(8);

  if (materialsError) {
    return NextResponse.json(
      { results: [], error: materialsError.message },
      { status: 500 }
    );
  }

  const materials = (materialsData ?? []) as MaterialSearchRow[];

  if (!materials.length) {
    return NextResponse.json({ results: [] });
  }

  const materialIds = materials.map((item) => item.id);

  const { data: volumesData } = await supabase
    .from("material_volumes")
    .select("id, material_id, title, volume_number")
    .in("material_id", materialIds)
    .order("volume_number", { ascending: true })
    .order("title", { ascending: true });

  const volumes = (volumesData ?? []) as VolumeRow[];

  const firstVolumeByMaterialId = new Map<string, VolumeRow>();

  for (const volume of volumes) {
    if (!firstVolumeByMaterialId.has(volume.material_id)) {
      firstVolumeByMaterialId.set(volume.material_id, volume);
    }
  }

  const results = materials.map((material) => {
    const firstVolume = firstVolumeByMaterialId.get(material.id);

    const readerHref = material.pdf_url
      ? `/ler/${material.id}`
      : firstVolume
      ? `/ler/${firstVolume.id}`
      : `/material/${material.id}`;

    const destinationLabel = material.pdf_url
      ? "Abrir PDF principal"
      : firstVolume
      ? "Abrir primeiro volume"
      : "Abrir página do material";

    return {
      id: material.id,
      title: material.title,
      description: material.description,
      readerHref,
      destinationLabel,
    };
  });

  return NextResponse.json({ results });
}