import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME;
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

const faltando: string[] = [];

if (!supabaseUrl) faltando.push("NEXT_PUBLIC_SUPABASE_URL");
if (!supabaseAnonKey) faltando.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
if (!r2AccountId) faltando.push("R2_ACCOUNT_ID");
if (!r2AccessKeyId) faltando.push("R2_ACCESS_KEY_ID");
if (!r2SecretAccessKey) faltando.push("R2_SECRET_ACCESS_KEY");
if (!r2BucketName) faltando.push("R2_BUCKET_NAME");
if (!r2PublicBaseUrl) faltando.push("R2_PUBLIC_BASE_URL");

if (faltando.length > 0) {
  console.error("Variáveis ausentes no .env.local:");
  for (const nome of faltando) {
    console.error(`- ${nome}`);
  }
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId!,
    secretAccessKey: r2SecretAccessKey!,
  },
});

type MaterialRow = {
  id: string;
  title: string;
  pdf_url: string | null;
};

type VolumeRow = {
  id: string;
  material_id: string;
  title: string;
  pdf_url: string | null;
};

function limparNome(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function gerarKeyMaterial(item: MaterialRow) {
  const nome = limparNome(item.title || "material");
  return `materials/${item.id}/${nome}.pdf`;
}

function gerarKeyVolume(item: VolumeRow) {
  const nome = limparNome(item.title || "volume");
  return `volumes/${item.material_id}/${item.id}/${nome}.pdf`;
}

async function baixarArquivo(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro ao baixar PDF: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}

async function enviarParaR2(key: string, body: Uint8Array) {
  await r2.send(
    new PutObjectCommand({
      Bucket: r2BucketName!,
      Key: key,
      Body: body,
      ContentType: "application/pdf",
    })
  );
}

async function migrarMaterials() {
  const { data, error } = await supabase
    .from("materials")
    .select("id, title, pdf_url")
    .not("pdf_url", "is", null);

  if (error) throw error;

  const items = (data ?? []) as MaterialRow[];

  console.log(`Materials encontrados: ${items.length}`);

  for (const item of items) {
    if (!item.pdf_url) continue;

    const key = gerarKeyMaterial(item);
    const novaUrl = `${r2PublicBaseUrl}/${key}`;

    console.log(`Migrando material: ${item.title}`);

    const arquivo = await baixarArquivo(item.pdf_url);
    await enviarParaR2(key, arquivo);

    const { error: updateError } = await supabase
      .from("materials")
      .update({ pdf_url: novaUrl })
      .eq("id", item.id);

    if (updateError) throw updateError;

    console.log(`OK material: ${novaUrl}`);
  }
}

async function migrarVolumes() {
  const { data, error } = await supabase
    .from("material_volumes")
    .select("id, material_id, title, pdf_url")
    .not("pdf_url", "is", null);

  if (error) throw error;

  const items = (data ?? []) as VolumeRow[];

  console.log(`Volumes encontrados: ${items.length}`);

  for (const item of items) {
    if (!item.pdf_url) continue;

    const key = gerarKeyVolume(item);
    const novaUrl = `${r2PublicBaseUrl}/${key}`;

    console.log(`Migrando volume: ${item.title}`);

    const arquivo = await baixarArquivo(item.pdf_url);
    await enviarParaR2(key, arquivo);

    const { error: updateError } = await supabase
      .from("material_volumes")
      .update({ pdf_url: novaUrl })
      .eq("id", item.id);

    if (updateError) throw updateError;

    console.log(`OK volume: ${novaUrl}`);
  }
}

async function main() {
  console.log("Iniciando migração...");
  await migrarMaterials();
  await migrarVolumes();
  console.log("Migração concluída com sucesso.");
}

main().catch((error) => {
  console.error("Erro na migração:", error);
  process.exit(1);
});