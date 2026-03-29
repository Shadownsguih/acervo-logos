"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type VolumeFormItem = {
  localId: string;
  title: string;
  volumeNumber: number;
  description: string;
  file: File | null;
};

type MaterialWithVolumesFormProps = {
  categories: Category[];
};

type ApiResult = {
  error?: string;
  success?: boolean;
  uploadUrl?: string;
  publicUrl?: string;
  key?: string;
};

function createEmptyVolume(index: number): VolumeFormItem {
  return {
    localId: crypto.randomUUID(),
    title: `Volume ${index}`,
    volumeNumber: index,
    description: "",
    file: null,
  };
}

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

export default function MaterialWithVolumesForm({
  categories,
}: MaterialWithVolumesFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [volumes, setVolumes] = useState<VolumeFormItem[]>([
    createEmptyVolume(1),
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    if (!title.trim() || !categoryId || isSubmitting || volumes.length === 0) {
      return false;
    }

    return volumes.every(
      (volume) =>
        volume.title.trim() &&
        Number(volume.volumeNumber) > 0 &&
        volume.file &&
        volume.file.type === "application/pdf"
    );
  }, [title, categoryId, isSubmitting, volumes]);

  function updateVolume(
    localId: string,
    updater: (current: VolumeFormItem) => VolumeFormItem
  ) {
    setVolumes((current) =>
      current.map((item) => (item.localId === localId ? updater(item) : item))
    );
  }

  function addVolume() {
    setVolumes((current) => [...current, createEmptyVolume(current.length + 1)]);
  }

  function removeVolume(localId: string) {
    setVolumes((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((item) => item.localId !== localId);
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");
    setStatusMessage("");

    if (!title.trim()) {
      setErrorMessage("Informe o título da obra.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Selecione uma categoria.");
      return;
    }

    if (volumes.length === 0) {
      setErrorMessage("Adicione pelo menos um volume.");
      return;
    }

    for (const volume of volumes) {
      if (!volume.title.trim()) {
        setErrorMessage("Todos os volumes precisam ter título.");
        return;
      }

      if (!volume.file) {
        setErrorMessage("Todos os volumes precisam ter um PDF.");
        return;
      }

      if (volume.file.type !== "application/pdf") {
        setErrorMessage("Todos os arquivos devem ser PDF.");
        return;
      }

      if (!Number(volume.volumeNumber) || Number(volume.volumeNumber) <= 0) {
        setErrorMessage("O número do volume deve ser maior que zero.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const materialId = crypto.randomUUID();

      const uploadedVolumes: {
        id: string;
        title: string;
        volumeNumber: number;
        description: string;
        pdfUrl: string;
      }[] = [];

      for (let index = 0; index < volumes.length; index++) {
        const volume = volumes[index];
        const volumeId = crypto.randomUUID();

        setStatusMessage(
          `Preparando upload do volume ${index + 1} de ${volumes.length}...`
        );

        const target = await getVolumeUploadTarget({
          materialId,
          volumeId,
          title: volume.title.trim(),
          fileType: (volume.file as File).type,
        });

        setStatusMessage(
          `Enviando volume ${index + 1} de ${volumes.length} para o R2...`
        );

        await uploadPdfDirectly({
          uploadUrl: target.uploadUrl,
          file: volume.file as File,
        });

        uploadedVolumes.push({
          id: volumeId,
          title: volume.title.trim(),
          volumeNumber: Number(volume.volumeNumber),
          description: volume.description.trim(),
          pdfUrl: target.publicUrl,
        });
      }

      setStatusMessage("Salvando obra e volumes no banco...");

      const saveResponse = await fetch("/api/admin/volumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          materialId,
          title: title.trim(),
          description: description.trim(),
          categoryId,
          volumes: uploadedVolumes,
        }),
      });

      const saveResult = await readResponseSafely(saveResponse);

      if (!saveResponse.ok) {
        throw new Error(
          saveResult?.error || "Falha ao salvar material com volumes."
        );
      }

      setSuccessMessage("Material com volumes publicado com sucesso.");
      setErrorMessage("");
      setStatusMessage("");
      setTitle("");
      setDescription("");
      setCategoryId("");
      setVolumes([createEmptyVolume(1)]);

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao publicar material com volumes.";

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
          Publicação avançada
        </p>

        <h2 className="mt-3 text-2xl font-bold">
          Adicionar material com volumes
        </h2>

        <p className="mt-4 text-zinc-400">
          A obra principal será criada sem PDF próprio, e cada volume será
          enviado diretamente ao R2.
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
            htmlFor="mv-title"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Título da obra
          </label>
          <input
            id="mv-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            placeholder="Ex.: Comentário Bíblico Champlin"
          />
        </div>

        <div>
          <label
            htmlFor="mv-description"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Descrição da obra
          </label>
          <textarea
            id="mv-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
            placeholder="Descrição breve da obra"
          />
        </div>

        <div>
          <label
            htmlFor="mv-category"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Categoria
          </label>
          <select
            id="mv-category"
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

        <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Volumes</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Adicione os volumes da obra nesta mesma publicação.
              </p>
            </div>

            <button
              type="button"
              onClick={addVolume}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              + Adicionar volume
            </button>
          </div>

          <div className="mt-6 grid gap-5">
            {volumes.map((volume, index) => (
              <div
                key={volume.localId}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="font-semibold text-white">
                    Volume {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeVolume(volume.localId)}
                    disabled={volumes.length === 1}
                    className="text-sm text-red-300 transition hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remover
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">
                      Título do volume
                    </label>
                    <input
                      type="text"
                      value={volume.title}
                      onChange={(event) =>
                        updateVolume(volume.localId, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
                      placeholder="Ex.: Volume 1"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-zinc-200">
                      Número do volume
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={volume.volumeNumber}
                      onChange={(event) =>
                        updateVolume(volume.localId, (current) => ({
                          ...current,
                          volumeNumber: Number(event.target.value),
                        }))
                      }
                      className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    Descrição do volume
                  </label>
                  <textarea
                    rows={3}
                    value={volume.description}
                    onChange={(event) =>
                      updateVolume(volume.localId, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
                    placeholder="Descrição breve do volume"
                  />
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-200">
                    PDF do volume
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0] ?? null;

                      updateVolume(volume.localId, (current) => ({
                        ...current,
                        file: selectedFile,
                      }));
                    }}
                    className="block w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-amber-300"
                  />

                  {volume.file ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Tamanho: {(volume.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Publicando..." : "Publicar obra com volumes"}
          </button>

          <p className="text-sm text-zinc-500">
            Os volumes serão enviados direto para o R2 antes do salvamento no
            banco.
          </p>
        </div>
      </form>
    </section>
  );
}