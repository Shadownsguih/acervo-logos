const fs = require("fs");
const path = require("path");

function getTranslationCode() {
  const value = process.argv[2]?.trim().toUpperCase();

  if (!value) {
    console.error(
      "Informe a sigla da traducao. Exemplo: node scripts/convert-bible.js ARA"
    );
    process.exit(1);
  }

  return value;
}

function normalizeBookName(book, fallbackIndex) {
  if (typeof book.name === "string" && book.name.trim()) {
    return book.name.trim();
  }

  if (typeof book.book === "string" && book.book.trim()) {
    return book.book.trim();
  }

  if (typeof book.fullName === "string" && book.fullName.trim()) {
    return book.fullName.trim();
  }

  return `Livro ${fallbackIndex + 1}`;
}

function normalizeBookAbbrev(book) {
  if (typeof book.abbrev === "string" && book.abbrev.trim()) {
    return book.abbrev.trim();
  }

  if (
    book.abbrev &&
    typeof book.abbrev === "object" &&
    typeof book.abbrev.pt === "string" &&
    book.abbrev.pt.trim()
  ) {
    return book.abbrev.pt.trim();
  }

  if (
    book.abbrev &&
    typeof book.abbrev === "object" &&
    typeof book.abbrev.en === "string" &&
    book.abbrev.en.trim()
  ) {
    return book.abbrev.en.trim();
  }

  return "";
}

function readTranslationFile(inputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Arquivo nao encontrado em: ${inputPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(rawContent);

  if (!Array.isArray(parsed)) {
    console.error("O arquivo JSON precisa ser um array de livros.");
    process.exit(1);
  }

  return parsed;
}

function flattenTranslationBooks(books, translationCode) {
  const flattenedVerses = [];

  books.forEach((book, bookIndex) => {
    const bookName = normalizeBookName(book, bookIndex);
    const bookAbbrev = normalizeBookAbbrev(book);

    if (!Array.isArray(book.chapters)) {
      return;
    }

    book.chapters.forEach((chapterVerses, chapterIndex) => {
      if (!Array.isArray(chapterVerses)) {
        return;
      }

      chapterVerses.forEach((verseText, verseIndex) => {
        if (typeof verseText !== "string") {
          return;
        }

        const cleanedText = verseText.trim();

        if (!cleanedText) {
          return;
        }

        const chapterNumber = chapterIndex + 1;
        const verseNumber = verseIndex + 1;

        flattenedVerses.push({
          version: translationCode,
          book: bookName,
          abbrev: bookAbbrev,
          chapter: chapterNumber,
          verse: verseNumber,
          reference: `${bookName} ${chapterNumber}:${verseNumber}`,
          text: cleanedText,
        });
      });
    });
  });

  return flattenedVerses;
}

function main() {
  const translationCode = getTranslationCode();
  const outputDir = path.join(process.cwd(), "temp-bible-data");
  const inputPath = path.join(outputDir, `${translationCode}.json`);
  const outputPath = path.join(outputDir, `${translationCode}-flat.json`);
  const parsed = readTranslationFile(inputPath);
  const flattenedVerses = flattenTranslationBooks(parsed, translationCode);

  if (!flattenedVerses.length) {
    console.error("Nenhum versiculo valido foi encontrado no arquivo.");
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(flattenedVerses, null, 2), "utf-8");

  console.log("Conversao concluida com sucesso.");
  console.log(`Traducao: ${translationCode}`);
  console.log(`Total de versiculos gerados: ${flattenedVerses.length}`);
  console.log(`Arquivo gerado em: ${outputPath}`);
}

main();
