import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type OcrCleanupRequest = {
  text?: string;
  lines?: string[];
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractJsonCandidate(rawText: string) {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = rawText.indexOf("{");
  const lastBrace = rawText.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1).trim();
  }

  return rawText.trim();
}

function parseCleanupPayload(rawText: string) {
  const normalized = extractJsonCandidate(rawText);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as {
      correctedText?: string;
      correctedLines?: string[];
    };

    return {
      correctedText: normalizeSpaces(String(parsed.correctedText ?? "")),
      correctedLines: Array.isArray(parsed.correctedLines)
        ? parsed.correctedLines.map((item) => normalizeSpaces(String(item ?? "")))
        : [],
    };
  } catch {
    return {
      correctedText: normalizeSpaces(rawText),
      correctedLines: [],
    };
  }
}

function extractOpenAiText(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "output_text" in payload &&
    typeof (payload as { output_text?: unknown }).output_text === "string"
  ) {
    return normalizeSpaces(
      String((payload as { output_text: string }).output_text)
    );
  }

  if (payload && typeof payload === "object" && "output" in payload) {
    const output = (payload as { output?: unknown }).output;

    if (Array.isArray(output)) {
      return normalizeSpaces(
        output
          .flatMap((item) => {
            if (!item || typeof item !== "object" || !("content" in item)) {
              return [];
            }

            const content = (item as { content?: unknown }).content;

            if (!Array.isArray(content)) {
              return [];
            }

            return content
              .map((entry) => {
                if (
                  entry &&
                  typeof entry === "object" &&
                  "text" in entry &&
                  typeof entry.text === "string"
                ) {
                  return entry.text;
                }

                return "";
              })
              .filter(Boolean);
          })
          .join(" ")
      );
    }
  }

  return "";
}

function extractGeminiText(payload: GeminiGenerateContentResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  return parts
    .map((part) => String(part.text ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function buildCleanupPrompt(input: { text?: string; lines?: string[] }) {
  if (input.lines?.length) {
    return [
      "Voce corrige exclusivamente texto extraido por OCR de livros teologicos em portugues.",
      "Corrija espacos quebrados entre letras, acentuacao, pontuacao, cedilha, capitalizacao e palavras partidas.",
      "Nao resuma, nao explique, nao comente e nao acrescente informacoes novas.",
      "Mantenha a mesma ordem e a mesma quantidade de linhas recebidas.",
      "Cada item corrigido deve corresponder exatamente a uma linha de entrada.",
      'Responda somente em JSON valido no formato {"correctedLines":["linha 1","linha 2"]}.',
      `Linhas OCR:\n${input.lines
        .map((line, index) => `${index + 1}. ${line}`)
        .join("\n")}`,
    ].join("\n\n");
  }

  return [
    "Voce corrige exclusivamente texto extraido por OCR de livros teologicos em portugues.",
    "Corrija espacos quebrados entre letras, acentuacao, pontuacao, cedilha, capitalizacao e palavras partidas.",
    "Nao resuma, nao explique, nao comente, nao acrescente informacoes novas.",
    "Preserve o sentido original e a estrutura do trecho o maximo possivel.",
    "Se houver duvida, prefira manter o termo mais conservador em vez de inventar.",
    'Responda somente em JSON valido no formato {"correctedText":"..."}',
    `Trecho OCR:\n${input.text ?? ""}`,
  ].join("\n\n");
}

async function generateWithGemini(prompt: string) {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Voce apenas limpa OCR. Nao interpreta nem expande o conteudo.",
              },
            ],
          },
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 480,
          },
        }),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const payload =
      (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;
    const text = payload ? extractGeminiText(payload) : "";
    return parseCleanupPayload(text);
  } catch {
    return null;
  }
}

async function generateWithOpenAi(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-nano";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: 480,
        store: false,
        reasoning: {
          effort: "minimal",
        },
        text: {
          verbosity: "low",
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json().catch(() => null)) as unknown;
    return parseCleanupPayload(extractOpenAiText(payload));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Acesso nao autorizado." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as OcrCleanupRequest;
    const lines = Array.isArray(body.lines)
      ? body.lines.map((line) => normalizeSpaces(String(line ?? ""))).filter(Boolean)
      : [];
    const text = normalizeSpaces(String(body.text ?? ""));

    if (!lines.length && text.length < 4) {
      return NextResponse.json(
        { ok: false, error: "Trecho OCR insuficiente." },
        { status: 400 }
      );
    }

    const prompt = buildCleanupPrompt({
      text,
      lines,
    });
    const generated =
      (await generateWithGemini(prompt)) ?? (await generateWithOpenAi(prompt));

    return NextResponse.json({
      ok: true,
      correctedText: generated?.correctedText || text,
      correctedLines:
        generated?.correctedLines?.length === lines.length
          ? generated.correctedLines
          : lines,
      source: generated ? "ai" : "original",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao corrigir o texto OCR.",
      },
      { status: 500 }
    );
  }
}
