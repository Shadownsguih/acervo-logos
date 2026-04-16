"use client";

import dynamic from "next/dynamic";
import type { ReaderV2ClientProps } from "@/app/components/reader-v2-client";

const ReaderV2Client = dynamic(
  () => import("@/app/components/reader-v2-client"),
  {
    ssr: false,
    loading: () => (
      <main className="fixed inset-0 flex items-center justify-center bg-[#0b0c10] text-white">
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200">
          Carregando reader...
        </div>
      </main>
    ),
  }
);

export default function ReaderV2Entry(props: ReaderV2ClientProps) {
  return <ReaderV2Client {...props} />;
}
