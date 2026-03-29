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
    throw new Error("A URL assinada do volume não foi retornada.");
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
      setMsg("Preencha todos os campos obrigatórios.");
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
    <section className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-2xl font-bold">Adicionar volume existente</h2>

      {msg ? <p className="mt-4 text-sm text-amber-400">{msg}</p> : null}
      {statusMessage ? (
        <p className="mt-2 text-sm text-zinc-400">{statusMessage}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <select
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
          className="w-full rounded bg-black p-3"
        >
          <option value="">Selecione a obra</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>

        <input
          placeholder="Título do volume"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded bg-black p-3"
        />

        <input
          type="number"
          min={1}
          value={volumeNumber}
          onChange={(e) => setVolumeNumber(Number(e.target.value))}
          className="w-full rounded bg-black p-3"
        />

        <textarea
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded bg-black p-3"
        />

        <input
          id="existing-volume-pdf"
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        {file ? (
          <p className="text-xs text-zinc-500">
            Tamanho selecionado: {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-amber-400 px-6 py-3 text-black"
        >
          {loading ? "Enviando..." : "Adicionar volume"}
        </button>
      </form>
    </section>
  );
}