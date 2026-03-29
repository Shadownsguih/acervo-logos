import dictionaryEntries from "@/data/bible-dictionary.json";

export type BibleDictionaryEntry = {
  id: string;
  displayTerm: string;
  term: string;
  normalizedTerm: string;
  language: "portugues" | "grego" | "hebraico";
  transliteration?: string;
  strong?: string;
  pronunciation?: string;
  shortDefinition: string;
  fullDefinition: string;
  references: string[];
  aliases: string[];
  relatedTerms?: string[];
};

export const BIBLE_DICTIONARY_ENTRIES =
  dictionaryEntries as BibleDictionaryEntry[];

export function normalizeDictionaryText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isBibleDictionaryCategory(category: {
  name: string;
  slug: string | null;
  id: string;
}) {
  const normalizedName = normalizeDictionaryText(category.name);
  const normalizedSlug = normalizeDictionaryText(category.slug ?? "");
  const normalizedId = normalizeDictionaryText(category.id);

  const candidates = [normalizedName, normalizedSlug, normalizedId];

  return candidates.some((value) =>
    [
      "dicionarios biblicos",
      "dicionario biblico",
      "dicionarios-biblicos",
      "dicionario-biblico",
    ].includes(value)
  );
}

export function getBibleDictionaryEntryById(id: string) {
  return BIBLE_DICTIONARY_ENTRIES.find((entry) => entry.id === id) ?? null;
}

function getLanguagePriority(language: BibleDictionaryEntry["language"]) {
  if (language === "portugues") return 0;
  if (language === "grego") return 1;
  return 2;
}

function buildStrictSearchFields(entry: BibleDictionaryEntry) {
  return [
    entry.displayTerm,
    entry.term,
    entry.normalizedTerm,
    entry.transliteration ?? "",
    entry.strong ?? "",
    ...entry.aliases,
  ]
    .map((item) => normalizeDictionaryText(item))
    .filter(Boolean);
}

function scoreStrictField(field: string, query: string) {
  if (!field) return 0;

  if (field === query) return 1000;

  const words = field.split(/\s+/).filter(Boolean);

  if (words.includes(query)) return 700;

  if (field.startsWith(query)) return 500;

  if (words.some((word) => word.startsWith(query))) return 350;

  if (field.includes(query)) return 150;

  return 0;
}

export function searchBibleDictionaryEntries(query: string) {
  const normalizedQuery = normalizeDictionaryText(query);

  if (!normalizedQuery) {
    return [];
  }

  const scored = BIBLE_DICTIONARY_ENTRIES.map((entry) => {
    const fields = buildStrictSearchFields(entry);

    let score = 0;

    for (const field of fields) {
      score = Math.max(score, scoreStrictField(field, normalizedQuery));
    }

    if (score === 0) {
      return null;
    }

    score += entry.language === "portugues" ? 30 : entry.language === "grego" ? 15 : 10;

    return { entry, score };
  }).filter(
    (item): item is { entry: BibleDictionaryEntry; score: number } => item !== null
  );

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const languageDiff =
        getLanguagePriority(a.entry.language) -
        getLanguagePriority(b.entry.language);

      if (languageDiff !== 0) {
        return languageDiff;
      }

      return a.entry.displayTerm.localeCompare(b.entry.displayTerm, "pt-BR", {
        sensitivity: "base",
      });
    })
    .map((item) => item.entry);
}