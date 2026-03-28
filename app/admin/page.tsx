import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { logoutAction } from "./login/actions";
import MaterialUploadForm from "./material-upload-form";
import MaterialWithVolumesForm from "./material-with-volumes-form";
import AddVolumeExistingForm from "./add-volume-existing-form";
import MaterialsManager from "./materials-manager";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Material = {
  id: string;
  title: string;
};

type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  pdf_url: string | null;
  category_id: string | null;
  views: number | null;
  display_order: number | null;
};

type VolumeRow = {
  id: string;
  material_id: string;
  title: string;
  volume_number: number | null;
  pdf_url: string;
  description: string | null;
  views: number | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  const isAdmin =
    !!user?.email && !!adminEmail && user.email.toLowerCase() === adminEmail;

  if (!isAdmin) {
    redirect("/admin/login");
  }

  const [
    { count: materialsCount },
    { count: volumesCount },
    { data: categoriesData },
    { data: materialsData },
    { data: materialsManagerData },
    { data: volumesManagerData },
  ] = await Promise.all([
    supabase.from("materials").select("*", { head: true, count: "exact" }),
    supabase
      .from("material_volumes")
      .select("*", { head: true, count: "exact" }),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("materials").select("id, title").order("title"),
    supabase
      .from("materials")
      .select("id, title, description, pdf_url, category_id, views, display_order")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true }),
    supabase
      .from("material_volumes")
      .select("id, material_id, title, volume_number, pdf_url, description, views")
      .order("volume_number", { ascending: true }),
  ]);

  const categories = (categoriesData ?? []) as Category[];
  const materials = (materialsData ?? []) as Material[];
  const materialsRows = (materialsManagerData ?? []) as MaterialRow[];
  const volumesRows = (volumesManagerData ?? []) as VolumeRow[];

  const categoryMap = new Map<string, Category>(
    categories.map((category) => [category.id, category])
  );

  const managedMaterials = materialsRows.map((material) => ({
    id: material.id,
    title: material.title,
    description: material.description,
    pdfUrl: material.pdf_url,
    views: material.views ?? 0,
    displayOrder: material.display_order,
    category: material.category_id
      ? categoryMap.get(material.category_id) ?? null
      : null,
    volumes: volumesRows
      .filter((volume) => volume.material_id === material.id)
      .map((volume) => ({
        id: volume.id,
        materialId: volume.material_id,
        title: volume.title,
        volumeNumber: volume.volume_number ?? 0,
        description: volume.description,
        views: volume.views ?? 0,
      })),
  }));

  return (
    <main className="min-h-screen bg-[#05060a] px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-amber-400">
              Painel administrativo
            </p>

            <h1 className="mt-3 text-4xl font-bold">Acervo Logos</h1>

            <p className="mt-4 max-w-2xl text-zinc-400">
              Área reservada para gerenciamento do acervo. Aqui você pode
              publicar materiais simples, obras com múltiplos volumes e também
              adicionar novos volumes a obras já existentes, sem precisar entrar
              manualmente no Cloudflare R2 ou no Supabase.
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Sair
            </button>
          </form>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Materiais</p>
            <p className="mt-3 text-4xl font-bold">{materialsCount ?? 0}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Volumes</p>
            <p className="mt-3 text-4xl font-bold">{volumesCount ?? 0}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Administrador</p>
            <p className="mt-3 break-all text-sm text-zinc-200">
              {user?.email}
            </p>
          </div>
        </section>

        <MaterialUploadForm categories={categories} />

        <MaterialWithVolumesForm categories={categories} />

        <AddVolumeExistingForm materials={materials} />

        <MaterialsManager
          materials={managedMaterials}
          categories={categories}
        />

        <section className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-2xl font-bold">Categorias cadastradas</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.length > 0 ? (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-semibold text-white">{category.name}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.25em] text-zinc-500">
                    {category.slug}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-zinc-400">Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}