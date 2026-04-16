import { supabase } from "@/lib/supabase";

export type ReaderResolvedVolumeItem = {
  id: string;
  title: string;
  volume_number: number | null;
};

export type ReaderResolvedCategory = {
  name: string;
  slug: string;
} | null;

export type ReaderResolvedContext =
  | {
      kind: "volume";
      id: string;
      title: string;
      materialId: string;
      materialTitle: string;
      category: ReaderResolvedCategory;
      pdfUrl: string;
      volumeItems: ReaderResolvedVolumeItem[];
    }
  | {
      kind: "material";
      id: string;
      title: string;
      materialId: string;
      materialTitle: string;
      category: ReaderResolvedCategory;
      pdfUrl: string;
      volumeItems: ReaderResolvedVolumeItem[];
    }
  | {
      kind: "not-found";
    };

type MaterialVolumeRow = {
  id: string;
  material_id: string;
  title: string;
  volume_number: number | null;
  pdf_url: string;
};

type MaterialRow = {
  id: string;
  title: string;
  pdf_url: string | null;
  categories: ReaderResolvedCategory;
};

export async function resolveReaderDocument(
  slug: string
): Promise<ReaderResolvedContext> {
  const { data: volumeData } = await supabase
    .from("material_volumes")
    .select(`
      id,
      material_id,
      title,
      volume_number,
      pdf_url
    `)
    .eq("id", slug)
    .maybeSingle();

  const volume = volumeData as MaterialVolumeRow | null;

  if (volume) {
    const { data: parentMaterialData } = await supabase
      .from("materials")
      .select(`
        id,
        title,
        categories (
          name,
          slug
        )
      `)
      .eq("id", volume.material_id)
      .maybeSingle();

    const parentMaterial = parentMaterialData as MaterialRow | null;

    const { data: siblingVolumesData } = await supabase
      .from("material_volumes")
      .select(`
        id,
        title,
        volume_number
      `)
      .eq("material_id", volume.material_id)
      .order("volume_number", { ascending: true })
      .order("title", { ascending: true });

    return {
      kind: "volume",
      id: volume.id,
      title: volume.title,
      materialId: volume.material_id,
      materialTitle: parentMaterial?.title ?? volume.title,
      category: parentMaterial?.categories ?? null,
      pdfUrl: volume.pdf_url,
      volumeItems: (siblingVolumesData ?? []) as ReaderResolvedVolumeItem[],
    };
  }

  const { data: materialData, error: materialError } = await supabase
    .from("materials")
    .select(`
      id,
      title,
      pdf_url,
      categories (
        name,
        slug
      )
    `)
    .eq("id", slug)
    .single();

  const material = materialData as MaterialRow | null;

  if (materialError || !material || !material.pdf_url) {
    return { kind: "not-found" };
  }

  const { data: materialVolumesData } = await supabase
    .from("material_volumes")
    .select(`
      id,
      title,
      volume_number
    `)
    .eq("material_id", material.id)
    .order("volume_number", { ascending: true })
    .order("title", { ascending: true });

  return {
    kind: "material",
    id: material.id,
    title: material.title,
    materialId: material.id,
    materialTitle: material.title,
    category: material.categories ?? null,
    pdfUrl: material.pdf_url,
    volumeItems: [
      {
        id: material.id,
        title: `${material.title} - PDF principal`,
        volume_number: null,
      },
      ...((materialVolumesData ?? []) as ReaderResolvedVolumeItem[]),
    ],
  };
}
