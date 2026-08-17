import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

type SermonAssistantRequest = {
  action?: string;
  reference?: string;
  translation?: string;
  referenceText?: string;
  notes?: string;
  currentTitle?: string;
  introduction?: string;
  application?: string;
  currentConclusion?: string;
  currentMainPoints?: SermonOutlinePoint[];
  insertPosition?: string;
  theme?: string;
  objective?: string;
  tone?: string;
};

type SermonAssistantAction =
  | "outline"
  | "introduction"
  | "main_points"
  | "conclusion"
  | "notes_to_point";

type SermonOutlinePoint = {
  title?: string;
  content?: string;
};

type SermonAssistantPayload = {
  title?: string;
  introduction?: string;
  mainPoints?: SermonOutlinePoint[];
  application?: string;
  conclusion?: string;
};

type NotesToPointPayload = {
  title?: string;
  content?: string;
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

function parseSermonPayload(rawText: string) {
  const normalized = normalizeSpaces(extractJsonCandidate(rawText));

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as SermonAssistantPayload;
    const title = normalizeSpaces(String(parsed.title ?? ""));
    const introduction = String(parsed.introduction ?? "").trim();
    const application = String(parsed.application ?? "").trim();
    const conclusion = String(parsed.conclusion ?? "").trim();
    const mainPoints = Array.isArray(parsed.mainPoints)
      ? parsed.mainPoints
          .map((point) => ({
            title: normalizeSpaces(String(point?.title ?? "")),
            content: String(point?.content ?? "").trim(),
          }))
          .filter((point) => point.title || point.content)
          .slice(0, 4)
      : [];

    if (!title && !introduction && !mainPoints.length && !application && !conclusion) {
      return null;
    }

    return {
      title,
      introduction,
      mainPoints,
      application,
      conclusion,
    };
  } catch {
    return null;
  }
}

function parseNotesToPointPayload(rawText: string) {
  const normalized = normalizeSpaces(extractJsonCandidate(rawText));

  if (!normalized) {
    return null;
  }

  try {
    const parsed = JSON.parse(normalized) as NotesToPointPayload;
    const title = normalizeSpaces(String(parsed.title ?? ""));
    const content = String(parsed.content ?? "").trim();

    if (!title && !content) {
      return null;
    }

    return { title, content };
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
    return String((payload as { output_text: string }).output_text).trim();
  }

  if (payload && typeof payload === "object" && "output" in payload) {
    const output = (payload as { output?: unknown }).output;

    if (Array.isArray(output)) {
      return output
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
        .trim();
    }
  }

  return "";
}

function extractGeminiText(payload: GeminiGenerateContentResponse) {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];

  return parts
    .map((part) => String(part.text ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function buildOutlinePrompt(params: {
  reference: string;
  translation: string;
  referenceText: string;
  notes: string;
  currentTitle: string;
  theme: string;
  objective: string;
  tone: string;
}) {
  return [
    "Voce e um assistente de apoio ao Meu Sermonario do Acervo Logos.",
    "Sua tarefa e ajudar a montar um esboco de sermao biblico claro, fiel ao texto e pregavel.",
    "Responda em portugues do Brasil.",
    "Use tom pastoral, humano, natural e devocional, sem soar artificial.",
    "Priorize exegese simples e boa hermeneutica: observe o sentido do texto e desenvolva a mensagem a partir dele.",
    "Nao invente informacoes que nao estejam no texto fornecido.",
    "Nao escreva um sermao completo corrido. Gere um esboco organizado e pronto para o editor.",
    "Se o usuario informar um tema, trate esse tema como direcao principal do esboco.",
    "Se o usuario informar um objetivo, deixe a estrutura da mensagem servir a esse objetivo pastoral.",
    "Se o usuario informar um tom da mensagem, ajuste a linguagem e a enfase do esboco a esse tom.",
    "O tema, o objetivo e o tom devem orientar a resposta, mas nunca podem forcar o texto biblico a dizer algo que ele nao diz.",
    "O titulo deve ser curto, forte e pregavel.",
    "A introducao deve preparar a igreja para o tema em um texto curto.",
    "Crie de 2 a 4 pontos principais.",
    "Cada ponto deve ter titulo curto e desenvolvimento em linguagem clara e pastoral.",
    "A aplicacao deve trazer implicacoes praticas para os dias de hoje.",
    "A conclusao deve fechar a mensagem com chamada espiritual clara.",
    "Se houver observacoes do usuario, use apenas como apoio, sem deixar que elas dominem o texto biblico.",
    "Responda somente em JSON valido, sem markdown, neste formato exato:",
    '{"title":"...","introduction":"...","mainPoints":[{"title":"...","content":"..."}],"application":"...","conclusion":"..."}',
    params.theme ? `Tema proposto pelo usuario: ${params.theme}` : "",
    params.objective ? `Objetivo da mensagem: ${params.objective}` : "",
    params.tone ? `Tom desejado da mensagem: ${params.tone}` : "",
    params.reference ? `Referencia: ${params.reference}` : "",
    params.translation ? `Versao: ${params.translation}` : "",
    params.currentTitle ? `Titulo atual do usuario: ${params.currentTitle}` : "",
    params.referenceText ? `Texto biblico base:\n${params.referenceText}` : "",
    params.notes ? `Observacoes do usuario:\n${params.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildActionPrompt(
  action: SermonAssistantAction,
  params: {
    reference: string;
    translation: string;
    referenceText: string;
    notes: string;
    currentTitle: string;
    introduction: string;
    application: string;
    currentConclusion: string;
    currentMainPoints: SermonOutlinePoint[];
    insertPosition: string;
    theme: string;
    objective: string;
    tone: string;
  }
) {
  if (action === "introduction") {
    return [
      "Voce e um assistente de apoio ao Meu Sermonario do Acervo Logos.",
      "Escreva somente a introducao de um sermao biblico.",
      "Responda em portugues do Brasil com tom pastoral, humano, natural e devocional.",
      "A introducao deve ser curta, clara, pregavel e nascer do texto biblico.",
      "Nao invente dados fora do texto fornecido.",
      "Se o usuario informar tema, objetivo e tom, use isso como orientacao sem forcar o texto biblico.",
      "Responda somente em JSON valido, sem markdown, neste formato exato:",
      '{"title":"...","introduction":"..."}',
      params.theme ? `Tema proposto pelo usuario: ${params.theme}` : "",
      params.objective ? `Objetivo da mensagem: ${params.objective}` : "",
      params.tone ? `Tom desejado da mensagem: ${params.tone}` : "",
      params.reference ? `Referencia: ${params.reference}` : "",
      params.translation ? `Versao: ${params.translation}` : "",
      params.currentTitle ? `Titulo atual do usuario: ${params.currentTitle}` : "",
      params.referenceText ? `Texto biblico base:\n${params.referenceText}` : "",
      params.application ? `Aplicacao atual:\n${params.application}` : "",
      params.notes ? `Observacoes do usuario:\n${params.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (action === "main_points") {
    return [
      "Voce e um assistente de apoio ao Meu Sermonario do Acervo Logos.",
      "Crie somente os pontos principais de um sermao biblico.",
      "Responda em portugues do Brasil com tom pastoral, humano, natural e devocional.",
      "Priorize exegese simples e boa hermeneutica.",
      "Crie de 2 a 4 pontos principais, com titulo curto e desenvolvimento claro.",
      "Nao invente informacoes fora do texto fornecido.",
      "Se houver introducao, use-a apenas para manter unidade com o sermão.",
      "Responda somente em JSON valido, sem markdown, neste formato exato:",
      '{"mainPoints":[{"title":"...","content":"..."}]}',
      params.theme ? `Tema proposto pelo usuario: ${params.theme}` : "",
      params.objective ? `Objetivo da mensagem: ${params.objective}` : "",
      params.tone ? `Tom desejado da mensagem: ${params.tone}` : "",
      params.reference ? `Referencia: ${params.reference}` : "",
      params.translation ? `Versao: ${params.translation}` : "",
      params.currentTitle ? `Titulo atual do usuario: ${params.currentTitle}` : "",
      params.introduction ? `Introducao atual:\n${params.introduction}` : "",
      params.application ? `Aplicacao atual:\n${params.application}` : "",
      params.referenceText ? `Texto biblico base:\n${params.referenceText}` : "",
      params.notes ? `Observacoes do usuario:\n${params.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (action === "conclusion") {
    return [
      "Voce e um assistente de apoio ao Meu Sermonario do Acervo Logos.",
      "Escreva ou melhore somente a conclusao de um sermao biblico.",
      "Responda em portugues do Brasil com tom pastoral, humano, natural e devocional.",
      "A conclusao deve fechar a mensagem com clareza, unidade e chamada espiritual.",
      "Nao invente informacoes fora do texto fornecido.",
      "Use os pontos atuais apenas para manter coerencia com o restante do sermão.",
      "Responda somente em JSON valido, sem markdown, neste formato exato:",
      '{"conclusion":"..."}',
      params.theme ? `Tema proposto pelo usuario: ${params.theme}` : "",
      params.objective ? `Objetivo da mensagem: ${params.objective}` : "",
      params.tone ? `Tom desejado da mensagem: ${params.tone}` : "",
      params.reference ? `Referencia: ${params.reference}` : "",
      params.translation ? `Versao: ${params.translation}` : "",
      params.currentTitle ? `Titulo atual do usuario: ${params.currentTitle}` : "",
      params.currentConclusion
        ? `Conclusao atual a ser melhorada:\n${params.currentConclusion}`
        : "",
      params.currentMainPoints.length
        ? `Pontos atuais:\n${params.currentMainPoints
            .map(
              (point, index) =>
                `${index + 1}. ${point.title || `Ponto ${index + 1}`}: ${
                  point.content || ""
                }`
            )
            .join("\n")}`
        : "",
      params.application ? `Aplicacao atual:\n${params.application}` : "",
      params.referenceText ? `Texto biblico base:\n${params.referenceText}` : "",
      params.notes ? `Observacoes do usuario:\n${params.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (action === "notes_to_point") {
    return [
      "Voce e um assistente de apoio ao Meu Sermonario do Acervo Logos.",
      "Transforme as observacoes do usuario em apenas um ponto de sermao.",
      "Responda em portugues do Brasil com tom pastoral, humano, natural e devocional.",
      "Esse ponto precisa continuar fiel ao texto biblico e servir ao sermão.",
      "Nao invente informacoes fora do texto fornecido.",
      "Responda somente em JSON valido, sem markdown, neste formato exato:",
      '{"title":"...","content":"..."}',
      params.theme ? `Tema proposto pelo usuario: ${params.theme}` : "",
      params.objective ? `Objetivo da mensagem: ${params.objective}` : "",
      params.tone ? `Tom desejado da mensagem: ${params.tone}` : "",
      params.reference ? `Referencia: ${params.reference}` : "",
      params.translation ? `Versao: ${params.translation}` : "",
      params.currentTitle ? `Titulo atual do usuario: ${params.currentTitle}` : "",
      params.introduction ? `Introducao atual:\n${params.introduction}` : "",
      params.currentMainPoints.length
        ? `Pontos atuais:\n${params.currentMainPoints
            .map(
              (point, index) =>
                `${index + 1}. ${point.title || `Ponto ${index + 1}`}: ${
                  point.content || ""
                }`
            )
            .join("\n")}`
        : "",
      params.application ? `Aplicacao atual:\n${params.application}` : "",
      params.currentConclusion ? `Conclusao atual:\n${params.currentConclusion}` : "",
      params.insertPosition
        ? `Posicao desejada para o novo ponto: ${params.insertPosition}`
        : "",
      params.referenceText ? `Texto biblico base:\n${params.referenceText}` : "",
      params.notes ? `Observacoes do usuario:\n${params.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return buildOutlinePrompt(params);
}

async function generateWithGemini(
  prompt: string,
  action: SermonAssistantAction
) {
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
                text: "Voce produz esbocos de sermao fieis ao texto biblico, claros, pregaveis e pastoralmente responsaveis.",
              },
            ],
          },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 900,
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
  return action === "notes_to_point"
    ? parseNotesToPointPayload(text)
    : parseSermonPayload(text);
}

async function generateWithOpenAi(
  prompt: string,
  action: SermonAssistantAction
) {
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
        max_output_tokens: 900,
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
  return action === "notes_to_point"
    ? parseNotesToPointPayload(text)
    : parseSermonPayload(text);
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

    const body = (await request.json()) as SermonAssistantRequest;
    const action =
      body.action === "introduction" ||
      body.action === "main_points" ||
      body.action === "conclusion" ||
      body.action === "notes_to_point"
        ? body.action
        : "outline";
    const reference = normalizeSpaces(String(body.reference ?? ""));
    const translation = normalizeSpaces(String(body.translation ?? ""));
    const referenceText = String(body.referenceText ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const currentTitle = normalizeSpaces(String(body.currentTitle ?? ""));
    const introduction = String(body.introduction ?? "").trim();
    const application = String(body.application ?? "").trim();
    const currentConclusion = String(body.currentConclusion ?? "").trim();
    const currentMainPoints = Array.isArray(body.currentMainPoints)
      ? body.currentMainPoints
          .map((point) => ({
            title: normalizeSpaces(String(point?.title ?? "")),
            content: String(point?.content ?? "").trim(),
          }))
          .filter((point) => point.title || point.content)
          .slice(0, 4)
      : [];
    const insertPosition = normalizeSpaces(String(body.insertPosition ?? ""));
    const theme = normalizeSpaces(String(body.theme ?? ""));
    const objective = String(body.objective ?? "").trim();
    const tone = normalizeSpaces(String(body.tone ?? ""));

    if (!reference || !referenceText) {
      return NextResponse.json(
        { ok: false, error: "Selecione primeiro o texto biblico do sermao." },
        { status: 400 }
      );
    }

    if (action === "notes_to_point" && !notes) {
      return NextResponse.json(
        { ok: false, error: "Adicione algumas notas antes de gerar um ponto." },
        { status: 400 }
      );
    }

    const prompt = buildActionPrompt(action, {
      reference,
      translation,
      referenceText,
      notes,
      currentTitle,
      introduction,
      application,
      currentConclusion,
      currentMainPoints,
      insertPosition,
      theme,
      objective,
      tone,
    });

    const generated =
      (await generateWithGemini(prompt, action)) ??
      (await generateWithOpenAi(prompt, action));

    if (!generated) {
      return NextResponse.json(
        {
          ok: false,
          error: "A IA nao conseguiu montar o esboco agora. Tente novamente.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      action,
      outline:
        action === "notes_to_point"
          ? {
              mainPoints: [generated],
            }
          : generated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gerar o esboco com IA.",
      },
      { status: 500 }
    );
  }
}
