"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Material = {
  id: string;
  title: string;
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
    return {
      error: rawText,
    };
  }
}

async function getVolumeUploadTarget(params: {
  materialId: string;
  volumeId: string;
  title: string;
  fileType: string;
}) {
  const response = await fetch("/api/admin/volumes/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const result = await readResponseSafely(response);

  if (!response.ok) {
    throw new Error(result.error || "Falha ao preparar o upload do volume.");
  }

  if (!result.uploadUrl || !result.publicUrl) {
    throw new Error("A URL assinada do volume nao foi retornada.");
  }

  return {
    uploadUrl: result.uploadUrl,
    publicUrl: result.publicUrl,
  };
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

const fieldClassName =
  "w-full rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]";

export default function AddVolumeExistingForm({
  materials,
}: {
  materials: Material[];
}) {
  const router = useRouter();

  const [materialId, setMaterialId] = useState("");
  const [title, setTitle] = useState("");
  const [volumeNumber, setVolumeNumber] = useState(1);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!materialId || !file || !title) {
      setMsg("Preencha todos os campos obrigatorios.");
      return;
    }

    if (file.type !== "application/pdf") {
      setMsg("Envie apenas arquivos PDF.");
      return;
    }

    setLoading(true);
    setMsg("");
    setStatusMessage("");

    try {
      const volumeId = crypto.randomUUID();

      setStatusMessage("Preparando upload direto do volume...");

      const target = await getVolumeUploadTarget({
        materialId,
        volumeId,
        title: title.trim(),
        fileType: file.type,
      });

      setStatusMessage("Enviando volume diretamente para o R2...");

      await uploadPdfDirectly({
        uploadUrl: target.uploadUrl,
        file,
      });

      setStatusMessage("Salvando volume no banco...");

      const res = await fetch("/api/admin/volumes/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId,
          title: title.trim(),
          volumeNumber,
          description: description.trim(),
          pdfUrl: target.publicUrl,
        }),
      });

      const data = await readResponseSafely(res);

      if (!res.ok) {
        throw new Error(data.error || "Erro ao salvar volume.");
      }

      setMsg("Volume adicionado com sucesso.");
      setStatusMessage("");
      setTitle("");
      setVolumeNumber(1);
      setDescription("");
      setFile(null);

      const fileInput = document.getElementById(
        "existing-volume-pdf"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }

      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro ao adicionar volume.");
      setStatusMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-[#0c1017]/88 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex h-full flex-col">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-300">
            Complemento
          </p>

          <h3 className="mt-3 text-2xl font-bold text-white">
            Adicionar volume em obra existente
          </h3>

          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Use este formulario quando a obra ja estiver cadastrada e voce
            precisar incluir apenas um novo volume no conjunto.
          </p>
        </div>

        {msg ? (
          <div className="mt-6 rounded-[22px] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-200">
            {msg}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
            {statusMessage}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          <div>
            <label
              htmlFor="existing-material"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Obra de destino
            </label>
            <select
              id="existing-material"
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className={fieldClassName}
            >
              <option value="">Selecione a obra</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="existing-volume-title"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Titulo do volume
            </label>
            <input
              id="existing-volume-title"
              placeholder="Titulo do volume"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClassName}
            />
          </div>

          <div>
            <label
              htmlFor="existing-volume-number"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Numero do volume
            </label>
            <input
              id="existing-volume-number"
              type="number"
              min={1}
              value={volumeNumber}
              onChange={(e) => setVolumeNumber(Number(e.target.value))}
              className={fieldClassName}
            />
          </div>

          <div>
            <label
              htmlFor="existing-volume-description"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Descricao
            </label>
            <textarea
              id="existing-volume-description"
              placeholder="Descricao"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={fieldClassName}
              rows={4}
            />
          </div>

          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-4">
            <label
              htmlFor="existing-volume-pdf"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              PDF do volume
            </label>
            <input
              id="existing-volume-pdf"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
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
              disabled={loading}
              className="inline-flex items-center justify-center rounded-full bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Adicionar volume"}
            </button>

            <p className="text-sm leading-6 text-zinc-500">
              O volume novo sera enviado ao R2 e depois vinculado a obra ja
              existente.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
