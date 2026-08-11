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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

async function searchGoogleBooks(query: string) {
  const params = new URLSearchParams({
    q: `intitle:${query}`,
    langRestrict: "pt",
    printType: "books",
    maxResults: "5",
  });

  const response = await fetch(
    `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

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
    language: "por",
    limit: "5",
  });

  const searchResponse = await fetch(
    `https://openlibrary.org/search.json?${searchParams.toString()}`,
    {
      cache: "no-store",
    }
  );

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

    const workResponse = await fetch(`https://openlibrary.org${doc.key}.json`, {
      cache: "no-store",
    });

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

    const body = (await request.json()) as { title?: string };
    const title = String(body.title ?? "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Informe o titulo para buscar o resumo online." },
        { status: 400 }
      );
    }

    try {
      const items = await searchGoogleBooks(title);
      const rankedItems = items
        .map((item) => ({
          item,
          score: buildSearchScore(title, item),
        }))
        .sort((left, right) => right.score - left.score);

      const bestMatch = rankedItems.find(
        ({ item }) =>
          normalizeSpaces(String(item.volumeInfo?.description ?? "")).length > 0
      )?.item;

      if (bestMatch?.volumeInfo?.description) {
        return NextResponse.json({
          success: true,
          title: buildDisplayTitle(bestMatch),
          description: shortenDescription(bestMatch.volumeInfo.description),
          authors: bestMatch.volumeInfo.authors ?? [],
          categories: bestMatch.volumeInfo.categories ?? [],
          publishedDate: bestMatch.volumeInfo.publishedDate ?? null,
          source: "Google Books",
        });
      }
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "GOOGLE_BOOKS_QUOTA_EXCEEDED"
      ) {
        throw error;
      }
    }

    const openLibraryMatch = await searchOpenLibrary(title);

    if (openLibraryMatch) {
      return NextResponse.json({
        success: true,
        ...openLibraryMatch,
      });
    }

    return NextResponse.json(
      {
        error:
          "Nenhum resumo confiavel foi encontrado para este titulo nas fontes online disponiveis.",
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
