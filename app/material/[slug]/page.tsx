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

function getCategoryAccent(categoryName: string | undefined) {
  const normalized = normalizeCategoryPath(categoryName || "");

  if (normalized.includes("biblia")) {
    return {
      heroGlow: "bg-amber-300/10",
      badge: "Bíblias",
    };
  }

  if (normalized.includes("comentario")) {
    return {
      heroGlow: "bg-blue-300/10",
      badge: "Comentários",
    };
  }

  if (normalized.includes("dicionario")) {
    return {
      heroGlow: "bg-emerald-300/10",
      badge: "Consulta",
    };
  }

  return {
    heroGlow: "bg-violet-300/10",
    badge: "Acervo",
  };
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
  const accent = getCategoryAccent(material?.category?.name);

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
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <p className="text-zinc-400">Carregando material...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!material) {
    return (
      <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 text-white sm:px-6 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 sm:p-8">
            <h1 className="text-3xl font-bold">Material não encontrado</h1>
            <p className="mt-4 text-zinc-400">
              O material que você tentou acessar não existe.
            </p>
            <Link
              href="/categorias"
              className="mt-6 inline-flex rounded-full bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              Voltar para categorias
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:bg-white/10"
        >
          <span>←</span>
          <span>Voltar para a categoria</span>
        </Link>

        <section className="relative mt-4 overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(13,17,28,0.96),rgba(17,24,39,0.94))] px-4 py-5 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.9)] sm:mt-5 sm:rounded-[32px] sm:px-7 sm:py-7">
          <div
            className={`pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full blur-3xl ${accent.heroGlow}`}
          />
          <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-20 rounded-full bg-blue-400/10 blur-3xl" />

          <div className="relative">
            <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-10">
              <div className="mx-auto w-full max-w-[340px] lg:mx-0">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] p-3 shadow-[0_18px_45px_-25px_rgba(0,0,0,0.85)] sm:p-4">
                  {previewUrl ? (
                    <PdfCoverPreview fileUrl={previewUrl} />
                  ) : (
                    <div className="flex min-h-[420px] items-center justify-center rounded-[18px] bg-[#11111a] px-6 text-center text-sm text-zinc-400">
                      Prévia indisponível
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 sm:text-[11px]">
                    {material.category?.name || accent.badge}
                  </span>

                  <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300 sm:text-[11px]">
                    {hasVolumes ? `${volumes.length} volumes` : "PDF principal"}
                  </span>
                </div>

                <h1 className="mt-4 text-[1.9rem] font-bold leading-tight text-white sm:text-4xl md:text-5xl">
                  {material.title}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                  {material.description || "Sem descrição cadastrada."}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Formato
                    </p>
                    <p className="mt-2 text-sm font-medium text-white sm:text-base">
                      {hasVolumes ? "Coleção com volumes" : "Leitura direta em PDF"}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Acesso
                    </p>
                    <p className="mt-2 text-sm font-medium text-white sm:text-base">
                      {hasVolumes ? "Abra e escolha o volume" : "Pronto para leitura"}
                    </p>
                  </div>
                </div>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  {hasVolumes ? (
                    <button
                      type="button"
                      onClick={handleToggleVolumes}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:text-base"
                    >
                      {isVolumesOpen
                        ? `Ocultar volumes (${volumes.length})`
                        : `Ver volumes (${volumes.length})`}
                    </button>
                  ) : material.pdf_url ? (
                    <Link
                      href={`/ler/${material.id}`}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:text-base"
                    >
                      Ler agora
                    </Link>
                  ) : null}

                  <Link
                    href={backHref}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:text-base"
                  >
                    Voltar para a categoria
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {hasVolumes ? (
          <div id="volumes" className="mt-6">
            <MaterialVolumesSection volumes={volumes} isOpen={isVolumesOpen} />
          </div>
        ) : null}
      </div>
    </main>
  );
}