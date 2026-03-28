"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PdfCoverPreview from "@/app/components/pdf-cover-preview";
import MaterialVolumesSection from "@/app/components/material-volumes-section";

type MaterialCategory = {
  name: string;
  slug: string | null;
};

type MaterialComCategoriaRaw = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  categories: MaterialCategory[] | null;
};

type MaterialComCategoria = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  category: MaterialCategory | null;
};

type MaterialVolume = {
  id: string;
  material_id: string;
  title: string;
  volume_number: number | null;
  pdf_url: string;
  description: string | null;
};

function normalizeCategoryPath(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCategoryHref(category: MaterialCategory | null) {
  if (!category) {
    return "/categorias";
  }

  if (category.slug && category.slug.trim()) {
    return `/categoria/${normalizeCategoryPath(category.slug)}`;
  }

  return `/categoria/${normalizeCategoryPath(category.name)}`;
}

export default function MaterialPage() {
  const [material, setMaterial] = useState<MaterialComCategoria | null>(null);
  const [volumes, setVolumes] = useState<MaterialVolume[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVolumesOpen, setIsVolumesOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const path = window.location.pathname;
      const slug = path.split("/").pop();

      if (!slug) {
        setLoading(false);
        return;
      }

      const { data: materialData, error: materialError } = await supabase
        .from("materials")
        .select(`
          id,
          title,
          description,
          pdf_url,
          categories (
            name,
            slug
          )
        `)
        .eq("id", slug)
        .single();

      if (materialError || !materialData) {
        setLoading(false);
        return;
      }

      const rawMaterial = materialData as MaterialComCategoriaRaw;

      const normalizedMaterial: MaterialComCategoria = {
        id: rawMaterial.id,
        title: rawMaterial.title,
        description: rawMaterial.description,
        pdf_url: rawMaterial.pdf_url,
        category:
          Array.isArray(rawMaterial.categories) && rawMaterial.categories.length > 0
            ? rawMaterial.categories[0]
            : null,
      };

      setMaterial(normalizedMaterial);

      const { data: volumesData, error: volumesError } = await supabase
        .from("material_volumes")
        .select("id, material_id, title, volume_number, pdf_url, description")
        .eq("material_id", normalizedMaterial.id)
        .order("volume_number", { ascending: true })
        .order("title", { ascending: true });

      if (!volumesError && volumesData) {
        setVolumes(volumesData as MaterialVolume[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  const hasVolumes = volumes.length > 0;

  const previewUrl = useMemo(() => {
    if (!material) return null;

    if (hasVolumes && volumes[0]?.id) {
      return `/api/files/view?kind=volume&id=${volumes[0].id}`;
    }

    if (material.pdf_url) {
      return `/api/files/view?kind=material&id=${material.id}`;
    }

    return null;
  }, [material, hasVolumes, volumes]);

  const backHref = getCategoryHref(material?.category ?? null);

  const handleToggleVolumes = () => {
    if (!hasVolumes) return;

    setIsVolumesOpen((prev) => {
      const next = !prev;

      if (next) {
        requestAnimationFrame(() => {
          const el = document.getElementById("volumes");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }

      return next;
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="text-zinc-400">Carregando material...</p>
        </div>
      </main>
    );
  }

  if (!material) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Material não encontrado</h1>
          <p className="mt-4 text-zinc-400">
            O material que você tentou acessar não existe.
          </p>
          <Link
            href="/categorias"
            className="mt-6 inline-block rounded-full bg-amber-400 px-6 py-3 font-semibold text-black"
          >
            Voltar para categorias
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href={backHref}
          className="mb-8 inline-block text-sm font-medium text-amber-400 hover:text-amber-300"
        >
          ← Voltar para a categoria
        </Link>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8 lg:p-10">
          <div className="grid items-start gap-10 lg:grid-cols-[360px_1fr] lg:gap-12">
            <div className="mx-auto w-full max-w-[360px] lg:mx-0">
              {previewUrl ? (
                <PdfCoverPreview fileUrl={previewUrl} />
              ) : (
                <div className="flex min-h-[460px] items-center justify-center bg-[#11111a] text-sm text-zinc-400">
                  Prévia indisponível
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
                {material.category?.name || "Acervo Logos"}
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                {material.title}
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-zinc-300">
                {material.description || "Sem descrição cadastrada."}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {hasVolumes ? (
                  <button
                    type="button"
                    onClick={handleToggleVolumes}
                    className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:scale-[1.02]"
                  >
                    {isVolumesOpen
                      ? `Ocultar volumes (${volumes.length})`
                      : `Ver volumes (${volumes.length})`}
                  </button>
                ) : material.pdf_url ? (
                  <Link
                    href={`/ler/${material.id}`}
                    className="rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:scale-[1.02]"
                  >
                    Ler agora
                  </Link>
                ) : null}

                <Link
                  href={backHref}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Voltar para a categoria
                </Link>
              </div>
            </div>
          </div>
        </section>

        {hasVolumes ? (
          <div id="volumes">
            <MaterialVolumesSection
              volumes={volumes}
              isOpen={isVolumesOpen}
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}