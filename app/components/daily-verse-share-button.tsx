"use client";

import { useState } from "react";

const ACERVO_LOGOS_PUBLIC_URL = "https://acervo-logos.vercel.app/";

async function copyText(payload: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = payload;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("copy_failed");
  }
}

export default function DailyVerseShareButton({
  reference,
  version,
  text,
  insight,
}: {
  reference: string;
  version: string;
  text: string;
  insight: string;
}) {
  const [feedback, setFeedback] = useState("");

  async function handleShare() {
    const shareText = `${reference} | ${version}

${text}

${insight}

@acervo-logos | Estude mais no Acervo Logos: ${ACERVO_LOGOS_PUBLIC_URL}`;

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${reference} | ${version}`,
            text: shareText,
          });
          setFeedback("Conteudo compartilhado com sucesso.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
        }
      }

      await copyText(shareText);
      setFeedback("Conteudo copiado para compartilhar.");
    } catch {
      setFeedback("Nao foi possivel compartilhar agora.");
    } finally {
      window.setTimeout(() => {
        setFeedback("");
      }, 2600);
    }
  }

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={() => void handleShare()}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-100 transition hover:bg-white/[0.1] sm:text-[11px]"
      >
        Compartilhar versiculo do dia
      </button>

      {feedback ? (
        <p className="mt-2 text-xs text-amber-100/90">{feedback}</p>
      ) : null}
    </div>
  );
}
