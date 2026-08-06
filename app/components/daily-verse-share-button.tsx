"use client";

import { useState } from "react";

const ACERVO_LOGOS_PUBLIC_URL = "https://acervo-logos.vercel.app/";

function getDevotionalLabel(source?: string | null) {
  const normalized = String(source ?? "").trim().toLowerCase();

  if (normalized === "pao diario") {
    return "Devocional Pao Diario";
  }

  if (normalized === "spurgeon") {
    return "Devocional Dia e Noite";
  }

  return normalized ? `Devocional ${String(source).trim()}` : "Devocional";
}

function splitDailyDevotionalInsight(insight: string) {
  const normalized = String(insight ?? "").trim();

  if (!normalized) {
    return { title: "", body: "" };
  }

  const [titlePart, ...bodyParts] = normalized.split(/\n\s*\n/);
  const title = titlePart.trim();
  const body = bodyParts.join("\n\n").trim();

  if (!body) {
    return { title: "", body: normalized };
  }

  return { title, body };
}

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
  source,
  reference,
  version,
  verse,
  text,
  insight,
  prayer,
  closingThought,
}: {
  source?: string | null;
  reference: string;
  version: string;
  verse: number;
  text: string;
  insight: string;
  prayer?: string | null;
  closingThought?: string | null;
}) {
  const [feedback, setFeedback] = useState("");

  const referenceVerseLabel = reference.match(/:(\d+(?:-\d+)?)$/)?.[1] ?? String(verse);
  const devotional = splitDailyDevotionalInsight(insight);
  const devotionalLabel = getDevotionalLabel(source);

  async function handleShare() {
    const devotionalBlock = devotional.title
      ? `\n\n*${devotionalLabel}:* ${devotional.title}\n\n${devotional.body}`
      : `\n\n*${devotionalLabel}:*\n\n${insight}`;
    const optionalPrayerBlock = prayer ? `\n\n*Oracao:* ${prayer}` : "";
    const optionalClosingThoughtBlock = closingThought
      ? `\n\n*Citacao:* ${closingThought}`
      : "";

    const shareText = `${reference} | ${version}

*Versiculo:*
${referenceVerseLabel}. ${text}
${devotionalBlock}
${optionalPrayerBlock}
${optionalClosingThoughtBlock}

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
        Compartilhar {devotionalLabel}
      </button>

      {feedback ? (
        <p className="mt-2 text-xs text-amber-100/90">{feedback}</p>
      ) : null}
    </div>
  );
}
