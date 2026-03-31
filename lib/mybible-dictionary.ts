import fs from "node:fs";
import path from "node:path";

type RefinedDictionaryEntry = {
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

type DictionarySearchItem = {
  id: string;
  word: string;
  normalizedWord: string;
  preview: string;
};

type DictionaryEntry = {
  id: string;
  word: string;
  normalizedWord: string;
  html: string;
  preview: string;
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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlFromEntry(entry: RefinedDictionaryEntry) {
  const referencesHtml = (entry.references || [])
    .map(
      (reference) =>
        `<span style="display:inline-block;margin:4px 6px 0 0;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);font-size:12px;">${escapeHtml(reference)}</span>`
    )
    .join("");

  const aliasesHtml = (entry.aliases || [])
    .map(
      (alias) =>
        `<span style="display:inline-block;margin:4px 6px 0 0;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);font-size:12px;">${escapeHtml(alias)}</span>`
    )
    .join("");

  const relatedHtml = (entry.relatedTerms || [])
    .map(
      (item) =>
        `<span style="display:inline-block;margin:4px 6px 0 0;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);font-size:12px;">${escapeHtml(item)}</span>`
    )
    .join("");

  return `
    <div>
      <p><strong>Termo principal:</strong> ${escapeHtml(entry.displayTerm)}</p>
      <p><strong>Original:</strong> ${escapeHtml(entry.term || entry.displayTerm)}</p>
      <p><strong>Idioma:</strong> ${escapeHtml(entry.language)}</p>
      <p><strong>Transliteração:</strong> ${escapeHtml(entry.transliteration || "Não informada")}</p>
      <p><strong>Strong:</strong> ${escapeHtml(entry.strong || "Não informado")}</p>
      <p><strong>Pronúncia:</strong> ${escapeHtml(entry.pronunciation || "Não informada")}</p>

      <p><strong>Definição breve:</strong> ${escapeHtml(entry.shortDefinition || "Não informada")}</p>

      <p style="margin-top:16px;"><strong>Explicação:</strong></p>
      <p>${escapeHtml(entry.fullDefinition || entry.shortDefinition || "Sem explicação disponível.").replace(/\n/g, "<br />")}</p>

      ${
        entry.references?.length
          ? `<p style="margin-top:16px;"><strong>Referências bíblicas:</strong></p><div>${referencesHtml}</div>`
          : ""
      }

      ${
        entry.aliases?.length
          ? `<p style="margin-top:16px;"><strong>Buscas equivalentes:</strong></p><div>${aliasesHtml}</div>`
          : ""
      }

      ${
        entry.relatedTerms?.length
          ? `<p style="margin-top:16px;"><strong>Termos relacionados:</strong></p><div>${relatedHtml}</div>`
          : ""
      }
    </div>
  `;
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
    throw new Error(`Arquivo refinado do Wycliffe não encontrado em: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as RefinedDictionaryEntry[];

  if (!Array.isArray(parsed)) {
    throw new Error("O arquivo refinado do Wycliffe não é um array JSON válido.");
  }

  cachedRawEntries = parsed;
  return cachedRawEntries;
}

async function loadDictionaryEntries(): Promise<DictionaryEntry[]> {
  if (cachedEntries) {
    return cachedEntries;
  }

  const rawEntries = await loadRawEntries();

  const entries: DictionaryEntry[] = rawEntries.map((entry) => ({
    id: cleanInline(entry.id),
    word: cleanInline(entry.displayTerm),
    normalizedWord: normalizeText(entry.displayTerm),
    html: buildHtmlFromEntry(entry),
    preview: cleanInline(entry.shortDefinition || entry.fullDefinition || ""),
  }));

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

  const rawEntries = await loadRawEntries();

  const scored = rawEntries
    .map((entry) => {
      const fields = [
        entry.displayTerm,
        entry.term,
        entry.normalizedTerm,
        entry.transliteration ?? "",
        entry.strong ?? "",
        ...(Array.isArray(entry.aliases) ? entry.aliases : []),
      ];

      let score = 0;

      for (const field of fields) {
        score = Math.max(score, scoreField(field, normalizedQuery));
      }

      if (score === 0) {
        return null;
      }

      return {
        id: cleanInline(entry.id),
        word: cleanInline(entry.displayTerm),
        normalizedWord: normalizeText(entry.displayTerm),
        preview: cleanInline(entry.shortDefinition || entry.fullDefinition || ""),
        score,
      };
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