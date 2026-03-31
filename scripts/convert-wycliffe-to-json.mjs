import fs from "node:fs";
import path from "node:path";
import initSqlJs from "sql.js";

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

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function shortenText(value, max = 220) {
  const cleaned = cleanInline(value);

  if (cleaned.length <= max) {
    return cleaned;
  }

  return `${cleaned.slice(0, max - 3).trim()}...`;
}

function makeId(word) {
  return normalizeText(word).replace(/[^a-z0-9]+/g, "-");
}

function isSkippableEntry(word, text) {
  const normalizedWord = normalizeText(word);
  const normalizedText = normalizeText(text);

  const blockedWords = new Set([
    "1. sobre o livro",
    "2. prefacio",
    "prefacio",
    "abreviaturas",
    "bibliografia",
    "colaboradores",
    "indice",
    "introducao",
    "introdução",
  ]);

  if (blockedWords.has(normalizedWord)) {
    return true;
  }

  if (
    normalizedText.includes("modulo criado por") ||
    normalizedText.includes("módulo criado por") ||
    normalizedText.includes("venda proibida") ||
    normalizedText.includes("keryx digital") ||
    normalizedText.includes("prefacio") ||
    normalizedText.includes("prefácio")
  ) {
    return true;
  }

  return false;
}

function detectLanguage(text) {
  const normalized = normalizeText(text);

  if (
    normalized.includes("hebraico") ||
    normalized.includes("aramaico")
  ) {
    return "hebraico";
  }

  if (normalized.includes("grego")) {
    return "grego";
  }

  return "portugues";
}

function extractOriginalTerm(text) {
  const patterns = [
    /hebraico[:\s]+([^\n.;]+)/i,
    /aramaico[:\s]+([^\n.;]+)/i,
    /grego[:\s]+([^\n.;]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanInline(match[1]);
    }
  }

  return "";
}

function extractTransliteration(text) {
  const patterns = [
    /transliter[aã]?[cç][aã]o[:\s]+([^\n.;]+)/i,
    /translit\.[\s:]+([^\n.;]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return cleanInline(match[1]);
    }
  }

  return "";
}

function extractStrong(text) {
  const match = text.match(/\b([HG]\d{1,5})\b/i);
  return match ? match[1].toUpperCase() : "";
}

function buildShortDefinition(text) {
  const paragraphs = text
    .split(/\n+/)
    .map((item) => cleanInline(item))
    .filter(Boolean);

  const candidate = paragraphs.find((item) => item.length > 40) || paragraphs[0] || "";

  return shortenText(candidate, 180);
}

function buildFullDefinition(text) {
  return cleanInline(text);
}

function buildAliases(displayTerm, originalTerm, transliteration, strong) {
  const raw = [
    displayTerm,
    normalizeText(displayTerm),
    originalTerm,
    transliteration,
    strong,
  ]
    .map((item) => cleanInline(item))
    .filter(Boolean);

  const seen = new Set();
  const aliases = [];

  for (const item of raw) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    aliases.push(item);
  }

  return aliases;
}

async function main() {
  const dbPath = path.join(
    process.cwd(),
    "data",
    "mybible",
    "wycliffe.dct.mybible"
  );

  const wasmPath = path.join(
    process.cwd(),
    "node_modules",
    "sql.js",
    "dist",
    "sql-wasm.wasm"
  );

  const outputDir = path.join(process.cwd(), "data", "generated");
  const outputPath = path.join(outputDir, "wycliffe-dictionary.json");

  if (!fs.existsSync(dbPath)) {
    throw new Error(`Arquivo não encontrado: ${dbPath}`);
  }

  if (!fs.existsSync(wasmPath)) {
    throw new Error(`sql-wasm.wasm não encontrado: ${wasmPath}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const wasmBinary = fs.readFileSync(wasmPath);
  const SQL = await initSqlJs({ wasmBinary });
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(new Uint8Array(fileBuffer));

  try {
    const result = db.exec(
      "SELECT relativeorder, word, data FROM Dictionary ORDER BY relativeorder ASC"
    );

    if (!result.length) {
      throw new Error("Nenhum dado encontrado na tabela Dictionary.");
    }

    const rows = result[0];
    const orderIndex = rows.columns.indexOf("relativeorder");
    const wordIndex = rows.columns.indexOf("word");
    const dataIndex = rows.columns.indexOf("data");

    const converted = rows.values
      .map((row) => {
        const relativeOrder = String(row[orderIndex] ?? "").trim();
        const word = String(row[wordIndex] ?? "").trim();
        const html = String(row[dataIndex] ?? "").trim();
        const text = stripHtml(html);

        if (!word || !text) {
          return null;
        }

        if (isSkippableEntry(word, text)) {
          return null;
        }

        const displayTerm = cleanInline(word);
        const originalTerm = extractOriginalTerm(text);
        const transliteration = extractTransliteration(text);
        const strong = extractStrong(text);
        const language = detectLanguage(text);
        const shortDefinition = buildShortDefinition(text);
        const fullDefinition = buildFullDefinition(text);
        const aliases = buildAliases(
          displayTerm,
          originalTerm,
          transliteration,
          strong
        );

        return {
          id: makeId(`${displayTerm}-${relativeOrder}`),
          displayTerm,
          term: originalTerm || displayTerm,
          normalizedTerm: normalizeText(displayTerm),
          language,
          transliteration,
          strong,
          pronunciation: transliteration || "",
          shortDefinition,
          fullDefinition,
          references: [],
          aliases,
          relatedTerms: [],
        };
      })
      .filter(Boolean);

    fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2), "utf-8");

    console.log("✅ Conversão do Wycliffe concluída.");
    console.log(`📄 Arquivo gerado: ${outputPath}`);
    console.log(`🔢 Total de verbetes: ${converted.length}`);
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("❌ Erro na conversão do Wycliffe:");
  console.error(error);
  process.exit(1);
});