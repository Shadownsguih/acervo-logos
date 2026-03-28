import Link from "next/link";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import PdfReader from "@/app/components/pdf-reader";
import RegisterView from "@/app/components/register-view";
import StudyNotesPanel from "@/app/components/study-notes-panel";
import ReaderVolumeSwitcher from "@/app/components/reader-volume-switcher";
import ReaderQuickSwitcher from "@/app/components/reader-quick-switcher";

type MaterialVolume = {
  id: string;
  material_id: string;
  title: string;
  volume_number: number | null;
  pdf_url: string;
};

type ParentMaterial = {
  id: string;
  title: string;
  categories: {
    name: string;
    slug: string;
  } | null;
};

type Material = {
  id: string;
  title: string;
  pdf_url: string | null;
  categories: {
    name: string;
    slug: string;
  } | null;
};

type ReaderVolumeItem = {
  id: string;
  title: string;
  volume_number: number | null;
};

export default async function ReadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect(`/login?erro=login&next=${encodeURIComponent(`/ler/${slug}`)}`);
  }

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

  const volume = volumeData as MaterialVolume | null;

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

    const parentMaterial = parentMaterialData as ParentMaterial | null;

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

    const siblingVolumes = (siblingVolumesData ?? []) as ReaderVolumeItem[];

    const backHref = parentMaterial
      ? `/material/${parentMaterial.id}`
      : "/categorias";

    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-5 pb-24 text-white md:px-6 md:pb-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition hover:text-amber-300"
              >
                <span aria-hidden="true">←</span>
                <span>Voltar</span>
              </Link>

              <a
                href={`/api/files/download?kind=volume&id=${volume.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08]"
              >
                <span aria-hidden="true">⬇</span>
                <span>Baixar PDF</span>
              </a>
            </div>

            <div className="mt-4">
              {parentMaterial?.title ? (
                <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">
                  {parentMaterial.title}
                </p>
              ) : null}

              <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                {volume.title}
              </h1>
            </div>
          </div>

          <div id="desktop-reader-fullscreen-root" className="relative">
            <div data-reader-desktop-chrome="true">
              <ReaderQuickSwitcher currentDocumentTitle={volume.title} />
            </div>

            <div data-reader-desktop-chrome="true">
              <ReaderVolumeSwitcher
                materialTitle={parentMaterial?.title || volume.title}
                currentReaderHref={`/ler/${volume.id}`}
                items={siblingVolumes}
              />
            </div>

            <div className="mb-4">
              <StudyNotesPanel currentDocumentTitle={volume.title} />
            </div>

            <div data-reader-desktop-chrome="true">
              <RegisterView volumeId={volume.id} />
            </div>

            <PdfReader
              fileUrl={volume.pdf_url}
              readingProgressKey={`pdf-reading-progress:volume:${volume.id}`}
              fullscreenTargetId="desktop-reader-fullscreen-root"
              fullscreenToolbarSlot={
                <ReaderQuickSwitcher
                  currentDocumentTitle={volume.title}
                  variant="embedded"
                />
              }
            />
          </div>
        </div>
      </main>
    );
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

  const material = materialData as Material | null;

  if (materialError || !material || !material.pdf_url) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold">Arquivo não encontrado</h1>
          <p className="mt-4 text-zinc-400">
            O arquivo que você tentou abrir não existe ou não está disponível.
          </p>
          <Link
            href="/categorias"
            className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para categorias
          </Link>
        </div>
      </main>
    );
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

  const materialVolumes = (materialVolumesData ?? []) as ReaderVolumeItem[];

  const backHref = `/material/${material.id}`;

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-5 pb-24 text-white md:px-6 md:pb-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition hover:text-amber-300"
            >
              <span aria-hidden="true">←</span>
              <span>Voltar</span>
            </Link>

            <a
              href={`/api/files/download?kind=material&id=${material.id}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08]"
            >
              <span aria-hidden="true">⬇</span>
              <span>Baixar PDF</span>
            </a>
          </div>

          <div className="mt-4">
            {material.categories?.name ? (
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">
                {material.categories.name}
              </p>
            ) : null}

            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              {material.title}
            </h1>
          </div>
        </div>

        <div id="desktop-reader-fullscreen-root" className="relative">
          <div data-reader-desktop-chrome="true">
            <ReaderQuickSwitcher currentDocumentTitle={material.title} />
          </div>

          {materialVolumes.length > 0 ? (
            <div data-reader-desktop-chrome="true">
              <ReaderVolumeSwitcher
                materialTitle={material.title}
                currentReaderHref={`/ler/${material.id}`}
                items={[
                  {
                    id: material.id,
                    title: `${material.title} — PDF principal`,
                    volume_number: null,
                  },
                  ...materialVolumes,
                ]}
              />
            </div>
          ) : null}

          <div className="mb-4">
            <StudyNotesPanel currentDocumentTitle={material.title} />
          </div>

          <div data-reader-desktop-chrome="true">
            <RegisterView materialId={material.id} />
          </div>

          <PdfReader
            fileUrl={material.pdf_url}
            readingProgressKey={`pdf-reading-progress:material:${material.id}`}
            fullscreenTargetId="desktop-reader-fullscreen-root"
            fullscreenToolbarSlot={
              <ReaderQuickSwitcher
                currentDocumentTitle={material.title}
                variant="embedded"
              />
            }
          />
        </div>
      </div>
    </main>
  );
}