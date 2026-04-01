import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { logoutAction } from "./login/actions";
import MaterialUploadForm from "./material-upload-form";
import MaterialWithVolumesForm from "./material-with-volumes-form";
import AddVolumeExistingForm from "./add-volume-existing-form";
import MaterialsManager from "./materials-manager";
import SubscriptionsManager from "./subscriptions-manager";

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

type UserProfileRow = {
  id: string;
  full_name: string | null;
  access_expires_at: string | null;
  subscription_status: string | null;
  payment_status: string | null;
  created_at: string | null;
};

type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  const isAdmin =
    !!user?.email &&
    !!adminEmail &&
    user.email.toLowerCase() === adminEmail;

  if (!isAdmin) {
    redirect("/admin/login");
  }

  const adminSupabase = createAdminClient();

  const [
    { count: materialsCount },
    { count: volumesCount },
    { data: categoriesData },
    { data: materialsData },
    { data: materialsManagerData },
    { data: volumesManagerData },
    { data: profilesData, error: profilesError },
    authUsersResponse,
  ] = await Promise.all([
    supabase.from("materials").select("*", { head: true, count: "exact" }),
    supabase
      .from("material_volumes")
      .select("*", { head: true, count: "exact" }),
    supabase.from("categories").select("id, name, slug").order("name"),
    supabase.from("materials").select("id, title").order("title"),
    supabase
      .from("materials")
      .select(
        "id, title, description, pdf_url, category_id, views, display_order"
      )
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true }),
    supabase
      .from("material_volumes")
      .select(
        "id, material_id, title, volume_number, pdf_url, description, views"
      )
      .order("volume_number", { ascending: true }),
    adminSupabase
      .from("user_profiles")
      .select(
        "id, full_name, access_expires_at, subscription_status, payment_status, created_at"
      )
      .order("created_at", { ascending: false }),
    adminSupabase.auth.admin.listUsers(),
  ]);

  if (profilesError) {
    console.error("Erro ao buscar user_profiles no admin:", profilesError);
  }

  const categories = (categoriesData ?? []) as Category[];
  const materials = (materialsData ?? []) as Material[];
  const materialsRows = (materialsManagerData ?? []) as MaterialRow[];
  const volumesRows = (volumesManagerData ?? []) as VolumeRow[];
  const profileRows = (profilesData ?? []) as UserProfileRow[];
  const authUsers = (authUsersResponse.data?.users ?? []) as AuthUser[];

  const categoryMap = new Map<string, Category>(
    categories.map((category) => [category.id, category])
  );

  const profileMap = new Map<string, UserProfileRow>(
    profileRows.map((profile) => [profile.id, profile])
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

  const subscriptionUsers = authUsers.map((authUser) => {
    const profile = profileMap.get(authUser.id);

    return {
      id: authUser.id,
      email: authUser.email ?? "E-mail não informado",
      fullName: profile?.full_name ?? null,
      accessExpiresAt: profile?.access_expires_at ?? null,
      subscriptionStatus: profile?.subscription_status ?? null,
      paymentStatus: profile?.payment_status ?? null,
      createdAt: profile?.created_at ?? authUser.created_at ?? null,
    };
  });

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
              Área administrativa do sistema.
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

        <section className="mt-10 grid gap-6 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Materiais</p>
            <p className="mt-3 text-4xl font-bold">{materialsCount ?? 0}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Volumes</p>
            <p className="mt-3 text-4xl font-bold">{volumesCount ?? 0}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Usuários</p>
            <p className="mt-3 text-4xl font-bold">
              {subscriptionUsers.length}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm text-zinc-400">Admin</p>
            <p className="mt-3 text-sm break-all">{user?.email}</p>
          </div>
        </section>

        <SubscriptionsManager users={subscriptionUsers} />

        <MaterialUploadForm categories={categories} />
        <MaterialWithVolumesForm categories={categories} />
        <AddVolumeExistingForm materials={materials} />
        <MaterialsManager
          materials={managedMaterials}
          categories={categories}
        />
      </div>
    </main>
  );
}