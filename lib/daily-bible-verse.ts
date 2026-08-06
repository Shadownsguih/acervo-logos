import curatedDailyBibleVerseLibrary from "@/data/daily-bible-verse-library.json";
import { createAdminClient } from "@/lib/supabase-admin";

export type DailyBibleVerse = {
  id: string;
  date_key: string;
  bible_verse_id: string | null;
  source?: string | null;
  version: string;
  theme: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  insight: string;
  prayer?: string | null;
  closing_thought?: string | null;
  created_at: string;
};

type DailyBibleVerseLibraryEntry = {
  id?: string;
  source?: string | null;
  version: string;
  theme?: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  insight: string;
  prayer?: string | null;
  closing_thought?: string | null;
  display_order?: number | null;
  is_active?: boolean;
  created_at?: string | null;
};

type DailyBibleVerseRefreshState = {
  date_key: string;
  refresh_count: number | null;
};

function getBrazilDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeSourceName(source?: string | null) {
  return String(source ?? "").trim().toLowerCase();
}

function getDailySourceRotation(dateKey: string) {
  const numericKey = Number(dateKey.replaceAll("-", ""));
  return numericKey % 2 === 0 ? "pao diario" : "spurgeon";
}

function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
}

function formatDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function subtractDays(dateKey: string, days: number) {
  const date = getDateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() - days);
  return formatDateKey(date);
}

function getSeededSourceIndex(
  dateKey: string,
  total: number,
  sourceName: string
) {
  const numericKey = Number(dateKey.replaceAll("-", ""));
  const sourceSeed = Array.from(sourceName).reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0
  );

  return (numericKey + sourceSeed) % total;
}

function getRecentSourceIndexes(
  dateKey: string,
  total: number,
  sourceName: string,
  daysToInspect: number
) {
  const recentIndexes = new Set<number>();

  for (let offset = 1; offset <= daysToInspect; offset += 1) {
    const previousDateKey = subtractDays(dateKey, offset);

    if (getDailySourceRotation(previousDateKey) !== sourceName) {
      continue;
    }

    recentIndexes.add(
      getSeededSourceIndex(previousDateKey, total, sourceName)
    );
  }

  return recentIndexes;
}

function getSmartDailySelectionIndex(
  dateKey: string,
  total: number,
  sourceName: string,
  refreshCount = 0
) {
  if (total <= 1) {
    return 0;
  }

  const recentIndexes = getRecentSourceIndexes(dateKey, total, sourceName, 14);
  const baseIndex = getSeededSourceIndex(dateKey, total, sourceName);
  const availableIndexes: number[] = [];

  for (let step = 0; step < total; step += 1) {
    const candidateIndex = (baseIndex + step) % total;

    if (recentIndexes.size < total && recentIndexes.has(candidateIndex)) {
      continue;
    }

    availableIndexes.push(candidateIndex);
  }

  if (availableIndexes.length === 0) {
    return baseIndex;
  }

  return availableIndexes[Math.max(0, refreshCount) % availableIndexes.length];
}

function getLibraryForSource(
  library: DailyBibleVerseLibraryEntry[],
  sourceName: string
) {
  const normalizedSource = normalizeSourceName(sourceName);

  return library.filter((entry) => {
    const entrySource = normalizeSourceName(entry.source);
    return entrySource === normalizedSource;
  });
}

function getFallbackLibrary() {
  return curatedDailyBibleVerseLibrary as DailyBibleVerseLibraryEntry[];
}

async function getDailyDevotionalRefreshCount(dateKey: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("daily_bible_verse_refresh_state")
    .select("date_key, refresh_count")
    .eq("date_key", dateKey)
    .maybeSingle();

  if (error) {
    console.error(
      "Erro ao buscar o estado de refresh do devocional diario:",
      error.message
    );
    return 0;
  }

  return Math.max(
    0,
    Number((data as DailyBibleVerseRefreshState | null)?.refresh_count ?? 0)
  );
}

async function getDailyVerseLibrary() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("daily_bible_verse_library")
    .select(
      "id, source, version, theme, book, abbrev, chapter, verse, reference, text, insight, prayer, closing_thought, display_order, is_active, created_at"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true, nullsFirst: false })
    .order("reference", { ascending: true });

  if (error) {
    console.error(
      "Erro ao buscar a biblioteca curada do devocional diario:",
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
  const [library, refreshCount] = await Promise.all([
    getDailyVerseLibrary(),
    getDailyDevotionalRefreshCount(dateKey),
  ]);

  if (library.length === 0) {
    throw new Error(
      "Nenhum devocional foi encontrado para o devocional diario."
    );
  }

  const sourceRotation = getDailySourceRotation(dateKey);
  const rotatedLibrary = getLibraryForSource(library, sourceRotation);
  const activeLibrary = rotatedLibrary.length > 0 ? rotatedLibrary : library;
  const selectionSource =
    rotatedLibrary.length > 0 ? sourceRotation : "biblioteca-geral";
  const selectedVerse =
    activeLibrary[
      getSmartDailySelectionIndex(
        dateKey,
        activeLibrary.length,
        selectionSource,
        refreshCount
      )
    ];

  return {
    id: selectedVerse.id ?? `daily-${dateKey}`,
    date_key: dateKey,
    bible_verse_id: null,
    source: selectedVerse.source ?? null,
    version: selectedVerse.version,
    theme: selectedVerse.theme ?? "geral",
    book: selectedVerse.book,
    abbrev: selectedVerse.abbrev,
    chapter: selectedVerse.chapter,
    verse: selectedVerse.verse,
    reference: selectedVerse.reference,
    text: selectedVerse.text,
    insight: selectedVerse.insight,
    prayer: selectedVerse.prayer ?? null,
    closing_thought: selectedVerse.closing_thought ?? null,
    created_at: selectedVerse.created_at ?? `${dateKey}T00:00:00-03:00`,
  } satisfies DailyBibleVerse;
}
