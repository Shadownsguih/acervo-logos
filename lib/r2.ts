import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function uploadPdfToR2(params: {
  key: string;
  body: Uint8Array;
}) {
  await r2.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: params.key,
      Body: params.body,
      ContentType: "application/pdf",
    })
  );

  return `${r2PublicBaseUrl}/${params.key}`;
}