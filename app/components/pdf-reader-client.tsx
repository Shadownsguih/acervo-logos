"use client";

import dynamic from "next/dynamic";

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
};

export default function PdfReaderClient({ fileUrl }: PdfReaderClientProps) {
  return <PdfReader fileUrl={fileUrl} />;
}