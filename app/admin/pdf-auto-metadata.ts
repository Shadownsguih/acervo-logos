import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjs.version}`;

export type SuggestedPdfMetadata = {
  title: string;
  description: string;
};

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseWord(word: string) {
  if (!word) {
    return "";
  }

  if (/^(ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(word)) {
    return word.toUpperCase();
  }

  if (/^[A-Z0-9]+$/.test(word) && word.length <= 4) {
    return word;
  }

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function prettifyFileName(fileName: string) {
  const baseName = fileName.replace(/\.pdf$/i, "");
  const normalized = normalizeSpaces(
    baseName
      .replace(/[_-]+/g, " ")
      .replace(/\(\d+\)$/g, "")
      .replace(/\b(?:scan|digitalizado|final|copia|copy)\b/gi, "")
  );

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .map((word) => titleCaseWord(word))
    .join(" ");
}

function extractMeaningfulLines(text: string) {
  return text
    .split("\n")
    .map((line) => normalizeSpaces(line))
    .filter((line) => {
      if (!line) {
        return false;
      }

      if (line.length < 4 || line.length > 120) {
        return false;
      }

      if (/^(p[aá]gina|page)\b/i.test(line)) {
        return false;
      }

      if (/^(sum[aá]rio|[íi]ndice|contents)\b/i.test(line)) {
        return false;
      }

      if (/^https?:\/\//i.test(line) || /^www\./i.test(line)) {
        return false;
      }

      if (/^\d+$/.test(line)) {
        return false;
      }

      return true;
    });
}

function pickSuggestedTitle(fileName: string, text: string) {
  const fileNameTitle = prettifyFileName(fileName);
  const lines = extractMeaningfulLines(text);

  const pageTitleCandidate =
    lines.find((line) => line.split(" ").length >= 2 && line.length <= 90) ??
    "";

  if (!fileNameTitle) {
    return pageTitleCandidate;
  }

  if (
    /^documento\b/i.test(fileNameTitle) ||
    /^arquivo\b/i.test(fileNameTitle) ||
    /^livro\b/i.test(fileNameTitle)
  ) {
    return pageTitleCandidate || fileNameTitle;
  }

  return fileNameTitle;
}

function buildDescription(title: string, text: string) {
  const cleanedText = normalizeSpaces(text.replaceAll(title, "").trim());

  if (!cleanedText) {
    return "";
  }

  const sentences = cleanedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeSpaces(sentence))
    .filter((sentence) => sentence.length >= 30);

  const description = sentences.slice(0, 2).join(" ");

  if (!description) {
    return cleanedText.slice(0, 260).trim();
  }

  return description.length > 320
    ? `${description.slice(0, 317).trim()}...`
    : description;
}

export function buildEditorialDescription(
  title: string,
  extractedDescription?: string
) {
  const normalizedTitle = normalizeSpaces(title);
  const normalizedDescription = normalizeSpaces(extractedDescription ?? "");

  if (normalizedDescription) {
    const polished = normalizedDescription.length > 320
      ? `${normalizedDescription.slice(0, 317).trim()}...`
      : normalizedDescription;

    return `${polished} Material em PDF indicado para leitura, consulta e aprofundamento no Acervo Logos.`;
  }

  if (!normalizedTitle) {
    return "Material em PDF indicado para leitura, consulta e aprofundamento no Acervo Logos.";
  }

  return `Obra em PDF relacionada a ${normalizedTitle}, indicada para leitura, consulta e aprofundamento no Acervo Logos. Ideal para estudo continuo e pesquisa do conteudo apresentado.`;
}

async function extractPdfText(file: File, maxPages = 3) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    useWorkerFetch: false,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, maxPages);
  const pages: string[] = [];

  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        if (!("str" in item)) {
          return "";
        }

        return `${item.str}${item.hasEOL ? "\n" : " "}`;
      })
      .join("");

    pages.push(text);
  }

  await pdf.destroy();

  return pages.join("\n");
}

export async function suggestPdfMetadata(
  file: File
): Promise<SuggestedPdfMetadata> {
  const extractedText = await extractPdfText(file);
  const title = pickSuggestedTitle(file.name, extractedText);
  const description = buildEditorialDescription(
    title,
    buildDescription(title, extractedText)
  );

  return {
    title,
    description,
  };
}
