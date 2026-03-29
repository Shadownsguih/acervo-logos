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

function scoreFieldMatch(fieldValue: string, normalizedQuery: string) {
  if (!fieldValue) return 0;

  const normalizedField = normalizeDictionaryText(fieldValue);

  if (!normalizedField) return 0;
  if (normalizedField === normalizedQuery) return 100;
  if (normalizedField.startsWith(normalizedQuery)) return 60;
  if (normalizedField.includes(normalizedQuery)) return 30;

  return 0;
}

function scoreEntry(entry: BibleDictionaryEntry, normalizedQuery: string) {
  let score = 0;

  score += scoreFieldMatch(entry.displayTerm, normalizedQuery) * 10;
  score += scoreFieldMatch(entry.term, normalizedQuery) * 7;
  score += scoreFieldMatch(entry.normalizedTerm, normalizedQuery) * 8;
  score += scoreFieldMatch(entry.transliteration ?? "", normalizedQuery) * 6;
  score += scoreFieldMatch(entry.strong ?? "", normalizedQuery) * 9;
  score += scoreFieldMatch(entry.shortDefinition, normalizedQuery) * 3;

  for (const alias of entry.aliases) {
    score += scoreFieldMatch(alias, normalizedQuery) * 5;
  }

  for (const reference of entry.references) {
    score += scoreFieldMatch(reference, normalizedQuery);
  }

  for (const relatedTerm of entry.relatedTerms ?? []) {
    score += scoreFieldMatch(relatedTerm, normalizedQuery);
  }

  const normalizedFullDefinition = normalizeDictionaryText(entry.fullDefinition);
  if (normalizedFullDefinition.includes(normalizedQuery)) {
    score += 10;
  }

  // bônus por idioma para favorecer experiência em português
  if (entry.language === "portugues") {
    score += 20;
  } else if (entry.language === "grego") {
    score += 8;
  } else if (entry.language === "hebraico") {
    score += 6;
  }

  return score;
}

export function searchBibleDictionaryEntries(query: string) {
  const normalizedQuery = normalizeDictionaryText(query);

  if (!normalizedQuery) {
    return [...BIBLE_DICTIONARY_ENTRIES].sort((a, b) => {
      const languageDiff =
        getLanguagePriority(a.language) - getLanguagePriority(b.language);

      if (languageDiff !== 0) {
        return languageDiff;
      }

      return a.displayTerm.localeCompare(b.displayTerm, "pt-BR", {
        sensitivity: "base",
      });
    });
  }

  return BIBLE_DICTIONARY_ENTRIES.map((entry) => ({
    entry,
    score: scoreEntry(entry, normalizedQuery),
  }))
    .filter((item) => item.score > 0)
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

      return a.entry.displayTerm.localeCompare(
        b.entry.displayTerm,
        "pt-BR",
        { sensitivity: "base" }
      );
    })
    .map((item) => item.entry);
}