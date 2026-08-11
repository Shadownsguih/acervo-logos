import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  getMyBibleDictionaryEntry,
  searchMyBibleDictionary,
  type DictionaryEntry,
} from "@/lib/mybible-dictionary";

export const runtime = "nodejs";

type MaterialCandidate = {
  id: string;
  title: string;
  description: string | null;
};

type StudyAssistantRequest = {
  question?: string;
  reference?: string;
  translation?: string;
  selectedVerseText?: string;
  chapterText?: string;
  mode?: string;
  contextLabel?: string;
  history?: Array<{
    role?: string;
    content?: string;
  }>;
};

type StudyAssistantPayload = {
  answer?: string;
  keyPoints?: string[];
  recommendedMaterialIds?: string[];
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

function normalizeText(value: string) {
  return normalizeSpaces(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractKeywords(...values: string[]) {
  const stopWords = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "a",
    "o",
    "as",
    "os",
    "e",
    "em",
    "na",
    "no",
    "nas",
    "nos",
    "para",
    "por",
    "com",
    "uma",
    "um",
    "que",
    "como",
    "qual",
    "quais",
    "sobre",
    "esse",
    "essa",
    "este",
    "esta",
    "versiculo",
    "versiculo?",
    "capitulo",
    "explicar",
    "explique",
    "estudo",
    "biblia",
  ]);

  const keywords = values
    .flatMap((value) =>
      normalizeText(value)
        .split(/[^a-z0-9]+/)
        .filter((item) => item.length >= 4 && !stopWords.has(item))
    )
    .slice(0, 12);

  return [...new Set(keywords)];
}

function parseAssistantPayload(rawText: string) {
  const normalized = normalizeSpaces(rawText);

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as StudyAssistantPayload;
    const answer = normalizeSpaces(String(parsed.answer ?? ""));
    const keyPoints = Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints
          .map((item) => normalizeSpaces(String(item ?? "")))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const recommendedMaterialIds = Array.isArray(parsed.recommendedMaterialIds)
      ? parsed.recommendedMaterialIds
          .map((item) => normalizeSpaces(String(item ?? "")))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!answer) {
      return null;
    }

    return {
      answer,
      keyPoints,
      recommendedMaterialIds,
    };
  } catch {
    return null;
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
  return normalizeSpaces(
    parts
      .map((part) => String(part.text ?? "").trim())
      .filter(Boolean)
      .join(" ")
  );
}

function buildPrompt(params: {
  question: string;
  reference: string;
  translation: string;
  selectedVerseText: string;
  chapterText: string;
  mode: "bible" | "pdf";
  contextLabel: string;
  dictionaryEntries: DictionaryEntry[];
  materials: MaterialCandidate[];
  history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
  const dictionaryBlock = params.dictionaryEntries.length
    ? params.dictionaryEntries
        .map((entry, index) => {
          return [
            `${index + 1}. ${entry.displayTerm}`,
            entry.shortDefinition
              ? `Definicao curta: ${entry.shortDefinition}`
              : "",
            entry.fullDefinition
              ? `Definicao completa: ${normalizeSpaces(entry.fullDefinition).slice(0, 700)}`
              : "",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n")
    : "Nenhuma entrada de dicionario relevante foi localizada.";

  const materialsBlock = params.materials.length
    ? params.materials
        .map((material) =>
          [
            `ID: ${material.id}`,
            `Titulo: ${material.title}`,
            material.description
              ? `Descricao: ${normalizeSpaces(material.description).slice(0, 260)}`
              : "Descricao: sem descricao cadastrada.",
          ].join("\n")
        )
        .join("\n\n")
    : "Nenhum material do acervo foi localizado para recomendacao.";
  const historyBlock = params.history.length
    ? params.history
        .slice(-6)
        .map((item, index) => {
          return `${index + 1}. ${
            item.role === "assistant" ? "Assistente" : "Aluno"
          }: ${item.content}`;
        })
        .join("\n")
    : "Nenhum historico anterior.";

  return [
    "Voce e um assistente de estudo biblico do Acervo Logos.",
    "Responda em portugues do Brasil, com tom pastoral, reverente, claro e teologicamente cuidadoso.",
    params.mode === "pdf"
      ? "Baseie sua resposta primeiro no contexto do documento em leitura, depois nos verbetes do dicionario quando forem uteis, e por fim nos materiais do acervo."
      : "Baseie sua resposta primeiro no trecho biblico fornecido, depois nos verbetes do dicionario e por fim nos materiais do acervo.",
    "Nao invente citacoes biblicas, nao afirme polemicas doutrinarias como se fossem consenso e nao mencione informacoes nao fornecidas.",
    "Quando houver limite de certeza, use formulacoes como 'o texto enfatiza', 'o contexto sugere' ou 'neste trecho vemos'.",
    "Considere o historico recente da conversa para manter continuidade, mas priorize sempre o trecho biblico atual.",
    "Responda somente em JSON valido, sem markdown, neste formato exato: {\"answer\":\"...\",\"keyPoints\":[\"...\"],\"recommendedMaterialIds\":[\"...\"]}.",
    "recommendedMaterialIds deve conter somente IDs da lista de materiais fornecida, com no maximo 3 itens.",
    `Historico recente:\n${historyBlock}`,
    `Pergunta do aluno: ${params.question}`,
    `Contexto atual: ${params.contextLabel || params.reference || "Nao informado"}`,
    params.reference ? `Referencia atual: ${params.reference}` : "",
    params.translation ? `Traducao atual: ${params.translation}` : "",
    params.selectedVerseText
      ? `Versiculo em foco: ${params.selectedVerseText}`
      : "",
    params.chapterText
      ? params.mode === "pdf"
        ? `Contexto de leitura atual:\n${params.chapterText}`
        : `Trecho biblico atual:\n${params.chapterText}`
      : "",
    `Verbetes do dicionario relevantes:\n${dictionaryBlock}`,
    `Materiais candidatos do acervo:\n${materialsBlock}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function findMaterialCandidates(params: {
  question: string;
  reference: string;
  chapterText: string;
}) {
  const supabase = await createClient();
  const keywords = extractKeywords(
    params.question,
    params.reference,
    params.chapterText
  );

  const orFilters = keywords
    .slice(0, 6)
    .flatMap((keyword) => [
      `title.ilike.%${keyword}%`,
      `description.ilike.%${keyword}%`,
    ]);

  if (!orFilters.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("materials")
    .select("id, title, description")
    .or(orFilters.join(","))
    .order("title", { ascending: true })
    .limit(8);

  if (error || !data) {
    return [];
  }

  return data as MaterialCandidate[];
}

async function findDictionaryEntries(question: string, selectedVerseText: string) {
  const keywords = extractKeywords(question, selectedVerseText).slice(0, 4);
  const collected = new Map<string, DictionaryEntry>();

  for (const keyword of keywords) {
    const results = await searchMyBibleDictionary(keyword, 3);

    for (const result of results) {
      const entry = await getMyBibleDictionaryEntry(result.id);

      if (entry && !collected.has(entry.id)) {
        collected.set(entry.id, entry);
      }

      if (collected.size >= 3) {
        return [...collected.values()];
      }
    }
  }

  return [...collected.values()];
}

async function generateWithGemini(prompt: string) {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";

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
                text: "Voce produz respostas de estudo biblico fiéis ao contexto, claras e pastoralmente responsáveis.",
              },
            ],
          },
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 700,
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
  const text = payload ? extractGeminiText(payload) : "";
  const parsed = parseAssistantPayload(text);

  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    source: "Gemini",
  };
}

async function generateWithOpenAi(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-nano";

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
        max_output_tokens: 700,
        store: false,
        reasoning: {
          effort: "minimal",
        },
        text: {
          verbosity: "low",
        },
      }),
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  const text = extractOpenAiText(payload);
  const parsed = parseAssistantPayload(text);

  if (!parsed) {
    return null;
  }

  return {
    ...parsed,
    source: "OpenAI",
  };
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

    const body = (await request.json()) as StudyAssistantRequest;
    const question = normalizeSpaces(String(body.question ?? ""));
    const reference = normalizeSpaces(String(body.reference ?? ""));
    const translation = normalizeSpaces(String(body.translation ?? ""));
    const selectedVerseText = normalizeSpaces(String(body.selectedVerseText ?? ""));
    const chapterText = normalizeSpaces(String(body.chapterText ?? ""));
    const mode = body.mode === "pdf" ? "pdf" : "bible";
    const contextLabel = normalizeSpaces(String(body.contextLabel ?? ""));
    const history = Array.isArray(body.history)
      ? body.history
          .map((item) => {
            const role = item?.role === "assistant" ? "assistant" : "user";
            const content = normalizeSpaces(String(item?.content ?? ""));

            if (!content) {
              return null;
            }

            return {
              role,
              content,
            } as {
              role: "user" | "assistant";
              content: string;
            };
          })
          .filter(
            (
              item
            ): item is {
              role: "user" | "assistant";
              content: string;
            } => item !== null
          )
          .slice(-6)
      : [];

    if (!question || (!selectedVerseText && !chapterText)) {
      return NextResponse.json(
        { ok: false, error: "Pergunta ou contexto de leitura insuficiente." },
        { status: 400 }
      );
    }

    const [dictionaryEntries, materialCandidates] = await Promise.all([
      findDictionaryEntries(question, selectedVerseText),
      findMaterialCandidates({
        question,
        reference,
        chapterText: selectedVerseText || chapterText,
      }),
    ]);

    const prompt = buildPrompt({
      question,
      reference,
      translation,
      selectedVerseText,
      chapterText,
      mode,
      contextLabel,
      dictionaryEntries,
      materials: materialCandidates,
      history,
    });

    const generated =
      (await generateWithGemini(prompt)) ?? (await generateWithOpenAi(prompt));

    if (!generated) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O assistente nao conseguiu responder agora. Tente novamente em alguns instantes.",
        },
        { status: 503 }
      );
    }

    const recommendedMaterials = generated.recommendedMaterialIds
      .map((id) => materialCandidates.find((material) => material.id === id) ?? null)
      .filter((material): material is MaterialCandidate => material !== null);

    return NextResponse.json({
      ok: true,
      source: generated.source,
      answer: generated.answer,
      keyPoints: generated.keyPoints,
      dictionaryEntries: dictionaryEntries.map((entry) => ({
        id: entry.id,
        displayTerm: entry.displayTerm,
        shortDefinition: entry.shortDefinition,
        language: entry.language,
      })),
      recommendedMaterials,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao consultar o assistente.",
      },
      { status: 500 }
    );
  }
}
