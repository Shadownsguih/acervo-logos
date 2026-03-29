import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2AccountId = process.env.R2_ACCOUNT_ID!;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID!;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const r2BucketName = process.env.R2_BUCKET_NAME!;
const r2PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: r2AccessKeyId,
    secretAccessKey: r2SecretAccessKey,
  },
});

export function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function buildMaterialPdfKey(params: {
  materialId: string;
  title: string;
}) {
  const fileName = sanitizeFileName(params.title);
  return `materials/${params.materialId}/${fileName}.pdf`;
}

export function buildVolumePdfKey(params: {
  materialId: string;
  volumeId: string;
  title: string;
}) {
  const fileName = sanitizeFileName(params.title);
  return `volumes/${params.materialId}/${params.volumeId}/${fileName}.pdf`;
}

export function getR2PublicUrl(key: string) {
  return `${r2PublicBaseUrl}/${key}`;
}

export async function createPresignedPdfUpload(params: {
  key: string;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: params.key,
    ContentType: "application/pdf",
  });

  const uploadUrl = await getSignedUrl(r2, command, {
    expiresIn: params.expiresIn ?? 900,
  });

  return {
    key: params.key,
    uploadUrl,
    publicUrl: getR2PublicUrl(params.key),
  };
}