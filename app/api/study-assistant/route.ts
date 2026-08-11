import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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
  themes?: string[];
  doctrine?: string[];
  application?: string[];
  keyPoints?: string[];
  recommendedMaterialIds?: string[];
};

type HistoryInsertRow = {
  user_id: string;
  context_type: string;
  context_label: string | null;
  question: string;
  answer: string;
  key_points: string[];
  recommended_material_ids: string[];
  source: string | null;
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
  const normalized = normalizeSpaces(extractJsonCandidate(rawText));

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
    const themes = Array.isArray(parsed.themes)
      ? parsed.themes
          .map((item) => normalizeSpaces(String(item ?? "")))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const doctrine = Array.isArray(parsed.doctrine)
      ? parsed.doctrine
          .map((item) => normalizeSpaces(String(item ?? "")))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    const application = Array.isArray(parsed.application)
      ? parsed.application
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
      themes,
      doctrine,
      application,
      keyPoints,
      recommendedMaterialIds,
    };
  } catch {
    return {
      answer: normalized,
      themes: [],
      doctrine: [],
      application: [],
      keyPoints: [],
      recommendedMaterialIds: [],
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
  materials: MaterialCandidate[];
  history: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}) {
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
    "Responda em portugues do Brasil, com tom pastoral, reverente, claro e natural.",
    "Explique como um bom professor: didatico, humano, paciente e facil de entender.",
    "Priorize o significado do texto no seu contexto imediato e, quando ajudar, considere tambem o contexto do livro biblico.",
    "Evite respostas superficiais, mas tambem nao use linguagem pesada, artificial ou academica demais.",
    "Traga profundidade quando necessario, sem perder clareza, calor humano e sensibilidade devocional.",
    params.mode === "pdf"
      ? "Baseie sua resposta primeiro no contexto do documento em leitura e, quando fizer sentido, recomende materiais do acervo."
      : "Baseie sua resposta primeiro no trecho biblico fornecido e, quando fizer sentido, recomende materiais do acervo.",
    "Nao invente citacoes biblicas, nao afirme polemicas doutrinarias como se fossem consenso e nao mencione informacoes nao fornecidas.",
    "Quando houver limite de certeza, use formulacoes como 'o texto enfatiza', 'o contexto sugere' ou 'neste trecho vemos'.",
    "Ao responder perguntas sobre aplicacao, explique primeiro o sentido do texto e depois mostre uma aplicacao pessoal e pratica para os dias de hoje.",
    "A aplicacao deve soar humana, concreta, devocional e proxima da vida real do leitor.",
    "Em perguntas doutrinarias, responda com fidelidade biblica, humildade e equilibrio.",
    "Considere o historico recente da conversa para manter continuidade, mas priorize sempre o trecho biblico atual.",
    "Gere tambem tres grupos curtos para organizar a resposta: temas, doutrina e aplicacao.",
    "Responda somente em JSON valido, sem markdown, neste formato exato: {\"answer\":\"...\",\"themes\":[\"...\"],\"doctrine\":[\"...\"],\"application\":[\"...\"],\"keyPoints\":[\"...\"],\"recommendedMaterialIds\":[\"...\"]}.",
    "themes deve resumir os assuntos centrais do trecho, com no maximo 4 itens curtos.",
    "doctrine deve resumir enfases biblicas e teologicas do trecho, com no maximo 4 itens curtos.",
    "application deve resumir implicacoes praticas para a vida crista que nascem do proprio texto, com no maximo 4 itens curtos.",
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
                text: "Voce produz respostas de estudo biblico fieis ao contexto, claras e pastoralmente responsaveis.",
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
            responseMimeType: "application/json",
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

async function persistStudyAssistantHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: HistoryInsertRow
) {
  const { error } = await supabase.from("study_assistant_history").insert(row);

  if (error) {
    const message = String(error.message || "");

    if (
      message.includes("study_assistant_history") ||
      message.includes("schema cache") ||
      message.includes("relation") ||
      message.includes("does not exist")
    ) {
      return;
    }

    throw error;
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

    const [materialCandidates] = await Promise.all([
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

    await persistStudyAssistantHistory(supabase, {
      user_id: user.id,
      context_type: mode,
      context_label: contextLabel || reference || null,
      question,
      answer: generated.answer,
      key_points: generated.keyPoints,
      recommended_material_ids: generated.recommendedMaterialIds,
      source: generated.source,
    });

    return NextResponse.json({
      ok: true,
      source: generated.source,
      answer: generated.answer,
      themes: generated.themes,
      doctrine: generated.doctrine,
      application: generated.application,
      keyPoints: generated.keyPoints,
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
