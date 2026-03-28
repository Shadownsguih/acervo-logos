"use client";

import Link from "next/link";
import PdfCoverPreview from "@/app/components/pdf-cover-preview";

type MaterialVolume = {
  id: string;
  material_id: string;
  title: string;
  volume_number: number | null;
  pdf_url: string;
  description: string | null;
};

type MaterialVolumesSectionProps = {
  volumes: MaterialVolume[];
  isOpen: boolean;
};

export default function MaterialVolumesSection({
  volumes,
  isOpen,
}: MaterialVolumesSectionProps) {
  if (!volumes.length || !isOpen) return null;

  return (
    <section className="mt-10">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Volumes disponíveis</h2>
        <p className="mt-2 text-zinc-400">
          Selecione um volume para continuar a leitura.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {volumes.map((volume) => (
          <div
            key={volume.id}
            className="rounded-3xl border border-white/10 bg-white/5 p-5"
          >
            <div className="mx-auto mb-5 max-w-[220px]">
              <PdfCoverPreview fileUrl={volume.pdf_url} />
            </div>

            <h3 className="text-xl font-semibold text-white">
              {volume.title}
            </h3>

            {volume.description ? (
              <p className="mt-3 line-clamp-3 text-sm text-zinc-400">
                {volume.description}
              </p>
            ) : null}

            <div className="mt-5">
              <Link
                href={`/ler/${volume.id}`}
                className="inline-flex rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:scale-[1.02]"
              >
                Ler volume
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}