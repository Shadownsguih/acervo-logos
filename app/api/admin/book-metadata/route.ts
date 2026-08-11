import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  return !!email && !!adminEmail && email.toLowerCase() === adminEmail;
}

type AiGeneratedBookMetadata = {
  success: boolean;
  title: string;
  description: string;
  authors: string[];
  categories: string[];
  publishedDate: string | null;
  source: string;
};

type GeneratedMetadataPayload = {
  title?: string;
  description?: string;
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

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shortenDescription(value: string, maxLength = 420) {
  const normalized = normalizeSpaces(stripHtml(value));

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength);
  const lastSentenceBreak = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("; "),
    sliced.lastIndexOf(": ")
  );

  if (lastSentenceBreak >= 160) {
    return `${sliced.slice(0, lastSentenceBreak + 1).trim()}...`;
  }

  return `${sliced.trim()}...`;
}

function buildMetadataPrompt(params: { title?: string; contextText?: string }) {
  const title = normalizeSpaces(params.title ?? "");
  const contextText = normalizeSpaces(params.contextText ?? "");

  return [
    "Voce organiza metadados editoriais para um acervo teologico digital.",
    "Sua tarefa e gerar um titulo limpo e uma descricao curta com base principalmente no texto extraido do PDF.",
    "Responda somente em JSON valido, sem markdown, no formato: {\"title\":\"...\",\"description\":\"...\"}.",
    "O titulo deve ficar natural, corrigido e limpo, sem nomes de arquivo, extensoes, codigo interno ou excesso de pontuacao.",
    "A descricao deve ter 2 ou 3 frases em portugues do Brasil, tom claro, elegante e comercial.",
    "Nao invente detalhes que nao estejam sustentados pelo texto fornecido.",
    title ? `Titulo preliminar: ${title}` : "Titulo preliminar: nao informado",
    contextText
      ? `Texto extraido do PDF: ${contextText}`
      : "Texto extraido do PDF: nao informado",
  ].join("\n\n");
}

function parseGeneratedMetadata(rawText: string) {
  const normalized = normalizeSpaces(rawText);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as GeneratedMetadataPayload;
    const title = normalizeSpaces(String(parsed.title ?? ""));
    const description = shortenDescription(String(parsed.description ?? ""), 420);

    if (!title || !description) {
      return null;
    }

    return {
      title,
      description,
    };
  } catch {
    return null;
  }
}

function extractResponseOutputText(payload: unknown) {
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

  return "";
}

async function generateAiSummary(params: {
  title?: string;
  contextText?: string;
}): Promise<AiGeneratedBookMetadata | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-nano";
  const prompt = buildMetadataPrompt(params);

  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        max_output_tokens: 260,
        store: false,
      }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const outputText = extractResponseOutputText(payload);
  const generatedMetadata = parseGeneratedMetadata(outputText);

  if (!generatedMetadata) {
    return null;
  }

  return {
    success: true,
    title: generatedMetadata.title,
    description: generatedMetadata.description,
    authors: [],
    categories: [],
    publishedDate: null,
    source: "OpenAI",
  };
}

function extractGeminiText(payload: GeminiGenerateContentResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => String(part.text ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return normalizeSpaces(text);
}

async function generateGeminiSummary(params: {
  title?: string;
  contextText?: string;
}): Promise<AiGeneratedBookMetadata | null> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const prompt = buildMetadataPrompt(params);

  let response: Response;

  try {
    response = await fetch(
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
                text: "Voce produz titulos e descricoes editoriais curtos, claros e confiaveis para livros e materiais de estudo.",
              },
            ],
          },
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 260,
          },
        }),
        cache: "no-store",
      }
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload =
    (await response.json().catch(() => null)) as GeminiGenerateContentResponse | null;
  const outputText = payload ? extractGeminiText(payload) : "";
  const generatedMetadata = parseGeneratedMetadata(outputText);

  if (!generatedMetadata) {
    return null;
  }

  return {
    success: true,
    title: generatedMetadata.title,
    description: generatedMetadata.description,
    authors: [],
    categories: [],
    publishedDate: null,
    source: "Gemini",
  };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !isAdminEmail(user?.email)) {
      return NextResponse.json(
        { error: "Acesso nao autorizado." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      title?: string;
      contextText?: string;
    };
    const title = String(body.title ?? "").trim();
    const contextText = String(body.contextText ?? "").trim();

    if (!title && !contextText) {
      return NextResponse.json(
        { error: "Envie um titulo preliminar ou texto extraido do PDF." },
        { status: 400 }
      );
    }

    const geminiResult = await generateGeminiSummary({
      title,
      contextText,
    });

    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }

    const aiResult = await generateAiSummary({
      title,
      contextText,
    });

    if (aiResult) {
      return NextResponse.json(aiResult);
    }

    return NextResponse.json(
      {
        error:
          "A geracao por IA nao respondeu com titulo e descricao validos. Verifique a chave configurada e tente novamente.",
      },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gerar metadados com IA.",
      },
      { status: 500 }
    );
  }
}
