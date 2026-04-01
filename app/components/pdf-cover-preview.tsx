"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfCoverPreviewProps = {
  fileUrl: string;
  variant?: "default" | "volume";
};

export default function PdfCoverPreview({
  fileUrl,
  variant = "default",
}: PdfCoverPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageWidth, setPageWidth] = useState(340);

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = () => {
      const containerWidth = element.clientWidth;

      if (!containerWidth) {
        return;
      }

      if (variant === "volume") {
        setPageWidth(Math.max(Math.floor(containerWidth - 20), 180));
        return;
      }

      setPageWidth(Math.max(Math.floor(containerWidth), 220));
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateWidth();
      });

      observer.observe(element);

      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [variant]);

  const loading = useMemo(
    () => (
      <div
        className={`flex w-full items-center justify-center bg-[#11111a] ${
          variant === "volume" ? "h-full min-h-0" : "min-h-[460px]"
        }`}
      >
        <span className="text-sm text-zinc-400">Carregando prévia...</span>
      </div>
    ),
    [variant]
  );

  const error = useMemo(
    () => (
      <div
        className={`flex w-full items-center justify-center bg-[#11111a] px-6 text-center ${
          variant === "volume" ? "h-full min-h-0" : "min-h-[460px]"
        }`}
      >
        <span className="text-sm text-zinc-400">
          Não foi possível carregar a prévia deste PDF.
        </span>
      </div>
    ),
    [variant]
  );

  if (variant === "volume") {
    return (
      <div className="mx-auto w-full max-w-[240px] rounded-[1.4rem] border border-white/10 bg-[#11111a] p-2.5 shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
        <div
          ref={containerRef}
          className="relative aspect-[210/297] overflow-hidden rounded-[1rem] border border-white/10 bg-[#0d0d14]"
        >
          <div className="absolute inset-0 flex items-start justify-center pt-2">
            <Document
              file={fileUrl}
              loading={loading}
              error={error}
              className="flex items-start justify-center"
            >
              <Page
                pageNumber={1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={loading}
                className="max-w-none"
              />
            </Document>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#11111a] p-3 shadow-[0_16px_50px_rgba(0,0,0,0.35)]">
      <div
        ref={containerRef}
        className="border border-white/10 bg-[#0d0d14] p-3"
      >
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