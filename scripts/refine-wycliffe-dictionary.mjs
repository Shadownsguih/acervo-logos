import fs from "node:fs";
import path from "node:path";

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function cleanInline(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTextBlock(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
}

function toTitleCase(value) {
  const lower = cleanInline(value).toLowerCase();

  return lower.replace(
    /\b([a-zà-ÿ])/g,
    (match) => match.toUpperCase()
  );
}

function shortenText(value, max = 180) {
  const cleaned = cleanInline(value);

  if (cleaned.length <= max) {
    return cleaned;
  }

  return `${cleaned.slice(0, max - 3).trim()}...`;
}

function removeNoise(text) {
  return cleanInline(
    text
      .replace(/ver também.*$/i, "")
      .replace(/veja também.*$/i, "")
      .replace(/cf\..*$/i, "")
      .replace(/compare com.*$/i, "")
      .replace(/bibliografia.*$/i, "")
  );
}

function buildBetterShortDefinition(fullText) {
  const sentences = fullText
    .split(/[.!?]/)
    .map((s) => cleanInline(s))
    .filter(Boolean);

  if (!sentences.length) return "";

  return shortenText(sentences[0], 160);
}

function isValidEntry(entry) {
  if (!entry.displayTerm) return false;

  const term = normalizeText(entry.displayTerm);

  if (term.length < 2) return false;

  if (
    term.includes("prefacio") ||
    term.includes("introducao") ||
    term.includes("bibliografia")
  ) {
    return false;
  }

  if (!entry.fullDefinition || entry.fullDefinition.length < 30) {
    return false;
  }

  return true;
}

function dedupe(entries) {
  const map = new Map();

  for (const e of entries) {
    const key = normalizeText(e.displayTerm);

    if (!map.has(key)) {
      map.set(key, e);
      continue;
    }

    const existing = map.get(key);

    if (e.fullDefinition.length > existing.fullDefinition.length) {
      map.set(key, e);
    }
  }

  return Array.from(map.values());
}

function sortEntries(entries) {
  return [...entries].sort((a, b) =>
    a.displayTerm.localeCompare(b.displayTerm, "pt-BR", {
      sensitivity: "base",
    })
  );
}

function main() {
  const inputPath = path.join(
    process.cwd(),
    "data",
    "generated",
    "wycliffe-dictionary.json"
  );

  const outputPath = path.join(
    process.cwd(),
    "data",
    "generated",
    "wycliffe-dictionary-refined.json"
  );

  if (!fs.existsSync(inputPath)) {
    throw new Error("Arquivo de entrada não encontrado.");
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(raw);

  const refined = parsed
    .map((entry) => {
      const full = removeNoise(entry.fullDefinition);

      const short = buildBetterShortDefinition(full);

      return {
        id: cleanInline(entry.id),
        displayTerm: toTitleCase(entry.displayTerm),
        term: entry.term,
        normalizedTerm: normalizeText(entry.displayTerm),
        language: entry.language || "portugues",
        transliteration: cleanInline(entry.transliteration),
        strong: cleanInline(entry.strong),
        pronunciation: cleanInline(entry.pronunciation),
        shortDefinition: short,
        fullDefinition: full,
        references: [],
        aliases: [entry.displayTerm, normalizeText(entry.displayTerm)],
        relatedTerms: [],
      };
    })
    .filter(isValidEntry);

  const deduped = dedupe(refined);
  const sorted = sortEntries(deduped);

  fs.writeFileSync(outputPath, JSON.stringify(sorted, null, 2));

  console.log("✅ Wycliffe refinado com sucesso");
  console.log("📄 Arquivo:", outputPath);
  console.log("🔢 Total:", sorted.length);
}

main();