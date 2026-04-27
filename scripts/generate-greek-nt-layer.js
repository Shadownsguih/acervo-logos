/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const BIBLE_METADATA_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "bible-metadata.json"
);
const SBLGNT_XML_DIR = path.join(
  process.cwd(),
  "temp-bible-data",
  "greek-nt",
  "sblgnt-source",
  "data",
  "sblgnt",
  "xml"
);
const MORPHGNT_DIR = path.join(
  process.cwd(),
  "temp-bible-data",
  "greek-nt",
  "morphgnt-sblgnt"
);
const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "greek-nt-sblgnt.json"
);

const NT_BOOK_SOURCES = [
  { shortCode: "Mt", xmlFile: "Matt.xml", morphFile: "61-Mt-morphgnt.txt", sourceCode: "MAT" },
  { shortCode: "Mk", xmlFile: "Mark.xml", morphFile: "62-Mk-morphgnt.txt", sourceCode: "MRK" },
  { shortCode: "Lk", xmlFile: "Luke.xml", morphFile: "63-Lk-morphgnt.txt", sourceCode: "LUK" },
  { shortCode: "Jn", xmlFile: "John.xml", morphFile: "64-Jn-morphgnt.txt", sourceCode: "JHN" },
  { shortCode: "Ac", xmlFile: "Acts.xml", morphFile: "65-Ac-morphgnt.txt", sourceCode: "ACT" },
  { shortCode: "Ro", xmlFile: "Rom.xml", morphFile: "66-Ro-morphgnt.txt", sourceCode: "ROM" },
  { shortCode: "1Co", xmlFile: "1Cor.xml", morphFile: "67-1Co-morphgnt.txt", sourceCode: "1CO" },
  { shortCode: "2Co", xmlFile: "2Cor.xml", morphFile: "68-2Co-morphgnt.txt", sourceCode: "2CO" },
  { shortCode: "Ga", xmlFile: "Gal.xml", morphFile: "69-Ga-morphgnt.txt", sourceCode: "GAL" },
  { shortCode: "Eph", xmlFile: "Eph.xml", morphFile: "70-Eph-morphgnt.txt", sourceCode: "EPH" },
  { shortCode: "Php", xmlFile: "Phil.xml", morphFile: "71-Php-morphgnt.txt", sourceCode: "PHP" },
  { shortCode: "Col", xmlFile: "Col.xml", morphFile: "72-Col-morphgnt.txt", sourceCode: "COL" },
  { shortCode: "1Th", xmlFile: "1Thess.xml", morphFile: "73-1Th-morphgnt.txt", sourceCode: "1TH" },
  { shortCode: "2Th", xmlFile: "2Thess.xml", morphFile: "74-2Th-morphgnt.txt", sourceCode: "2TH" },
  { shortCode: "1Ti", xmlFile: "1Tim.xml", morphFile: "75-1Ti-morphgnt.txt", sourceCode: "1TI" },
  { shortCode: "2Ti", xmlFile: "2Tim.xml", morphFile: "76-2Ti-morphgnt.txt", sourceCode: "2TI" },
  { shortCode: "Tit", xmlFile: "Titus.xml", morphFile: "77-Tit-morphgnt.txt", sourceCode: "TIT" },
  { shortCode: "Phm", xmlFile: "Phlm.xml", morphFile: "78-Phm-morphgnt.txt", sourceCode: "PHM" },
  { shortCode: "Heb", xmlFile: "Heb.xml", morphFile: "79-Heb-morphgnt.txt", sourceCode: "HEB" },
  { shortCode: "Jas", xmlFile: "Jas.xml", morphFile: "80-Jas-morphgnt.txt", sourceCode: "JAS" },
  { shortCode: "1Pe", xmlFile: "1Pet.xml", morphFile: "81-1Pe-morphgnt.txt", sourceCode: "1PE" },
  { shortCode: "2Pe", xmlFile: "2Pet.xml", morphFile: "82-2Pe-morphgnt.txt", sourceCode: "2PE" },
  { shortCode: "1Jn", xmlFile: "1John.xml", morphFile: "83-1Jn-morphgnt.txt", sourceCode: "1JN" },
  { shortCode: "2Jn", xmlFile: "2John.xml", morphFile: "84-2Jn-morphgnt.txt", sourceCode: "2JN" },
  { shortCode: "3Jn", xmlFile: "3John.xml", morphFile: "85-3Jn-morphgnt.txt", sourceCode: "3JN" },
  { shortCode: "Jud", xmlFile: "Jude.xml", morphFile: "86-Jud-morphgnt.txt", sourceCode: "JUD" },
  { shortCode: "Re", xmlFile: "Rev.xml", morphFile: "87-Re-morphgnt.txt", sourceCode: "REV" },
];

const GREEK_TRANSLITERATION_MAP = {
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "e",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "ph",
  χ: "ch",
  ψ: "ps",
  ω: "o",
};

function readUtf8File(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Arquivo nao encontrado: ${filePath}`);
    process.exit(1);
  }

  return fs.readFileSync(filePath, "utf8");
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function buildNtBookMetadata() {
  const metadata = JSON.parse(readUtf8File(BIBLE_METADATA_PATH));
  const books = metadata?.booksByVersion?.NVI;

  if (!Array.isArray(books) || books.length < 66) {
    console.error("Metadados biblicos invalidos para montar os livros do NT.");
    process.exit(1);
  }

  return books.slice(39).map((book, index) => ({
    number: 40 + index,
    id: book.id,
    label: book.label,
    chapters: book.chapters,
    testament: "NT",
    code: NT_BOOK_SOURCES[index].sourceCode,
    shortCode: NT_BOOK_SOURCES[index].shortCode,
    xmlFile: NT_BOOK_SOURCES[index].xmlFile,
    morphFile: NT_BOOK_SOURCES[index].morphFile,
  }));
}

function transliterateGreekText(value) {
  const normalized = value.normalize("NFD");
  let result = "";

  for (const char of normalized) {
    if (/\p{M}/u.test(char)) {
      continue;
    }

    const lower = char.toLowerCase();
    const mapped = GREEK_TRANSLITERATION_MAP[lower];

    if (mapped) {
      if (char === char.toUpperCase() && char !== char.toLowerCase()) {
        result += mapped.charAt(0).toUpperCase() + mapped.slice(1);
      } else {
        result += mapped;
      }
      continue;
    }

    result += char;
  }

  return result
    .replace(/\s+([,.;·])/g, "$1")
    .replace(/\s+([!?])/g, "$1")
    .replace(/([(\[])\s+/g, "$1")
    .replace(/\s+([)\]])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSblXmlBook(xmlContent) {
  const verses = new Map();
  const paragraphPattern = /<p>([\s\S]*?)<\/p>/g;
  let paragraphMatch = paragraphPattern.exec(xmlContent);

  while (paragraphMatch) {
    const content = paragraphMatch[1];
    const tokenPattern =
      /<verse-number id="[^"]+? (\d+):(\d+)">[^<]*<\/verse-number>|<prefix>([\s\S]*?)<\/prefix>|<w>([\s\S]*?)<\/w>|<suffix>([\s\S]*?)<\/suffix>/g;

    let tokenMatch = tokenPattern.exec(content);
    let currentKey = null;

    while (tokenMatch) {
      if (tokenMatch[1] && tokenMatch[2]) {
        currentKey = `${Number(tokenMatch[1])}:${Number(tokenMatch[2])}`;

        if (!verses.has(currentKey)) {
          verses.set(currentKey, []);
        }
      } else if (currentKey) {
        const parts = verses.get(currentKey);

        if (typeof tokenMatch[3] === "string") {
          parts.push(tokenMatch[3]);
        } else if (typeof tokenMatch[4] === "string") {
          const lastPart = parts[parts.length - 1] ?? "";
          const needsLeadingSpace =
            parts.length > 0 &&
            !/[\s([{⸂⸀⸁]$/u.test(lastPart) &&
            !/[⸂⸀⸁]$/u.test(lastPart);

          parts.push(`${needsLeadingSpace ? " " : ""}${tokenMatch[4]}`);
        } else if (typeof tokenMatch[5] === "string") {
          parts.push(tokenMatch[5]);
        }
      }

      tokenMatch = tokenPattern.exec(content);
    }

    paragraphMatch = paragraphPattern.exec(xmlContent);
  }

  return new Map(
    Array.from(verses.entries()).map(([key, parts]) => [
      key,
      normalizeWhitespace(parts.join(""))
        .replace(/\s+([,.;·])/g, "$1")
        .replace(/\s+([!?])/g, "$1")
        .replace(/([\[(])\s+/g, "$1")
        .replace(/\s+([\])}])/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    ])
  );
}

function parseMorphBook(book, bookNumber) {
  const content = readUtf8File(path.join(MORPHGNT_DIR, book.morphFile));
  const lines = content.split(/\r?\n/).filter(Boolean);
  const verses = new Map();

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);

    if (parts.length < 7) {
      continue;
    }

    const [bcv, pos, parsing, text, word, normalizedWord, ...lemmaParts] = parts;
    const chapter = Number(bcv.slice(2, 4));
    const verse = Number(bcv.slice(4, 6));
    const verseKey = `${chapter}:${verse}`;
    const lemma = lemmaParts.join(" ");
    const items = verses.get(verseKey) ?? [];

    items.push({
      position: items.length + 1,
      bookNumber,
      chapter,
      verse,
      verseCode: bcv,
      partOfSpeech: pos,
      parsing,
      text,
      word,
      normalizedWord,
      lemma,
      transliteration: transliterateGreekText(normalizedWord),
      lemmaTransliteration: transliterateGreekText(lemma),
    });

    verses.set(verseKey, items);
  }

  return verses;
}

function buildFallbackWordsFromGreekText(bookNumber, chapter, verse, greek) {
  return greek
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token, index) => {
      const normalizedWord = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

      return {
        position: index + 1,
        bookNumber,
        chapter,
        verse,
        verseCode: null,
        partOfSpeech: "",
        parsing: "",
        text: token,
        word: normalizedWord,
        normalizedWord,
        lemma: normalizedWord,
        transliteration: transliterateGreekText(normalizedWord),
        lemmaTransliteration: transliterateGreekText(normalizedWord),
      };
    });
}

function renderGreekVerseFromMorphWords(words) {
  return normalizeWhitespace(
    words
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+([,.;·])/g, "$1")
      .replace(/\s+([!?])/g, "$1")
  );
}

function main() {
  const books = buildNtBookMetadata();
  const mergedVerses = [];

  for (const book of books) {
    const xmlPath = path.join(SBLGNT_XML_DIR, book.xmlFile);
    const xmlContent = readUtf8File(xmlPath);
    const sblVerses = parseSblXmlBook(xmlContent);
    const morphVerses = parseMorphBook(book, book.number);
    const keys = new Set([...sblVerses.keys(), ...morphVerses.keys()]);
    const sortedKeys = Array.from(keys).sort((left, right) => {
      const [leftChapter, leftVerse] = left.split(":").map(Number);
      const [rightChapter, rightVerse] = right.split(":").map(Number);

      if (leftChapter !== rightChapter) {
        return leftChapter - rightChapter;
      }

      return leftVerse - rightVerse;
    });

    for (const key of sortedKeys) {
      const [chapter, verse] = key.split(":").map(Number);
      const greek = sblVerses.get(key);
      const words = morphVerses.get(key);

      if (!greek) {
        console.error(`Versiculo inconsistente em ${book.id} ${chapter}:${verse}.`);
        process.exit(1);
      }

      const verseWords =
        (words?.length ?? 0) > 0
          ? words
          : buildFallbackWordsFromGreekText(book.number, chapter, verse, greek);
      const greekText =
        (words?.length ?? 0) > 0 ? renderGreekVerseFromMorphWords(words) : greek;

      mergedVerses.push({
        bookNumber: book.number,
        bookId: book.id,
        bookCode: book.code,
        book: book.label,
        chapter,
        verse,
        reference: `${book.label} ${chapter}:${verse}`,
        greek: greekText,
        transliteration: transliterateGreekText(greekText),
        words: verseWords,
        source: {
          greek: "SBLGNT",
          morphology: words?.length
            ? "MorphGNT SBLGNT"
            : "Unavailable for this verse in the downloaded MorphGNT edition",
          transliteration: "Generated from Greek text by Acervo Logos",
        },
      });
    }
  }

  const payload = {
    license: {
      greek: "CC BY 4.0 (Society of Biblical Literature / Logos Bible Software)",
      morphology: "CC BY-SA 3.0 (MorphGNT SBLGNT by J. K. Tauber et al.)",
      transliteration: "Generated derivative by Acervo Logos from the Greek text layer",
    },
    generatedAt: new Date().toISOString(),
    books,
    verses: mergedVerses,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf8");

  console.log(`Arquivo gerado em: ${OUTPUT_PATH}`);
  console.log(`Livros: ${books.length}`);
  console.log(`Versiculos: ${mergedVerses.length}`);
}

main();
