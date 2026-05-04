import curatedDailyBibleVerseLibrary from "@/data/daily-bible-verse-library.json";
import { createAdminClient } from "@/lib/supabase-admin";

export type DailyBibleVerse = {
  id: string;
  date_key: string;
  bible_verse_id: string | null;
  version: string;
  theme: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  insight: string;
  created_at: string;
};

type DailyBibleVerseLibraryEntry = {
  id?: string;
  version: string;
  theme?: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  insight: string;
  display_order?: number | null;
  is_active?: boolean;
  created_at?: string | null;
};

function getBrazilDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDailyVerseIndex(dateKey: string, total: number) {
  const numericKey = Number(dateKey.replaceAll("-", ""));
  return numericKey % total;
}

function getFallbackLibrary() {
  return curatedDailyBibleVerseLibrary as DailyBibleVerseLibraryEntry[];
}

async function getDailyVerseLibrary() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("daily_bible_verse_library")
    .select(
      "id, version, theme, book, abbrev, chapter, verse, reference, text, insight, display_order, is_active, created_at"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("reference", { ascending: true });

  if (error) {
    console.error(
      "Erro ao buscar a biblioteca curada do versiculo diario:",
      error.message
    );
    return getFallbackLibrary();
  }

  if (!data || data.length === 0) {
    return getFallbackLibrary();
  }

  return data as DailyBibleVerseLibraryEntry[];
}

export async function getOrCreateDailyBibleVerse() {
  const dateKey = getBrazilDateKey();
  const library = await getDailyVerseLibrary();

  if (library.length === 0) {
    throw new Error(
      "Nenhum versiculo curado foi encontrado para o versiculo diario."
    );
  }

  const selectedVerse = library[getDailyVerseIndex(dateKey, library.length)];

  return {
    id: selectedVerse.id ?? `daily-${dateKey}`,
    date_key: dateKey,
    bible_verse_id: null,
    version: selectedVerse.version,
    theme: selectedVerse.theme ?? "geral",
    book: selectedVerse.book,
    abbrev: selectedVerse.abbrev,
    chapter: selectedVerse.chapter,
    verse: selectedVerse.verse,
    reference: selectedVerse.reference,
    text: selectedVerse.text,
    insight: selectedVerse.insight,
    created_at: selectedVerse.created_at ?? `${dateKey}T00:00:00-03:00`,
  } satisfies DailyBibleVerse;
}
