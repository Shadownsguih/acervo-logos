import fs from "node:fs";
import path from "node:path";

export type RefinedDictionaryEntry = {
  id: string;
  displayTerm: string;
  term?: string;
  normalizedTerm?: string;
  language?: string;
  transliteration?: string;
  strong?: string;
  pronunciation?: string;
  shortDefinition?: string;
  fullDefinition?: string;
  references?: string[];
  aliases?: string[];
  relatedTerms?: string[];
  original?: string;
  etymologyMeaning?: string;
};

type DictionarySearchItem = {
  id: string;
  word: string;
  normalizedWord: string;
  preview: string;
};

export type DictionaryEntry = {
  id: string;
  word: string;
  normalizedWord: string;
  preview: string;
  displayTerm: string;
  term: string;
  language: string;
  transliteration: string;
  strong: string;
  pronunciation: string;
  shortDefinition: string;
  fullDefinition: string;
  references: string[];
  aliases: string[];
  relatedTerms: string[];
  original: string;
  etymologyMeaning: string;
};

let cachedEntries: DictionaryEntry[] | null = null;
let cachedRawEntries: RefinedDictionaryEntry[] | null = null;

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanInline(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanInline(String(item || "")))
    .filter(Boolean);
}

function formatLanguage(language?: string) {
  const value = cleanInline(language || "");
  if (!value) return "";

  const normalized = normalizeText(value);

  if (normalized === "hebraico") return "Hebraico";
  if (normalized === "aramaico") return "Aramaico";
  if (normalized === "grego") return "Grego";
  if (normalized === "portugues") return "Português";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function loadRawEntries() {
  if (cachedRawEntries) {
    return cachedRawEntries;
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "generated",
    "wycliffe-dictionary-refined.json"
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo refinado do dicionário não encontrado em: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as RefinedDictionaryEntry[];

  if (!Array.isArray(parsed)) {
    throw new Error("O arquivo do dicionário refinado não é um array JSON válido.");
  }

  cachedRawEntries = parsed;
  return cachedRawEntries;
}

async function loadDictionaryEntries(): Promise<DictionaryEntry[]> {
  if (cachedEntries) {
    return cachedEntries;
  }

  const rawEntries = await loadRawEntries();

  const entries: DictionaryEntry[] = rawEntries.map((entry) => {
    const displayTerm = cleanInline(entry.displayTerm || entry.term || "Sem título");
    const shortDefinition = cleanInline(
      entry.shortDefinition || entry.fullDefinition || ""
    );

    return {
      id: cleanInline(entry.id),
      word: displayTerm,
      normalizedWord: normalizeText(displayTerm),
      preview: shortDefinition,
      displayTerm,
      term: cleanInline(entry.term || entry.displayTerm || ""),
      language: formatLanguage(entry.language),
      transliteration: cleanInline(entry.transliteration || ""),
      strong: cleanInline(entry.strong || ""),
      pronunciation: cleanInline(entry.pronunciation || ""),
      shortDefinition,
      fullDefinition: String(
        entry.fullDefinition || entry.shortDefinition || "Sem explicação disponível."
      ).trim(),
      references: normalizeStringArray(entry.references),
      aliases: normalizeStringArray(entry.aliases),
      relatedTerms: normalizeStringArray(entry.relatedTerms),
      original: cleanInline(entry.original || ""),
      etymologyMeaning: cleanInline(entry.etymologyMeaning || ""),
    };
  });

  cachedEntries = entries;
  return entries;
}

function scoreField(field: string, query: string) {
  if (!field) return 0;

  const normalizedField = normalizeText(field);

  if (!normalizedField) return 0;
  if (normalizedField === query) return 1000;

  const words = normalizedField.split(/\s+/).filter(Boolean);

  if (words.includes(query)) return 700;
  if (normalizedField.startsWith(query)) return 500;
  if (words.some((word) => word.startsWith(query))) return 300;
  if (normalizedField.includes(query)) return 120;

  return 0;
}

export async function searchMyBibleDictionary(query: string, limit = 20) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return [];
  }

  const entries = await loadDictionaryEntries();

  const scored = entries
    .map((entry) => {
      const fields = [
        entry.displayTerm,
        entry.term,
        entry.word,
        entry.normalizedWord,
        entry.transliteration,
        entry.strong,
        entry.original,
        entry.etymologyMeaning,
        ...entry.aliases,
        ...entry.relatedTerms,
      ];

      let score = 0;

      for (const field of fields) {
        score = Math.max(score, scoreField(field, normalizedQuery));
      }

      if (score === 0) {
        return null;
      }

      const result: DictionarySearchItem & { score: number } = {
        id: entry.id,
        word: entry.word,
        normalizedWord: entry.normalizedWord,
        preview: entry.preview,
        score,
      };

      return result;
    })
    .filter(
      (
        item
      ): item is DictionarySearchItem & {
        score: number;
      } => item !== null
    )
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.word.localeCompare(b.word, "pt-BR", {
        sensitivity: "base",
      });
    })
    .slice(0, limit)
    .map(({ score: _score, ...item }) => item);

  return scored;
}

export async function getMyBibleDictionaryEntry(id: string) {
  const normalizedId = String(id).trim();

  if (!normalizedId) {
    return null;
  }

  const entries = await loadDictionaryEntries();
  return entries.find((entry) => entry.id === normalizedId) ?? null;
}

export async function getMyBibleDictionaryStats() {
  const entries = await loadDictionaryEntries();

  return {
    total: entries.length,
  };
}