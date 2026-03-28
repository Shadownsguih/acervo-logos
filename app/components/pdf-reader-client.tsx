"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const PdfReader = dynamic(() => import("./pdf-reader"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-300">
      Carregando leitor...
    </div>
  ),
});

type PdfReaderClientProps = {
  fileUrl: string;
  readingProgressKey?: string;
  fullscreenTargetId?: string;
  fullscreenToolbarSlot?: ReactNode;
};

export default function PdfReaderClient({
  fileUrl,
  readingProgressKey,
  fullscreenTargetId,
  fullscreenToolbarSlot,
}: PdfReaderClientProps) {
  return (
    <PdfReader
      fileUrl={fileUrl}
      readingProgressKey={readingProgressKey}
      fullscreenTargetId={fullscreenTargetId}
      fullscreenToolbarSlot={fullscreenToolbarSlot}
    />
  );
}