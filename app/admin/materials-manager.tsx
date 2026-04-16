"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type MaterialVolume = {
  id: string;
  materialId: string;
  title: string;
  volumeNumber: number;
  description: string | null;
  views: number;
};

type ManagedMaterial = {
  id: string;
  title: string;
  description: string | null;
  pdfUrl: string | null;
  views: number;
  displayOrder: number | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  volumes: MaterialVolume[];
};

type MaterialsManagerProps = {
  materials: ManagedMaterial[];
  categories: CategoryOption[];
};

type EditMaterialFormState = {
  title: string;
  description: string;
  categoryId: string;
  displayOrder: string;
};

type EditVolumeFormState = {
  title: string;
  description: string;
  volumeNumber: string;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
  targetType: "material" | "volume";
  targetId: string;
};

function sortMaterialsForManager(items: ManagedMaterial[]) {
  return [...items].sort((a, b) => {
    const orderA =
      typeof a.displayOrder === "number" && a.displayOrder > 0
        ? a.displayOrder
        : Number.MAX_SAFE_INTEGER;

    const orderB =
      typeof b.displayOrder === "number" && b.displayOrder > 0
        ? b.displayOrder
        : Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.title.localeCompare(b.title, "pt-BR");
  });
}

export default function MaterialsManager({
  materials,
  categories,
}: MaterialsManagerProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(
    null
  );

  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(
    null
  );
  const [editMaterialForm, setEditMaterialForm] =
    useState<EditMaterialFormState>({
      title: "",
      description: "",
      categoryId: "",
      displayOrder: "",
    });

  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null);
  const [editVolumeForm, setEditVolumeForm] = useState<EditVolumeFormState>({
    title: "",
    description: "",
    volumeNumber: "",
  });

  const [confirmingDeleteVolumeId, setConfirmingDeleteVolumeId] = useState<
    string | null
  >(null);
  const [confirmingDeleteMaterialId, setConfirmingDeleteMaterialId] = useState<
    string | null
  >(null);

  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [isSavingVolume, setIsSavingVolume] = useState(false);
  const [isDeletingVolume, setIsDeletingVolume] = useState(false);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const orderedMaterials = useMemo(
    () => sortMaterialsForManager(materials),
    [materials]
  );

  const filteredMaterials = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return orderedMaterials;
    }

    return orderedMaterials.filter((material) => {
      const searchableContent = [
        material.title,
        material.description ?? "",
        material.category?.name ?? "",
        material.category?.slug ?? "",
        String(material.displayOrder ?? ""),
        ...material.volumes.flatMap((volume) => [
          volume.title,
          volume.description ?? "",
          String(volume.volumeNumber),
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return searchableContent.includes(normalizedSearch);
    });
  }, [orderedMaterials, search]);

  function startEditingMaterial(material: ManagedMaterial) {
    setFeedback(null);
    setEditingVolumeId(null);
    setConfirmingDeleteVolumeId(null);
    setConfirmingDeleteMaterialId(null);
    setEditVolumeForm({
      title: "",
      description: "",
      volumeNumber: "",
    });

    setEditingMaterialId(material.id);
    setExpandedMaterialId(material.id);
    setEditMaterialForm({
      title: material.title,
      description: material.description ?? "",
      categoryId: material.category?.id ?? "",
      displayOrder:
        typeof material.displayOrder === "number" && material.displayOrder > 0
          ? String(material.displayOrder)
          : "",
    });
  }

  function cancelEditingMaterial() {
    setEditingMaterialId(null);
    setEditMaterialForm({
      title: "",
      description: "",
      categoryId: "",
      displayOrder: "",
    });
    setFeedback(null);
  }

  function startEditingVolume(materialId: string, volume: MaterialVolume) {
    setFeedback(null);
    setConfirmingDeleteVolumeId(null);
    setConfirmingDeleteMaterialId(null);
    setEditingMaterialId(null);
    setEditMaterialForm({
      title: "",
      description: "",
      categoryId: "",
      displayOrder: "",
    });

    setExpandedMaterialId(materialId);
    setEditingVolumeId(volume.id);
    setEditVolumeForm({
      title: volume.title,
      description: volume.description ?? "",
      volumeNumber: String(volume.volumeNumber),
    });
  }

  function cancelEditingVolume() {
    setEditingVolumeId(null);
    setEditVolumeForm({
      title: "",
      description: "",
      volumeNumber: "",
    });
    setFeedback(null);
  }

  function startDeleteVolume(volumeId: string) {
    setFeedback(null);
    setEditingVolumeId(null);
    setConfirmingDeleteMaterialId(null);
    setEditVolumeForm({
      title: "",
      description: "",
      volumeNumber: "",
    });
    setConfirmingDeleteVolumeId(volumeId);
  }

  function cancelDeleteVolume() {
    setConfirmingDeleteVolumeId(null);
    setFeedback(null);
  }

  function startDeleteMaterial(materialId: string) {
    setFeedback(null);
    setEditingMaterialId(null);
    setEditingVolumeId(null);
    setConfirmingDeleteVolumeId(null);
    setConfirmingDeleteMaterialId(materialId);
  }

  function cancelDeleteMaterial() {
    setConfirmingDeleteMaterialId(null);
    setFeedback(null);
  }

  async function handleSaveMaterial(materialId: string) {
    setFeedback(null);

    const normalizedTitle = editMaterialForm.title.trim();
    const normalizedDisplayOrder = editMaterialForm.displayOrder.trim();

    if (!normalizedTitle) {
      setFeedback({
        type: "error",
        message: "O título do material é obrigatório.",
        targetType: "material",
        targetId: materialId,
      });
      return;
    }

    if (!editMaterialForm.categoryId) {
      setFeedback({
        type: "error",
        message: "A categoria do material é obrigatória.",
        targetType: "material",
        targetId: materialId,
      });
      return;
    }

    if (normalizedDisplayOrder) {
      const parsedDisplayOrder = Number(normalizedDisplayOrder);

      if (!Number.isInteger(parsedDisplayOrder) || parsedDisplayOrder <= 0) {
        setFeedback({
          type: "error",
          message:
            "A posição do card deve ser um número inteiro maior que zero.",
          targetType: "material",
          targetId: materialId,
        });
        return;
      }
    }

    const payload = {
      title: normalizedTitle,
      description: editMaterialForm.description,
      categoryId: editMaterialForm.categoryId,
      displayOrder: normalizedDisplayOrder
        ? Number(normalizedDisplayOrder)
        : null,
    };

    try {
      setIsSavingMaterial(true);

      const response = await fetch(`/api/admin/materials/${materialId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result?.error || "Não foi possível atualizar o material.",
          targetType: "material",
          targetId: materialId,
        });
        return;
      }

      setFeedback({
        type: "success",
        message:
          result?.displayOrder
            ? `Material atualizado com sucesso. Nova posição: ${result.displayOrder}.`
            : "Material atualizado com sucesso.",
        targetType: "material",
        targetId: materialId,
      });

      setEditingMaterialId(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao salvar material:", error);

      setFeedback({
        type: "error",
        message: "Erro inesperado ao atualizar o material.",
        targetType: "material",
        targetId: materialId,
      });
    } finally {
      setIsSavingMaterial(false);
    }
  }

  async function handleSaveVolume(volumeId: string) {
    setFeedback(null);

    const normalizedTitle = editVolumeForm.title.trim();
    const normalizedDescription = editVolumeForm.description;
    const parsedVolumeNumber = Number(editVolumeForm.volumeNumber);

    if (!normalizedTitle) {
      setFeedback({
        type: "error",
        message: "O título do volume é obrigatório.",
        targetType: "volume",
        targetId: volumeId,
      });
      return;
    }

    if (!Number.isInteger(parsedVolumeNumber) || parsedVolumeNumber <= 0) {
      setFeedback({
        type: "error",
        message: "O número do volume deve ser um inteiro maior que zero.",
        targetType: "volume",
        targetId: volumeId,
      });
      return;
    }

    try {
      setIsSavingVolume(true);

      const response = await fetch(`/api/admin/volumes/${volumeId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: normalizedTitle,
          description: normalizedDescription,
          volumeNumber: parsedVolumeNumber,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result?.error || "Não foi possível atualizar o volume.",
          targetType: "volume",
          targetId: volumeId,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: "Volume atualizado com sucesso.",
        targetType: "volume",
        targetId: volumeId,
      });

      setEditingVolumeId(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao salvar volume:", error);

      setFeedback({
        type: "error",
        message: "Erro inesperado ao atualizar o volume.",
        targetType: "volume",
        targetId: volumeId,
      });
    } finally {
      setIsSavingVolume(false);
    }
  }

  async function handleDeleteVolume(volumeId: string) {
    setFeedback(null);

    try {
      setIsDeletingVolume(true);

      const response = await fetch(`/api/admin/volumes/${volumeId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result?.error || "Não foi possível excluir o volume.",
          targetType: "volume",
          targetId: volumeId,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result?.message || "Volume excluído com sucesso.",
        targetType: "volume",
        targetId: volumeId,
      });

      setConfirmingDeleteVolumeId(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao excluir volume:", error);

      setFeedback({
        type: "error",
        message: "Erro inesperado ao excluir o volume.",
        targetType: "volume",
        targetId: volumeId,
      });
    } finally {
      setIsDeletingVolume(false);
    }
  }

  async function handleDeleteMaterial(
    materialId: string,
    cascade: boolean = false
  ) {
    setFeedback(null);

    try {
      setIsDeletingMaterial(true);

      const url = cascade
        ? `/api/admin/materials/${materialId}?cascade=true`
        : `/api/admin/materials/${materialId}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        setFeedback({
          type: "error",
          message: result?.error || "Não foi possível excluir o material.",
          targetType: "material",
          targetId: materialId,
        });
        return;
      }

      setFeedback({
        type: "success",
        message: result?.message || "Material excluído com sucesso.",
        targetType: "material",
        targetId: materialId,
      });

      setConfirmingDeleteMaterialId(null);
      router.refresh();
    } catch (error) {
      console.error("Erro ao excluir material:", error);

      setFeedback({
        type: "error",
        message: "Erro inesperado ao excluir o material.",
        targetType: "material",
        targetId: materialId,
      });
    } finally {
      setIsDeletingMaterial(false);
    }
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-300">
            Gerenciamento
          </p>

          <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">Materiais cadastrados</h2>

          <p className="mt-4 text-zinc-400">
            Esta seção permite localizar obras, conferir sua estrutura e corrigir
            com segurança os dados principais do material, incluindo a posição do
            card dentro da categoria, sem tocar no PDF, no R2 ou no leitor
            público.
          </p>
        </div>

        <div className="w-full md:max-w-md">
          <label htmlFor="materials-search" className="sr-only">
            Buscar material
          </label>

          <input
            id="materials-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por título, categoria, posição ou volume"
            className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
          />
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {filteredMaterials.length > 0 ? (
          filteredMaterials.map((material) => {
            const isExpanded = expandedMaterialId === material.id;
            const isEditingMaterial = editingMaterialId === material.id;
            const hasVolumes = material.volumes.length > 0;
            const isConfirmingDeleteMaterial =
              confirmingDeleteMaterialId === material.id;

            const materialFeedback =
              feedback?.targetType === "material" &&
              feedback.targetId === material.id
                ? feedback
                : null;

            return (
              <article
                key={material.id}
                className="rounded-[28px] border border-white/10 bg-[#0b0f16]/82 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/15"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-amber-300">
                        {hasVolumes ? "Obra com volumes" : "Material simples"}
                      </span>

                      {material.category ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                          {material.category.name}
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-red-300">
                          Sem categoria
                        </span>
                      )}

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">
                        Posição{" "}
                        {typeof material.displayOrder === "number" &&
                        material.displayOrder > 0
                          ? material.displayOrder
                          : "final"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-semibold text-white">
                      {material.title}
                    </h3>

                    {material.description ? (
                      <p className="mt-3 text-sm leading-7 text-zinc-400">
                        {material.description}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">
                        Sem descrição cadastrada.
                      </p>
                    )}

                    <div className="mt-5 grid gap-3 md:grid-cols-5">
                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Views
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {material.views}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Volumes
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {material.volumes.length}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          PDF próprio
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {material.pdfUrl ? "Sim" : "Não"}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Estrutura
                        </p>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {hasVolumes ? "Volumeado" : "Direto em materials"}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Ordem
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          {typeof material.displayOrder === "number" &&
                          material.displayOrder > 0
                            ? material.displayOrder
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 lg:w-52">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMaterialId((current) =>
                          current === material.id ? null : material.id
                        )
                      }
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                      {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                    </button>

                    <button
                      type="button"
                      onClick={() => startEditingMaterial(material)}
                      className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15"
                    >
                      Editar material
                    </button>

                    <button
                      type="button"
                      onClick={() => startDeleteMaterial(material.id)}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
                    >
                      Excluir material
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          ID do material
                        </p>
                        <p className="mt-2 break-all text-sm text-zinc-300">
                          {material.id}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Slug da categoria
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">
                          {material.category?.slug ?? "Não disponível"}
                        </p>
                      </div>

                      <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          Posição atual
                        </p>
                        <p className="mt-2 text-sm text-zinc-300">
                          {typeof material.displayOrder === "number" &&
                          material.displayOrder > 0
                            ? material.displayOrder
                            : "Sem ordem definida"}
                        </p>
                      </div>
                    </div>

                    {materialFeedback ? (
                      <div
                        className={`mt-6 rounded-2xl border p-4 text-sm ${
                          materialFeedback.type === "success"
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/20 bg-red-500/10 text-red-300"
                        }`}
                      >
                        {materialFeedback.message}
                      </div>
                    ) : null}

                    {isEditingMaterial ? (
                      <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5">
                        <h4 className="text-lg font-semibold text-white">
                          Editar material
                        </h4>

                        <div className="mt-5 grid gap-4">
                          <div>
                            <label
                              htmlFor={`title-${material.id}`}
                              className="mb-2 block text-sm font-medium text-zinc-300"
                            >
                              Título
                            </label>
                            <input
                              id={`title-${material.id}`}
                              type="text"
                              value={editMaterialForm.title}
                              onChange={(event) =>
                                setEditMaterialForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`description-${material.id}`}
                              className="mb-2 block text-sm font-medium text-zinc-300"
                            >
                              Descrição
                            </label>
                            <textarea
                              id={`description-${material.id}`}
                              value={editMaterialForm.description}
                              onChange={(event) =>
                                setEditMaterialForm((current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              rows={5}
                              className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
                            />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <label
                                htmlFor={`category-${material.id}`}
                                className="mb-2 block text-sm font-medium text-zinc-300"
                              >
                                Categoria
                              </label>
                              <select
                                id={`category-${material.id}`}
                                value={editMaterialForm.categoryId}
                                onChange={(event) =>
                                  setEditMaterialForm((current) => ({
                                    ...current,
                                    categoryId: event.target.value,
                                  }))
                                }
                                className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
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
                                htmlFor={`display-order-${material.id}`}
                                className="mb-2 block text-sm font-medium text-zinc-300"
                              >
                                Posição do card na categoria
                              </label>
                              <input
                                id={`display-order-${material.id}`}
                                type="number"
                                min={1}
                                step={1}
                                value={editMaterialForm.displayOrder}
                                onChange={(event) =>
                                  setEditMaterialForm((current) => ({
                                    ...current,
                                    displayOrder: event.target.value,
                                  }))
                                }
                                className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
                                placeholder="Ex.: 2"
                              />
                              <p className="mt-2 text-xs text-zinc-500">
                                Se informar 2, este material ocupa a posição 2 e
                                os demais cards abaixo serão empurrados.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => handleSaveMaterial(material.id)}
                            disabled={isSavingMaterial}
                            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingMaterial
                              ? "Salvando..."
                              : "Salvar alterações"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditingMaterial}
                            disabled={isSavingMaterial}
                            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {isConfirmingDeleteMaterial ? (
                      <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
                        <h4 className="text-lg font-semibold text-white">
                          Confirmar exclusão do material
                        </h4>

                        {hasVolumes ? (
                          <p className="mt-3 text-sm leading-7 text-red-100/90">
                            Esta obra possui <strong>{material.volumes.length}</strong>{" "}
                            volume(s) vinculado(s). Ao confirmar a exclusão
                            completa, o sistema removerá a obra principal e todos
                            os volumes do banco de dados. Os arquivos físicos no
                            R2 não serão apagados nesta etapa.
                          </p>
                        ) : (
                          <p className="mt-3 text-sm leading-7 text-red-100/90">
                            Você está prestes a excluir este material. Nesta
                            etapa, a exclusão removerá apenas o registro do banco
                            de dados. O arquivo físico no R2 não será apagado
                            agora.
                          </p>
                        )}

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteMaterial(material.id, hasVolumes)
                            }
                            disabled={isDeletingMaterial}
                            className="rounded-2xl border border-red-500/20 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeletingMaterial
                              ? "Excluindo..."
                              : hasVolumes
                              ? "Confirmar exclusão completa"
                              : "Confirmar exclusão"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelDeleteMaterial}
                            disabled={isDeletingMaterial}
                            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {hasVolumes ? (
                      <div className="mt-6">
                        <h4 className="text-lg font-semibold text-white">
                          Volumes desta obra
                        </h4>

                        <div className="mt-4 space-y-3">
                          {material.volumes.map((volume) => {
                            const isEditingVolume = editingVolumeId === volume.id;
                            const isConfirmingDelete =
                              confirmingDeleteVolumeId === volume.id;

                            const volumeFeedback =
                              feedback?.targetType === "volume" &&
                              feedback.targetId === volume.id
                                ? feedback
                                : null;

                            return (
                              <div
                                key={volume.id}
                                className="rounded-[24px] border border-white/10 bg-zinc-950/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                      Volume {volume.volumeNumber} — {volume.title}
                                    </p>

                                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                                      Views: {volume.views}
                                    </p>

                                    <p className="mt-3 text-sm leading-7 text-zinc-400">
                                      {volume.description ||
                                        "Sem descrição cadastrada para este volume."}
                                    </p>
                                  </div>

                                  <div className="flex w-full flex-col gap-3 md:w-56">
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                                        ID do volume
                                      </p>
                                      <p className="mt-2 break-all text-sm text-zinc-400">
                                        {volume.id}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEditingVolume(material.id, volume)
                                      }
                                      className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15"
                                    >
                                      Editar volume
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => startDeleteVolume(volume.id)}
                                      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
                                    >
                                      Excluir volume
                                    </button>
                                  </div>
                                </div>

                                {volumeFeedback ? (
                                  <div
                                    className={`mt-4 rounded-2xl border p-4 text-sm ${
                                      volumeFeedback.type === "success"
                                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                        : "border-red-500/20 bg-red-500/10 text-red-300"
                                    }`}
                                  >
                                    {volumeFeedback.message}
                                  </div>
                                ) : null}

                                {isEditingVolume ? (
                                  <div className="mt-4 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5">
                                    <h5 className="text-base font-semibold text-white">
                                      Editar volume
                                    </h5>

                                    <div className="mt-5 grid gap-4">
                                      <div>
                                        <label
                                          htmlFor={`volume-title-${volume.id}`}
                                          className="mb-2 block text-sm font-medium text-zinc-300"
                                        >
                                          Título do volume
                                        </label>
                                        <input
                                          id={`volume-title-${volume.id}`}
                                          type="text"
                                          value={editVolumeForm.title}
                                          onChange={(event) =>
                                            setEditVolumeForm((current) => ({
                                              ...current,
                                              title: event.target.value,
                                            }))
                                          }
                                          className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
                                        />
                                      </div>

                                      <div>
                                        <label
                                          htmlFor={`volume-number-${volume.id}`}
                                          className="mb-2 block text-sm font-medium text-zinc-300"
                                        >
                                          Número do volume
                                        </label>
                                        <input
                                          id={`volume-number-${volume.id}`}
                                          type="number"
                                          min={1}
                                          step={1}
                                          value={editVolumeForm.volumeNumber}
                                          onChange={(event) =>
                                            setEditVolumeForm((current) => ({
                                              ...current,
                                              volumeNumber: event.target.value,
                                            }))
                                          }
                                          className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
                                        />
                                      </div>

                                      <div>
                                        <label
                                          htmlFor={`volume-description-${volume.id}`}
                                          className="mb-2 block text-sm font-medium text-zinc-300"
                                        >
                                          Descrição do volume
                                        </label>
                                        <textarea
                                          id={`volume-description-${volume.id}`}
                                          value={editVolumeForm.description}
                                          onChange={(event) =>
                                            setEditVolumeForm((current) => ({
                                              ...current,
                                              description: event.target.value,
                                            }))
                                          }
                                          rows={4}
                                          className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
                                        />
                                      </div>
                                    </div>

                                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveVolume(volume.id)}
                                        disabled={isSavingVolume}
                                        className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isSavingVolume
                                          ? "Salvando..."
                                          : "Salvar volume"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={cancelEditingVolume}
                                        disabled={isSavingVolume}
                                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : null}

                                {isConfirmingDelete ? (
                                  <div className="mt-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
                                    <h5 className="text-base font-semibold text-white">
                                      Confirmar exclusão do volume
                                    </h5>

                                    <p className="mt-3 text-sm leading-7 text-red-100/90">
                                      Você está prestes a excluir este volume do
                                      banco de dados. O arquivo físico no R2 não
                                      será apagado nesta etapa.
                                    </p>

                                    <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVolume(volume.id)}
                                        disabled={isDeletingVolume}
                                        className="rounded-2xl border border-red-500/20 bg-red-500/20 px-5 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isDeletingVolume
                                          ? "Excluindo..."
                                          : "Confirmar exclusão do volume"}
                                      </button>

                                      <button
                                        type="button"
                                        onClick={cancelDeleteVolume}
                                        disabled={isDeletingVolume}
                                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-400">
                        Este material não possui volumes vinculados.
                      </div>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-[#0b0f16]/82 p-8 text-center text-zinc-400">
            Nenhum material encontrado para a busca informada.
          </div>
        )}
      </div>
    </section>
  );
}
