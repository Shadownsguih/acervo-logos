"use client";

import Link from "next/link";
import PdfCoverPreview from "@/app/components/pdf-cover-preview";
import CategoryScroll from "@/app/components/category-scroll";

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300 sm:text-xs">
          Coleção
        </p>

        <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
          Volumes disponíveis
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
          Selecione um volume para continuar a leitura com mais organização e
          conforto em qualquer dispositivo.
        </p>
      </div>

      <CategoryScroll>
        {volumes.map((volume) => (
          <div
            key={volume.id}
            className="
              group relative min-w-[78vw] max-w-[78vw] flex-shrink-0 snap-center
              overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]
              p-4 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.85)]
              transition duration-300 active:scale-[0.985]
              hover:-translate-y-1 hover:border-amber-400/30 hover:bg-white/[0.06]
              hover:shadow-[0_24px_60px_-25px_rgba(0,0,0,0.9)]
              sm:min-w-0 sm:max-w-none sm:snap-start sm:p-5 sm:active:scale-100
            "
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-300/5 blur-2xl transition group-hover:bg-amber-300/10" />

            <div className="relative flex h-full flex-col">
              <div className="mx-auto mb-5 w-full max-w-[220px] sm:max-w-[240px]">
                <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.03] p-2 sm:p-3">
                  <PdfCoverPreview
                    fileUrl={`/api/files/view?kind=volume&id=${volume.id}`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-[11px]">
                  {volume.volume_number
                    ? `Volume ${volume.volume_number}`
                    : "Volume"}
                </span>

                <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300 sm:text-[11px]">
                  PDF
                </span>
              </div>

              <h3 className="mt-4 text-lg font-semibold leading-snug text-white transition group-hover:text-amber-300 sm:text-2xl">
                {volume.title}
              </h3>

              {volume.description ? (
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-400 sm:line-clamp-3">
                  {volume.description}
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Sem descrição cadastrada para este volume.
                </p>
              )}

              <div className="mt-6 flex items-center justify-between">
                <span className="text-sm font-medium text-amber-400 transition group-hover:text-amber-300">
                  Abrir volume
                </span>

                <span className="text-zinc-500 transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <div className="mt-4">
                <Link
                  href={`/ler/${volume.id}`}
                  className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300"
                >
                  Ler volume
                </Link>
              </div>
            </div>
          </div>
        ))}
      </CategoryScroll>
    </section>
  );
}