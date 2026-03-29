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
          "O arquivo é grande demais para o método antigo de upload. Use o envio direto para o R2.",
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
    throw new Error("A URL assinada do upload não foi retornada.");
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
      setErrorMessage("Informe o título do material.");
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
    <section className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
          Publicação
        </p>

        <h2 className="mt-3 text-2xl font-bold">Adicionar material simples</h2>

        <p className="mt-4 text-zinc-400">
          Agora o PDF é enviado diretamente para o Cloudflare R2, ideal para
          arquivos grandes.
        </p>
      </div>

      {successMessage ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {statusMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6">
        <div>
          <label
            htmlFor="material-title"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Título
          </label>
          <input
            id="material-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            placeholder="Ex.: Bíblia de Estudo"
          />
        </div>

        <div>
          <label
            htmlFor="material-description"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Descrição
          </label>
          <textarea
            id="material-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            placeholder="Descrição breve do material"
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
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
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
            className="block w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-amber-300"
          />

          {file ? (
            <p className="mt-2 text-xs text-zinc-500">
              Tamanho selecionado: {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Publicando..." : "Publicar material"}
          </button>

          <p className="text-sm text-zinc-500">
            O PDF será enviado direto para o R2 e depois o material será salvo
            no Supabase.
          </p>
        </div>
      </form>
    </section>
  );
}