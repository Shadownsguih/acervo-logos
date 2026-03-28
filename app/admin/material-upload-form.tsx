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

export default function MaterialUploadForm({
  categories,
}: MaterialUploadFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = useMemo(() => {
    return !!title.trim() && !!categoryId && !!file && !isSubmitting;
  }, [title, categoryId, file, isSubmitting]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

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

    if (displayOrder.trim()) {
      const parsedDisplayOrder = Number(displayOrder);

      if (!Number.isInteger(parsedDisplayOrder) || parsedDisplayOrder <= 0) {
        setErrorMessage(
          "A posição de exibição deve ser um número inteiro maior que zero."
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const materialId = crypto.randomUUID();

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("materialId", materialId);
      uploadFormData.append("title", title.trim());

      const uploadResponse = await fetch("/api/admin/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadResult?.error || "Falha ao enviar PDF.");
      }

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
          pdfUrl: uploadResult.publicUrl,
          displayOrder: displayOrder.trim() ? Number(displayOrder) : null,
        }),
      });

      const saveResult = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(saveResult?.error || "Falha ao salvar material.");
      }

      setSuccessMessage("Material publicado com sucesso.");
      setTitle("");
      setDescription("");
      setCategoryId("");
      setDisplayOrder("");
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
          Use este formulário para publicar materiais com um único PDF direto em
          <code className="mx-1 rounded bg-black/30 px-1.5 py-0.5 text-zinc-200">
            materials.pdf_url
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

        <div className="grid gap-6 md:grid-cols-2">
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
              htmlFor="material-display-order"
              className="mb-2 block text-sm font-medium text-zinc-200"
            >
              Posição na categoria
            </label>
            <input
              id="material-display-order"
              type="number"
              min={1}
              value={displayOrder}
              onChange={(event) => setDisplayOrder(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-amber-400"
              placeholder="Ex.: 2"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Se deixar vazio, o material será colocado no final. Se informar 2,
              ele entra na posição 2 e empurra os demais para baixo.
            </p>
          </div>
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
            O PDF será enviado ao R2 e o material será cadastrado no Supabase.
          </p>
        </div>
      </form>
    </section>
  );
}