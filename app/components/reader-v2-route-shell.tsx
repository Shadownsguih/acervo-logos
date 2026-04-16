import Link from "next/link";
import ReaderLastDocumentTracker from "@/app/components/reader-last-document-tracker";
import ReaderV2Entry from "@/app/components/reader-v2-entry";
import type {
  ReaderResolvedContext,
  ReaderResolvedVolumeItem,
} from "@/lib/reader/resolve-reader-document";

function withReaderHref(
  items: ReaderResolvedVolumeItem[],
  basePath: string,
  readerQueryValue?: "v1" | "v2"
): ReaderResolvedVolumeItem[] {
  return items.map((item) => ({
    ...item,
    href: `${basePath}/${item.id}${
      readerQueryValue ? `?reader=${readerQueryValue}` : ""
    }`,
  }));
}

type ReaderV2RouteShellProps = {
  resolved: Exclude<ReaderResolvedContext, { kind: "not-found" }>;
  readerBasePath: "/ler";
  fallbackReaderHref?: string;
  fallbackReaderLabel?: string;
  betaLabel?: string;
  readerQueryValue?: "v1" | "v2";
};

export default function ReaderV2RouteShell({
  resolved,
  readerBasePath,
  fallbackReaderHref,
  fallbackReaderLabel = "Reader atual",
  betaLabel,
  readerQueryValue,
}: ReaderV2RouteShellProps) {
  const isVolume = resolved.kind === "volume";
  const readerHref = `${readerBasePath}/${resolved.id}${
    readerQueryValue ? `?reader=${readerQueryValue}` : ""
  }`;
  const backHref =
    resolved.kind === "volume"
      ? `/material/${resolved.materialId}`
      : `/material/${resolved.id}`;
  const downloadHref = isVolume
    ? `/api/files/download?kind=volume&id=${resolved.id}`
    : `/api/files/download?kind=material&id=${resolved.id}`;
  const fileUrl = isVolume
    ? `/api/files/view?kind=volume&id=${resolved.id}`
    : `/api/files/view?kind=material&id=${resolved.id}`;
  const readingProgressKey = isVolume
    ? `pdf-reading-progress:volume:${resolved.id}`
    : `pdf-reading-progress:material:${resolved.id}`;
  const documentType = isVolume ? "volume" : "material";
  const volumeItems = withReaderHref(
    resolved.volumeItems,
    readerBasePath,
    readerQueryValue
  );

  return (
    <main className="h-[100dvh] overflow-hidden bg-[#0a0a0f] px-4 py-5 pb-24 text-white md:px-6 md:pb-6">
      <div className="mx-auto max-w-7xl">
        <ReaderLastDocumentTracker
          documentId={resolved.id}
          documentTitle={resolved.title}
          documentType={documentType}
          readerHref={readerHref}
          readingProgressKey={readingProgressKey}
        />

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-4 md:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition hover:text-amber-300"
            >
              <span aria-hidden="true">←</span>
              <span>Voltar</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              {betaLabel ? (
                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200">
                  {betaLabel}
                </span>
              ) : null}

              <a
                href={downloadHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08]"
              >
                <span aria-hidden="true">↓</span>
                <span>Baixar PDF</span>
              </a>

              {fallbackReaderHref ? (
                <Link
                  href={fallbackReaderHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08]"
                >
                  <span>{fallbackReaderLabel}</span>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            {resolved.category?.name ? (
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">
                {resolved.category.name}
              </p>
            ) : resolved.materialTitle ? (
              <p className="text-[11px] uppercase tracking-[0.3em] text-amber-400">
                {resolved.materialTitle}
              </p>
            ) : null}

            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              {resolved.title}
            </h1>
          </div>
        </div>

        <ReaderV2Entry
          fileUrl={fileUrl}
          title={resolved.title}
          materialTitle={resolved.materialTitle}
          currentReaderHref={readerHref}
          readingProgressKey={readingProgressKey}
          volumeItems={volumeItems}
          environmentLabel="Reader v2"
          quickSwitcherLabel="Trocar de livro"
          backHref={backHref}
          backLabel="Voltar"
          readerBasePath={readerBasePath}
          readerQueryValue={readerQueryValue}
        />
      </div>
    </main>
  );
}
