require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  console.error("Faltou a variavel NEXT_PUBLIC_SUPABASE_URL no .env.local");
  process.exit(1);
}

if (!supabaseSecretKey) {
  console.error("Faltou a variavel SUPABASE_SECRET_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

function getTranslationCode() {
  const value = process.argv[2]?.trim().toUpperCase();

  if (!value) {
    console.error(
      "Informe a sigla da traducao. Exemplo: node scripts/import-bible-verses.js ARA"
    );
    process.exit(1);
  }

  return value;
}

function chunkArray(array, size) {
  const chunks = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

async function main() {
  const translationCode = getTranslationCode();
  const inputPath = path.join(
    process.cwd(),
    "temp-bible-data",
    `${translationCode}-flat.json`
  );

  if (!fs.existsSync(inputPath)) {
    console.error(`Arquivo nao encontrado em: ${inputPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(inputPath, "utf-8");
  const parsed = JSON.parse(rawContent);

  if (!Array.isArray(parsed)) {
    console.error("O arquivo flat precisa ser um array.");
    process.exit(1);
  }

  const verses = parsed
    .filter((item) => {
      return (
        item &&
        typeof item.version === "string" &&
        typeof item.book === "string" &&
        typeof item.chapter === "number" &&
        typeof item.verse === "number" &&
        typeof item.reference === "string" &&
        typeof item.text === "string"
      );
    })
    .map((item) => ({
      version: item.version,
      book: item.book,
      abbrev: typeof item.abbrev === "string" ? item.abbrev : null,
      chapter: item.chapter,
      verse: item.verse,
      reference: item.reference,
      text: item.text,
    }));

  if (verses.length === 0) {
    console.error("Nenhum versiculo valido foi encontrado no arquivo.");
    process.exit(1);
  }

  const { count, error: countError } = await supabase
    .from("bible_verses")
    .select("*", { count: "exact", head: true })
    .eq("version", translationCode);

  if (countError) {
    console.error("Erro ao verificar se a traducao ja existe:");
    console.error(countError);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.error(
      `A traducao ${translationCode} ja existe no banco com ${count} versiculos. Importacao cancelada para evitar duplicacao.`
    );
    process.exit(1);
  }

  console.log(`Traducao: ${translationCode}`);
  console.log(`Total de versiculos encontrados: ${verses.length}`);

  const chunks = chunkArray(verses, 500);

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];

    const { error } = await supabase.from("bible_verses").insert(chunk);

    if (error) {
      console.error(`Erro ao importar o lote ${index + 1}/${chunks.length}:`);
      console.error(error);
      process.exit(1);
    }

    console.log(`Lote ${index + 1}/${chunks.length} importado com sucesso.`);
  }

  console.log("Importacao concluida com sucesso.");
}

main().catch((error) => {
  console.error("Erro inesperado na importacao:");
  console.error(error);
  process.exit(1);
});
