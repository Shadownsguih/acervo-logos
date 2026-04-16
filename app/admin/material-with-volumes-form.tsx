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
      setErrorMessage("Informe o titulo da obra.");
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
        setErrorMessage("Todos os volumes precisam ter titulo.");
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
        setErrorMessage("O numero do volume deve ser maior que zero.");
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
    <section className="rounded-[28px] border border-white/10 bg-[#0c1017]/88 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex h-full flex-col">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-300">
            Publicacao avancada
          </p>

          <h3 className="mt-3 text-2xl font-bold text-white">
            Adicionar material com volumes
          </h3>

          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Para obras maiores, a estrutura principal fica sem PDF proprio e
            cada volume recebe upload individual direto para o R2.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Estrutura
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Obra principal + volumes vinculados
            </p>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
              Upload
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Envio sequencial dos PDFs para o R2
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
              htmlFor="mv-title"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Titulo da obra
            </label>
            <input
              id="mv-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={fieldClassName}
              placeholder="Ex.: Comentario Biblico Champlin"
            />
          </div>

          <div>
            <label
              htmlFor="mv-description"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Descricao da obra
            </label>
            <textarea
              id="mv-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className={fieldClassName}
              placeholder="Descricao breve da obra"
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

          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-white">Volumes</h4>
                <p className="mt-1 text-sm text-zinc-400">
                  Adicione e organize os volumes desta obra na mesma publicacao.
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
                  className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">
                        Volume {index + 1}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                        Bloco individual
                      </p>
                    </div>

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
                        Titulo do volume
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
                        className={fieldClassName}
                        placeholder="Ex.: Volume 1"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-zinc-200">
                        Numero do volume
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
                        className={fieldClassName}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-2 block text-sm font-medium text-zinc-200">
                      Descricao do volume
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
                      className={fieldClassName}
                      placeholder="Descricao breve do volume"
                    />
                  </div>

                  <div className="mt-4 rounded-[20px] border border-dashed border-white/10 bg-black/20 p-4">
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
                      className="block w-full rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-zinc-300 file:mr-4 file:rounded-full file:border-0 file:bg-amber-300 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-amber-200"
                    />

                    {volume.file ? (
                      <div className="mt-3 rounded-[18px] border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-400">
                        Tamanho: {(volume.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center justify-center rounded-full bg-amber-300 px-6 py-3 font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Publicando..." : "Publicar obra com volumes"}
            </button>

            <p className="text-sm leading-6 text-zinc-500">
              Os volumes serao enviados direto para o R2 antes do salvamento no
              banco.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
