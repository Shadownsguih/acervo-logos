const fs = require("fs");
const path = require("path");

const inputPath = path.join(process.cwd(), "temp-bible-data", "NVI.json");
const outputDir = path.join(process.cwd(), "temp-bible-data");
const outputPath = path.join(outputDir, "NVI-flat.json");

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

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error(`Arquivo não encontrado em: ${inputPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(rawContent);

  if (!Array.isArray(parsed)) {
    console.error("O arquivo JSON precisa ser um array de livros.");
    process.exit(1);
  }

  const flattenedVerses = [];

  parsed.forEach((book, bookIndex) => {
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
          version: "NVI",
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

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(flattenedVerses, null, 2), "utf-8");

  console.log("Conversão concluída com sucesso.");
  console.log(`Total de versículos gerados: ${flattenedVerses.length}`);
  console.log(`Arquivo gerado em: ${outputPath}`);
}

main();