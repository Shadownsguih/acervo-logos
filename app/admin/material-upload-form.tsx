"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type MaterialUploadFormProps = {
  categories: Category[];
};

type DirectUploadTarget = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

type ApiResult = {
  error?: string;
  success?: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
};

async function readResponseSafely(response: Response): Promise<ApiResult> {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as ApiResult;
  } catch {
    const normalizedText = rawText.toLowerCase();

    if (
      normalizedText.includes("request entity too large") ||
      normalizedText.includes("payload too large") ||
      response.status === 413
    ) {
      return {
        error:
          "O arquivo e grande demais para o metodo antigo de upload. Use o envio direto para o R2.",
      };
    }

    return {
      error: rawText,
    };
  }
}

async function getDirectUploadTarget(params: {
  materialId: string;
  title: string;
  fileType: string;
}) {
  const response = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const result = await readResponseSafely(response);

  if (!response.ok) {
    throw new Error(result.error || "Falha ao preparar o upload do PDF.");
  }

  if (!result.uploadUrl || !result.publicUrl) {
    throw new Error("A URL assinada do upload nao foi retornada.");
  }

  return result as Required<DirectUploadTarget>;
}

async function uploadPdfDirectly(params: {
  uploadUrl: string;
  file: File;
}) {
  const response = await fetch(params.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
    },
    body: params.file,
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      responseText || "Falha ao enviar o PDF diretamente para o R2."
    );
  }
}

function StatusCard({
  tone,
  children,
}: {
  tone: "success" | "error" | "status";
  children: React.ReactNode;
}) {
  const className =
    tone === "success"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : tone === "error"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-amber-300/20 bg-amber-300/10 text-amber-200";

  return (
    <div className={`rounded-[22px] border px-4 py-3 text-sm ${className}`}>
      {children}
    </div>
  );
}

const fieldClassName =
  "w-full rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]";

export default function MaterialUploadForm({
  categories,
}: MaterialUploadFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    return !!title.trim() && !!categoryId && !!file && !isSubmitting;
  }, [title, categoryId, file, isSubmitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");
    setStatusMessage("");

    if (!title.trim()) {
      setErrorMessage("Informe o titulo do material.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Selecione uma categoria.");
      return;
    }

    if (!file) {
      setErrorMessage("Selecione um arquivo PDF.");
      return;
    }

    if (file.type !== "application/pdf") {
      setErrorMessage("Envie apenas arquivos PDF.");
      return;
    }

    setIsSubmitting(true);

    try {
      const materialId = crypto.randomUUID();

      setStatusMessage("Preparando upload direto no R2...");

      const target = await getDirectUploadTarget({
        materialId,
        title: title.trim(),
        fileType: file.type,
      });

      setStatusMessage("Enviando PDF diretamente para o R2...");

      await uploadPdfDirectly({
        uploadUrl: target.uploadUrl,
        file,
      });

      setStatusMessage("Salvando material no banco...");

      const saveResponse = await fetch("/api/admin/materials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: materialId,
          title: title.trim(),
          description: description.trim(),
          categoryId,
          pdfUrl: target.publicUrl,
        }),
      });

      const saveResult = await readResponseSafely(saveResponse);

      if (!saveResponse.ok) {
        throw new Error(saveResult?.error || "Falha ao salvar material.");
      }

      setSuccessMessage("Material publicado com sucesso.");
      setStatusMessage("");
      setTitle("");
      setDescription("");
      setCategoryId("");
      setFile(null);

      const fileInput = document.getElementById(
        "material-pdf"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao publicar o material.";

      setErrorMessage(message);
      setStatusMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0c1017]/88 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex h-full flex-col">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-300">
            Publicacao
          </p>

          <h3 className="mt-3 text-2xl font-bold text-white">
            Adicionar material simples
          </h3>

          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Ideal para obras com PDF unico. O arquivo segue direto para o R2 e
            o cadastro ja volta mais limpo para o acervo.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Fluxo
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              PDF unico com envio direto
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Destino
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Cloudflare R2 + cadastro no Supabase
            </p>
          </div>
        </div>

        {successMessage ? (
          <div className="mt-6">
            <StatusCard tone="success">{successMessage}</StatusCard>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-6">
            <StatusCard tone="error">{errorMessage}</StatusCard>
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-6">
            <StatusCard tone="status">{statusMessage}</StatusCard>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
          <div>
            <label
              htmlFor="material-title"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Titulo
            </label>
            <input
              id="material-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClassName}
              placeholder="Ex.: Biblia de Estudo"
            />
          </div>

          <div>
            <label
              htmlFor="material-description"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Descricao
            </label>
            <textarea
              id="material-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className={fieldClassName}
              placeholder="Descricao breve do material"
            />
          </div>

          <div>
            <label
              htmlFor="material-category"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Categoria
            </label>
            <select
              id="material-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-4">
            <label
              htmlFor="material-pdf"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Arquivo PDF
            </label>
            <input
              id="material-pdf"
              type="file"
              accept="application/pdf"
              onChange={(event) => {
                const selectedFile = event.target.files?.[0] ?? null;
                setFile(selectedFile);
              }}
              className="block w-full rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-amber-200"
            />

            {file ? (
              <div className="mt-3 rounded-[18px] border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                Tamanho selecionado: {(file.size / 1024 / 1024).toFixed(2)} MB
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-full bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Publicando..." : "Publicar material"}
            </button>

            <p className="text-sm leading-6 text-zinc-500">
              O PDF sera enviado direto para o R2 e depois o material sera
              salvo no Supabase.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
