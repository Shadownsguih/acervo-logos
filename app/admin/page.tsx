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

function AdminSectionShell({
  eyebrow,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0d1017]/88 shadow-[0_30px_100px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/35 to-transparent" />

      <summary className="list-none cursor-pointer border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,191,36,0.08),rgba(255,255,255,0.02)_38%,rgba(17,24,39,0.18))] px-6 py-6 md:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-amber-300">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300 md:text-base">
              {description}
            </p>
          </div>

          <div className="mt-1 inline-flex min-w-[8.5rem] items-center justify-center rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200 transition group-open:border-amber-300/30 group-open:bg-amber-300/10 group-open:text-amber-100">
            <span className="group-open:hidden">Expandir</span>
            <span className="hidden group-open:inline">Recolher</span>
          </div>
        </div>
      </summary>

      <div className="px-1 pb-1">{children}</div>
    </details>
  );
}

function AdminSubsectionShell({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[30px] border border-white/10 bg-black/20"
    >
      <summary className="list-none cursor-pointer px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-xl">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {description}
            </p>
          </div>

          <div className="mt-1 inline-flex min-w-[7.5rem] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-200 transition group-open:border-amber-300/30 group-open:bg-amber-300/10 group-open:text-amber-100">
            <span className="group-open:hidden">Expandir</span>
            <span className="hidden group-open:inline">Recolher</span>
          </div>
        </div>
      </summary>

      <div className="px-1 pb-1">{children}</div>
    </details>
  );
}

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
      email: authUser.email ?? "E-mail nao informado",
      fullName: profile?.full_name ?? null,
      accessExpiresAt: profile?.access_expires_at ?? null,
      subscriptionStatus: profile?.subscription_status ?? null,
      paymentStatus: profile?.payment_status ?? null,
      createdAt: profile?.created_at ?? authUser.created_at ?? null,
    };
  });

  const overviewCards = [
    {
      label: "Materiais",
      value: materialsCount ?? 0,
      tone:
        "border-white/10 bg-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    },
    {
      label: "Volumes",
      value: volumesCount ?? 0,
      tone:
        "border-sky-400/20 bg-sky-400/10 text-white shadow-[0_18px_40px_-28px_rgba(56,189,248,0.9)]",
    },
    {
      label: "Usuarios",
      value: subscriptionUsers.length,
      tone:
        "border-emerald-400/20 bg-emerald-400/10 text-white shadow-[0_18px_40px_-28px_rgba(16,185,129,0.9)]",
    },
    {
      label: "Categorias",
      value: categories.length,
      tone:
        "border-amber-300/20 bg-amber-300/10 text-white shadow-[0_18px_40px_-28px_rgba(251,191,36,0.9)]",
    },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_18%),linear-gradient(180deg,#05060a_0%,#090b12_45%,#05060a_100%)] px-4 py-6 text-white md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(251,191,36,0.12),rgba(255,255,255,0.04)_35%,rgba(15,23,42,0.78))] p-6 shadow-[0_40px_120px_-56px_rgba(0,0,0,0.95)] md:p-8 lg:p-10">
          <div className="absolute -left-20 top-0 h-52 w-52 rounded-full bg-amber-300/10 blur-3xl" />
          <div className="absolute right-0 top-10 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-amber-300">
                Painel administrativo
              </p>

              <h1 className="mt-4 text-3xl font-bold leading-tight text-white md:text-5xl">
                Centro de controle do Acervo Logos
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-200 md:text-base">
                Um unico lugar para acompanhar o acervo, liberar acessos,
                organizar materiais e manter a biblioteca em ordem sem tocar na
                logica que ja esta funcionando.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-zinc-300">
                  Ambiente interno
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-200">
                  Sessao ativa
                </div>
              </div>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.28em] text-zinc-500">
                  Administrador
                </p>
                <p className="mt-3 break-all text-base font-semibold text-white">
                  {user?.email}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Este acesso possui permissao total para gerenciar acervo,
                  volumes e assinaturas.
                </p>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Encerrar sessao
                </button>
              </form>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <article
              key={card.label}
              className={`rounded-[28px] border p-5 ${card.tone}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-300/90">
                {card.label}
              </p>
              <p className="mt-4 text-4xl font-bold">{card.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[32px] border border-white/10 bg-[#0b0d13]/90 p-5 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.95)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-300">
              Fluxo recomendado
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">1. Assinaturas</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Libere, bloqueie e acompanhe vencimentos sem sair do painel.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">2. Cadastro</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Adicione materiais simples, obras com volumes e novos PDFs ao
                  acervo.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">3. Revisao</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Ajuste ordem, categoria, titulos e estrutura da biblioteca com
                  mais clareza.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#0b0d13]/90 p-5 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.95)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-300">
              Resumo rapido
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Materiais por categoria
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {categories.length} categoria(s) disponivel(is)
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Estrutura do acervo
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {materialsCount ?? 0} material(is) e {volumesCount ?? 0} volume(s)
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  Acesso de usuarios
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {subscriptionUsers.length} conta(s) monitorada(s)
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-6">
          <AdminSectionShell
            eyebrow="Acessos"
            title="Gestao de assinaturas"
            description="Monitore o vencimento das contas, renove acessos em poucos cliques e identifique rapidamente quem precisa de atencao."
            defaultOpen
          >
            <SubscriptionsManager users={subscriptionUsers} />
          </AdminSectionShell>

          <AdminSectionShell
            eyebrow="Cadastro"
            title="Entrada de novos materiais"
            description="Organize o cadastro do acervo em etapas mais claras: material simples, obra com volumes e inclusao de volume em material existente."
          >
            <div className="grid gap-6 p-5 md:p-6 xl:grid-cols-3">
              <AdminSubsectionShell
                title="Material simples"
                description="Cadastro direto para obras com um unico PDF."
                defaultOpen
              >
                <MaterialUploadForm categories={categories} />
              </AdminSubsectionShell>
              <AdminSubsectionShell
                title="Material com volumes"
                description="Crie a obra principal e publique todos os volumes na mesma etapa."
              >
                <MaterialWithVolumesForm categories={categories} />
              </AdminSubsectionShell>
              <AdminSubsectionShell
                title="Adicionar volume existente"
                description="Inclua um novo volume em uma obra que ja esta cadastrada."
              >
                <AddVolumeExistingForm materials={materials} />
              </AdminSubsectionShell>
            </div>
          </AdminSectionShell>

          <AdminSectionShell
            eyebrow="Acervo"
            title="Organizacao e manutencao"
            description="Revise obras cadastradas, encontre materiais com mais facilidade e corrija titulos, categorias, volumes e ordem de exibicao sem alterar a parte funcional."
          >
            <MaterialsManager
              materials={managedMaterials}
              categories={categories}
            />
          </AdminSectionShell>
        </div>
      </div>
    </main>
  );
}
