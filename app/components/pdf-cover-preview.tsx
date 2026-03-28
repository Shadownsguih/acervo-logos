"use client";

import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfCoverPreviewProps = {
  fileUrl: string;
};

export default function PdfCoverPreview({
  fileUrl,
}: PdfCoverPreviewProps) {
  const [pageWidth, setPageWidth] = useState(340);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 640) {
          setPageWidth(Math.min(window.innerWidth - 96, 300));
        } else if (window.innerWidth < 1024) {
          setPageWidth(300);
        } else {
          setPageWidth(340);
        }
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const loading = useMemo(
    () => (
      <div className="flex min-h-[460px] w-full items-center justify-center bg-[#11111a]">
        <span className="text-sm text-zinc-400">Carregando prévia...</span>
      </div>
    ),
    []
  );

  const error = useMemo(
    () => (
      <div className="flex min-h-[460px] w-full items-center justify-center bg-[#11111a] px-6 text-center">
        <span className="text-sm text-zinc-400">
          Não foi possível carregar a prévia deste PDF.
        </span>
      </div>
    ),
    []
  );

  return (
    <div className="bg-[#11111a] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
      <div className="border border-white/10 bg-[#0d0d14] p-3">
        <Document
          file={fileUrl}
          loading={loading}
          error={error}
          className="flex items-center justify-center"
        >
          <Page
            pageNumber={1}
            width={pageWidth}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            loading={loading}
            className="max-w-full"
          />
        </Document>
      </div>
    </div>
  );
}