/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const MIKLAL_XML_PATH = path.join(
  process.cwd(),
  "temp-bible-data",
  "miklal-wlc",
  "TransliteratedHebrew.xml"
);
const WLC_USFX_PATH = path.join(
  process.cwd(),
  "temp-bible-data",
  "hebwlc-usfx",
  "hebwlc_usfx.xml"
);
const BIBLE_METADATA_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "bible-metadata.json"
);
const OUTPUT_PATH = path.join(
  process.cwd(),
  "data",
  "generated",
  "hebrew-wlc-transliteration.json"
);

const OT_BOOK_CODES = [
  "GEN",
  "EXO",
  "LEV",
  "NUM",
  "DEU",
  "JOS",
  "JDG",
  "RUT",
  "1SA",
  "2SA",
  "1KI",
  "2KI",
  "1CH",
  "2CH",
  "EZR",
  "NEH",
  "EST",
  "JOB",
  "PSA",
  "PRO",
  "ECC",
  "SNG",
  "ISA",
  "JER",
  "LAM",
  "EZK",
  "DAN",
  "HOS",
  "JOL",
  "AMO",
  "OBA",
  "JON",
  "MIC",
  "NAM",
  "HAB",
  "ZEP",
  "HAG",
  "ZEC",
  "MAL",
];

const TRANSLITERATION_ENTITY_MAP = {
  aleph: "ʾ",
  beth: "b",
  gimel: "g",
  daleth: "d",
  he: "h",
  waw: "w",
  zayin: "z",
  heth: "ḥ",
  teth: "ṭ",
  yod: "y",
  kaph: "k",
  lamed: "l",
  mem: "m",
  nun: "n",
  samek: "s",
  ayin: "ʿ",
  pe: "p",
  tsade: "ṣ",
  qoph: "q",
  resh: "r",
  sinShinUnpointed: "š",
  taw: "t",
  sin: "ś",
  shin: "š",
  patah: "a",
  qamets: "ā",
  qametsHatuph: "o",
  segol: "e",
  hireq: "i",
  tsere: "ē",
  holem: "ō",
  qibbuts: "u",
  shewaVocal: "ə",
  shewaSilent: "",
  hatephPatah: "ă",
  haetphQamets: "ŏ",
  hatephSegol: "ĕ",
  sureq: "ū",
  patahFurtive: "a",
  alephQuiescent: "",
  wawMater: "w",
  yodMater: "y",
  heMater: "h",
  bethSpirantized: "v",
  gimelSpirantized: "ḡ",
  dalethSpirantized: "ḏ",
  kaphSpirantized: "ḵ",
  peSpirantized: "f",
  tawSpirantized: "ṯ",
  maqqeph: "-",
  space: " ",
  nbsp: " ",
  syllableBreak: "",
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

function transliterateWord(value) {
  return value.replace(/&([a-zA-Z]+);/g, (_, entityName) => {
    return TRANSLITERATION_ENTITY_MAP[entityName] ?? "";
  });
}

function transliterateVerseContent(content) {
  const parts = [];
  const tokenPattern = /<word-translit>([\s\S]*?)<\/word-translit>|<space\s*\/>/g;
  let match = tokenPattern.exec(content);

  while (match) {
    if (typeof match[1] === "string") {
      parts.push(transliterateWord(match[1]));
    } else {
      parts.push(" ");
    }

    match = tokenPattern.exec(content);
  }

  return normalizeWhitespace(parts.join(""))
    .replace(/\s*-\s*/g, "-")
    .replace(/(^| )-/g, "$1")
    .trim();
}

function parseMiklalVerses(xmlContent) {
  const verses = new Map();
  const versePattern = /<verse num="(\d+)" vid="(v\d{8})">([\s\S]*?)<\/verse>/g;
  let match = versePattern.exec(xmlContent);

  while (match) {
    const vid = match[2];
    const bookNumber = Number(vid.slice(1, 3));
    const chapter = Number(vid.slice(3, 6));
    const verse = Number(vid.slice(6, 9));
    const transliteration = transliterateVerseContent(match[3]);
    const key = `${bookNumber}:${chapter}:${verse}`;

    verses.set(key, {
      vid,
      bookNumber,
      chapter,
      verse,
      transliteration,
    });

    match = versePattern.exec(xmlContent);
  }

  return verses;
}

function parseWlcVerses(xmlContent) {
  const verses = new Map();
  const versePattern = /<v id="(\d+)" bcv="([A-Z0-9]+\.\d+\.\d+)" \/>[\s\S]*?(.*?)\s*<ve \/>/g;
  let match = versePattern.exec(xmlContent);

  while (match) {
    const bcv = match[2];
    const [bookCode, chapterValue, verseValue] = bcv.split(".");
    const bookNumber = OT_BOOK_CODES.indexOf(bookCode) + 1;

    if (bookNumber <= 0) {
      match = versePattern.exec(xmlContent);
      continue;
    }

    const chapter = Number(chapterValue);
    const verse = Number(verseValue);
    const hebrew = normalizeWhitespace(match[3]);
    const key = `${bookNumber}:${chapter}:${verse}`;

    verses.set(key, {
      bookCode,
      bookNumber,
      chapter,
      verse,
      hebrew,
      bcv,
    });

    match = versePattern.exec(xmlContent);
  }

  return verses;
}

function buildBookMetadata() {
  const metadata = JSON.parse(readUtf8File(BIBLE_METADATA_PATH));
  const books = metadata?.booksByVersion?.NVI;

  if (!Array.isArray(books) || books.length < 39) {
    console.error("Metadados biblicos invalidos para montar os livros do AT.");
    process.exit(1);
  }

  return books.slice(0, 39).map((book, index) => ({
    number: index + 1,
    id: book.id,
    label: book.label,
    chapters: book.chapters,
    testament: book.testament,
    code: OT_BOOK_CODES[index],
  }));
}

function main() {
  const miklalXml = readUtf8File(MIKLAL_XML_PATH);
  const wlcXml = readUtf8File(WLC_USFX_PATH);
  const miklalVerses = parseMiklalVerses(miklalXml);
  const wlcVerses = parseWlcVerses(wlcXml);
  const books = buildBookMetadata();

  const mergedVerses = [];

  for (const book of books) {
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      for (let verse = 1; verse <= 200; verse += 1) {
        const key = `${book.number}:${chapter}:${verse}`;
        const hebrewVerse = wlcVerses.get(key);
        const miklalVerse = miklalVerses.get(key);

        if (!hebrewVerse && !miklalVerse) {
          break;
        }

        if (!hebrewVerse || !miklalVerse) {
          console.error(`Versiculo inconsistente em ${key}.`);
          process.exit(1);
        }

        mergedVerses.push({
          bookNumber: book.number,
          bookId: book.id,
          bookCode: book.code,
          book: book.label,
          chapter,
          verse,
          reference: `${book.label} ${chapter}:${verse}`,
          hebrew: hebrewVerse.hebrew,
          transliteration: miklalVerse.transliteration,
          vid: miklalVerse.vid,
          source: {
            hebrew: "WLC",
            transliteration: "Miklal WLC Transliteration",
          },
        });
      }
    }
  }

  const payload = {
    license: {
      hebrew: "Public Domain (WLC via eBible.org)",
      transliteration: "CC BY-NC-SA 4.0 (Miklal Software Solutions, Inc.)",
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
