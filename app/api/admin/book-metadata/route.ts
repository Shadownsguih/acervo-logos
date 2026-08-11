import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  return !!email && !!adminEmail && email.toLowerCase() === adminEmail;
}

type GoogleBooksVolume = {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    publishedDate?: string;
  };
};

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  language?: string[];
};

type OpenLibraryWork = {
  title?: string;
  description?:
    | string
    | {
        type?: string;
        value?: string;
      };
  subjects?: string[];
  first_publish_date?: string;
};

type AiGeneratedBookMetadata = {
  success: boolean;
  title: string;
  description: string;
  authors: string[];
  categories: string[];
  publishedDate: string | null;
  source: string;
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => normalizeSpaces(value)).filter(Boolean))];
}

function buildTitleCandidates(title: string) {
  const normalizedTitle = normalizeSpaces(title);
  const candidates = [
    normalizedTitle,
    normalizedTitle.replace(/\s*[:\-|]\s*.+$/g, "").trim(),
    normalizedTitle
      .replace(/\b(?:volume|vol\.?|tomo|parte|livro)\s*[ivxlcdm\d]+\b/gi, "")
      .trim(),
    normalizedTitle
      .replace(/\b(?:comentario|comentário)\b/gi, "comentario")
      .trim(),
    normalizedTitle
      .replace(/\b(?:bíblico|biblico)\b/gi, "biblico")
      .trim(),
  ];

  const compoundCandidates = candidates.flatMap((candidate) => [
    candidate,
    candidate.replace(/\s{2,}/g, " ").trim(),
    candidate.split(":")[0]?.trim() ?? "",
  ]);

  return uniqueValues(compoundCandidates).filter((candidate) => candidate.length >= 3);
}

function buildSearchScore(query: string, item: GoogleBooksVolume) {
  const queryNormalized = normalizeText(query);
  const title = String(item.volumeInfo?.title ?? "");
  const subtitle = String(item.volumeInfo?.subtitle ?? "");
  const authors = (item.volumeInfo?.authors ?? []).join(" ");
  const haystack = normalizeText(`${title} ${subtitle} ${authors}`);

  if (!haystack) {
    return 0;
  }

  if (haystack === queryNormalized) {
    return 100;
  }

  if (haystack.includes(queryNormalized)) {
    return 80;
  }

  const queryTerms = queryNormalized.split(" ").filter(Boolean);
  const matchedTerms = queryTerms.filter((term) => haystack.includes(term));

  return matchedTerms.length * 10;
}

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

function buildDisplayTitle(item: GoogleBooksVolume) {
  const title = String(item.volumeInfo?.title ?? "").trim();
  const subtitle = String(item.volumeInfo?.subtitle ?? "").trim();

  if (!title) {
    return "";
  }

  if (!subtitle) {
    return title;
  }

  return `${title}: ${subtitle}`;
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
  title: string;
  contextText?: string;
}): Promise<AiGeneratedBookMetadata | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5-nano";
  const contextText = normalizeSpaces(params.contextText ?? "");
  const prompt = [
    "Voce escreve descricoes editoriais curtas para um acervo teologico digital.",
    "Gere uma descricao em portugues do Brasil com 2 ou 3 frases, tom claro, elegante e comercial.",
    "Nao use markdown, nao invente detalhes especificos que nao estejam sustentados pelo contexto.",
    "Se o contexto estiver incompleto, use uma descricao geral e neutra baseada no titulo da obra.",
    `Titulo: ${params.title}`,
    contextText ? `Contexto extraido do PDF: ${contextText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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
        max_output_tokens: 220,
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

  if (!outputText) {
    return null;
  }

  return {
    success: true,
    title: params.title,
    description: shortenDescription(outputText, 420),
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
  title: string;
  contextText?: string;
}): Promise<AiGeneratedBookMetadata | null> {
  const apiKey =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  const contextText = normalizeSpaces(params.contextText ?? "");
  const prompt = [
    "Escreva uma descricao editorial curta para um acervo teologico digital.",
    "Responda em portugues do Brasil, com 2 ou 3 frases, tom claro, elegante e comercial.",
    "Nao use markdown.",
    "Nao invente detalhes especificos que nao estejam sustentados pelo contexto fornecido.",
    "Se o contexto for limitado, produza uma descricao geral e neutra baseada no titulo.",
    `Titulo: ${params.title}`,
    contextText ? `Contexto inicial extraido do PDF: ${contextText}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

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
                text: "Voce produz descricoes editoriais curtas e confiaveis para livros e materiais de estudo.",
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
            temperature: 0.4,
            maxOutputTokens: 220,
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

  if (!outputText) {
    return null;
  }

  return {
    success: true,
    title: params.title,
    description: shortenDescription(outputText, 420),
    authors: [],
    categories: [],
    publishedDate: null,
    source: "Gemini",
  };
}

async function searchGoogleBooks(query: string) {
  const params = new URLSearchParams({
    q: `intitle:${query}`,
    langRestrict: "pt",
    printType: "books",
    maxResults: "5",
  });

  let response: Response;

  try {
    response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
      {
        cache: "no-store",
      }
    );
  } catch {
    throw new Error("GOOGLE_BOOKS_FETCH_FAILED");
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: {
            code?: number;
            message?: string;
          };
        }
      | null;

    const errorCode = Number(payload?.error?.code ?? response.status);

    if (errorCode === 429) {
      throw new Error("GOOGLE_BOOKS_QUOTA_EXCEEDED");
    }

    throw new Error("Nao foi possivel consultar o Google Books.");
  }

  const payload = (await response.json()) as {
    items?: GoogleBooksVolume[];
  };

  return payload.items ?? [];
}

async function findGoogleBooksMatch(title: string) {
  const candidates = buildTitleCandidates(title);
  let googleQuotaExceeded = false;
  let googleFetchFailed = false;
  let fallbackMatch: {
    success: boolean;
    title: string;
    description: string;
    authors: string[];
    categories: string[];
    publishedDate: string | null;
    source: string;
  } | null = null;

  for (const candidate of candidates) {
    try {
      const items = await searchGoogleBooks(candidate);
      const rankedItems = items
        .map((item) => ({
          item,
          score: buildSearchScore(candidate, item),
        }))
        .sort((left, right) => right.score - left.score);

      const bestMatch = rankedItems.find(
        ({ item }) =>
          normalizeSpaces(String(item.volumeInfo?.description ?? "")).length > 0
      )?.item;

      if (bestMatch?.volumeInfo?.description) {
        return {
          match: {
            success: true,
            title: buildDisplayTitle(bestMatch),
            description: shortenDescription(bestMatch.volumeInfo.description),
            authors: bestMatch.volumeInfo.authors ?? [],
            categories: bestMatch.volumeInfo.categories ?? [],
            publishedDate: bestMatch.volumeInfo.publishedDate ?? null,
            source: "Google Books",
          },
          googleQuotaExceeded,
          googleFetchFailed,
        };
      }

      const firstAvailableDescription = rankedItems.find(
        ({ item }) =>
          normalizeSpaces(String(item.volumeInfo?.description ?? "")).length > 0
      )?.item;

      if (
        firstAvailableDescription?.volumeInfo?.description &&
        !fallbackMatch
      ) {
        fallbackMatch = {
          success: true,
          title: buildDisplayTitle(firstAvailableDescription),
          description: shortenDescription(
            firstAvailableDescription.volumeInfo.description
          ),
          authors: firstAvailableDescription.volumeInfo.authors ?? [],
          categories: firstAvailableDescription.volumeInfo.categories ?? [],
          publishedDate:
            firstAvailableDescription.volumeInfo.publishedDate ?? null,
          source: "Google Books",
        };
      }
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error;
      }

      if (error.message === "GOOGLE_BOOKS_QUOTA_EXCEEDED") {
        googleQuotaExceeded = true;
        break;
      }

      if (error.message === "GOOGLE_BOOKS_FETCH_FAILED") {
        googleFetchFailed = true;
        continue;
      }

      throw error;
    }
  }

  return {
    match: fallbackMatch,
    googleQuotaExceeded,
    googleFetchFailed,
  };
}

function extractOpenLibraryDescription(value: OpenLibraryWork["description"]) {
  if (typeof value === "string") {
    return normalizeSpaces(value);
  }

  if (value && typeof value.value === "string") {
    return normalizeSpaces(value.value);
  }

  return "";
}

async function searchOpenLibrary(query: string) {
  const searchParams = new URLSearchParams({
    q: query,
    limit: "5",
  });

  let searchResponse: Response;

  try {
    searchResponse = await fetch(
      `https://openlibrary.org/search.json?${searchParams.toString()}`,
      {
        cache: "no-store",
      }
    );
  } catch {
    throw new Error("OPEN_LIBRARY_FETCH_FAILED");
  }

  if (!searchResponse.ok) {
    throw new Error("Nao foi possivel consultar a Open Library.");
  }

  const searchPayload = (await searchResponse.json()) as {
    docs?: OpenLibrarySearchDoc[];
  };

  const docs = searchPayload.docs ?? [];

  for (const doc of docs) {
    if (!doc.key) {
      continue;
    }

    let workResponse: Response;

    try {
      workResponse = await fetch(`https://openlibrary.org${doc.key}.json`, {
        cache: "no-store",
      });
    } catch {
      continue;
    }

    if (!workResponse.ok) {
      continue;
    }

    const workPayload = (await workResponse.json()) as OpenLibraryWork;
    const description = extractOpenLibraryDescription(workPayload.description);

    if (!description) {
      continue;
    }

    return {
      title: normalizeSpaces(
        [doc.title ?? workPayload.title ?? "", doc.subtitle ?? ""]
          .filter(Boolean)
          .join(": ")
      ),
      description: shortenDescription(description),
      authors: doc.author_name ?? [],
      categories: workPayload.subjects ?? [],
      publishedDate: workPayload.first_publish_date ?? null,
      source: "Open Library",
    };
  }

  return null;
}

async function findOpenLibraryMatch(title: string) {
  const candidates = buildTitleCandidates(title);
  let openLibraryFetchFailed = false;
  let fallbackMatch: {
    title: string;
    description: string;
    authors: string[];
    categories: string[];
    publishedDate: string | null;
    source: string;
  } | null = null;

  for (const candidate of candidates) {
    try {
      const match = await searchOpenLibrary(candidate);

      if (match) {
        fallbackMatch = match;
        return {
          match,
          openLibraryFetchFailed,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.message === "OPEN_LIBRARY_FETCH_FAILED") {
        openLibraryFetchFailed = true;
        continue;
      }

      throw error;
    }
  }

  return {
    match: fallbackMatch,
    openLibraryFetchFailed,
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

    if (!title) {
      return NextResponse.json(
        { error: "Informe o titulo para buscar o resumo online." },
        { status: 400 }
      );
    }

    const googleResult = await findGoogleBooksMatch(title);

    if (googleResult.match) {
      return NextResponse.json(googleResult.match);
    }

    const openLibraryResult = await findOpenLibraryMatch(title);

    if (openLibraryResult.match) {
      return NextResponse.json({
        success: true,
        ...openLibraryResult.match,
      });
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

    if (
      googleResult.googleFetchFailed &&
      openLibraryResult.openLibraryFetchFailed
    ) {
      return NextResponse.json(
        {
          error:
            "As fontes online de catalogo estao indisponiveis no momento. Use o preenchimento automatico pelo PDF e tente novamente mais tarde.",
        },
        { status: 503 }
      );
    }

    if (
      googleResult.googleQuotaExceeded &&
      openLibraryResult.openLibraryFetchFailed
    ) {
      return NextResponse.json(
        {
          error:
            "A cota do Google Books acabou e a Open Library nao respondeu agora. Use o preenchimento automatico pelo PDF e tente novamente mais tarde.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Nenhum resumo foi encontrado nas fontes online e a geracao por IA nao ficou disponivel para este titulo no momento.",
      },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao buscar resumo online.",
      },
      { status: 500 }
    );
  }
}
