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

function createEmptyVolume(index: number): VolumeFormItem {
  return {
    localId: crypto.randomUUID(),
    title: `Volume ${index}`,
    volumeNumber: index,
    description: "",
    file: null,
  };
}

export default function MaterialWithVolumesForm({
  categories,
}: MaterialWithVolumesFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [volumes, setVolumes] = useState<VolumeFormItem[]>([
    createEmptyVolume(1),
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
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

    if (!title.trim()) {
      setErrorMessage("Informe o título da obra.");
      return;
    }

    if (!categoryId) {
      setErrorMessage("Selecione uma categoria.");
      return;
    }

    if (displayOrder.trim()) {
      const parsedDisplayOrder = Number(displayOrder);

      if (!Number.isInteger(parsedDisplayOrder) || parsedDisplayOrder <= 0) {
        setErrorMessage(
          "A posição de exibição deve ser um número inteiro maior que zero."
        );
        return;
      }
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

      for (const volume of volumes) {
        const volumeId = crypto.randomUUID();

        const uploadFormData = new FormData();
        uploadFormData.append("file", volume.file as File);
        uploadFormData.append("materialId", materialId);
        uploadFormData.append("volumeId", volumeId);
        uploadFormData.append("title", volume.title.trim());

        const uploadResponse = await fetch("/api/admin/volumes/upload", {
          method: "POST",
          body: uploadFormData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult?.error || "Falha ao enviar volume.");
        }

        uploadedVolumes.push({
          id: volumeId,
          title: volume.title.trim(),
          volumeNumber: Number(volume.volumeNumber),
          description: volume.description.trim(),
          pdfUrl: uploadResult.publicUrl,
        });
      }

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
          displayOrder: displayOrder.trim() ? Number(displayOrder) : null,
          volumes: uploadedVolumes,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          saveResult?.error || "Falha ao salvar material com volumes."
        );
      }

      setSuccessMessage("Material com volumes publicado com sucesso.");
      setErrorMessage("");
      setTitle("");
      setDescription("");
      setCategoryId("");
      setDisplayOrder("");
      setVolumes([createEmptyVolume(1)]);

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao publicar material com volumes.";

      setErrorMessage(message);
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
          Use este formulário para publicar uma obra principal sem PDF próprio e
          vários volumes em
          <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-zinc-200">
            material_volumes
          </code>
          .
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

        <div className="grid gap-6 md:grid-cols-2">
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

          <div>
            <label
              htmlFor="mv-display-order"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Posição na categoria
            </label>
            <input
              id="mv-display-order"
              type="number"
              min={1}
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
              placeholder="Ex.: 2"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Se deixar vazio, a obra entra no final. Se informar uma posição já
              ocupada, os demais cards serão empurrados para baixo.
            </p>
          </div>
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
                  <p className="font-semibold text-white">Volume {index + 1}</p>

                  {volumes.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeVolume(volume.localId)}
                      className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                    >
                      Remover
                    </button>
                  ) : null}
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
                          volumeNumber: Number(event.target.value || 0),
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
                    value={volume.description}
                    onChange={(event) =>
                      updateVolume(volume.localId, (current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    rows={3}
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
            Os PDFs serão enviados ao R2 e a obra será cadastrada no Supabase.
          </p>
        </div>
      </form>
    </section>
  );
}