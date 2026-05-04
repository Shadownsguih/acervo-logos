import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { updateUserProfileAction } from "./actions";
import ProfileAvatarSection from "@/app/components/profile-avatar-section";
import ProfileRecentReadingSection from "@/app/components/profile-recent-reading-section";
import AccountSecuritySection from "@/app/components/account-security-section";
import ProfileSectionAnchor from "@/app/components/profile-section-anchor";

type PerfilPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};

type StudyNote = {
  id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
};

type FavoriteMaterialCategory = {
  name: string;
  slug: string | null;
};

type FavoriteMaterialRaw = {
  created_at: string;
  material_id: string;
  materials:
    | {
        id: string;
        title: string;
        description: string | null;
        pdf_url: string | null;
        categories: FavoriteMaterialCategory[] | FavoriteMaterialCategory | null;
      }
    | Array<{
        id: string;
        title: string;
        description: string | null;
        pdf_url: string | null;
        categories: FavoriteMaterialCategory[] | FavoriteMaterialCategory | null;
      }>
    | null;
};

type FavoriteMaterial = {
  created_at: string;
  material: {
    id: string;
    title: string;
    description: string | null;
    pdf_url: string | null;
    category: FavoriteMaterialCategory | null;
  } | null;
};

function getStatusMessage(status?: string) {
  if (status === "salvo") {
    return {
      type: "success" as const,
      text: "Perfil atualizado com sucesso.",
    };
  }

  if (status === "erro") {
    return {
      type: "error" as const,
      text: "Nao foi possivel salvar o perfil.",
    };
  }

  return null;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getNotePreview(content: string | null) {
  const normalized = String(content ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Sem conteudo ainda.";
  }

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 180).trim()}...`;
}

function getMaterialPreview(description: string | null) {
  const normalized = String(description ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Sem descricao cadastrada ainda.";
  }

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 180).trim()}...`;
}

function normalizeCategoryPath(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCategoryHref(category: FavoriteMaterialCategory | null) {
  if (!category) {
    return "/categorias";
  }

  if (category.slug && category.slug.trim()) {
    return `/categoria/${normalizeCategoryPath(category.slug)}`;
  }

  return `/categoria/${normalizeCategoryPath(category.name)}`;
}

function normalizeFavoriteMaterial(
  item: FavoriteMaterialRaw
): FavoriteMaterial | null {
  const materialSource = Array.isArray(item.materials)
    ? item.materials[0] ?? null
    : item.materials;

  if (!materialSource) {
    return null;
  }

  const categorySource = Array.isArray(materialSource.categories)
    ? materialSource.categories[0] ?? null
    : materialSource.categories;

  return {
    created_at: item.created_at,
    material: {
      id: materialSource.id,
      title: materialSource.title,
      description: materialSource.description,
      pdf_url: materialSource.pdf_url,
      category: categorySource
        ? {
            name: categorySource.name,
            slug: categorySource.slug,
          }
        : null,
    },
  };
}

export default async function PerfilPage({ searchParams }: PerfilPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?erro=login&next=/perfil");
  }

  const adminSupabase = createAdminClient();

  const [{ data: profile }, { data: notesData }, { data: favoritesData }] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name, bio, location, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("study_notes")
        .select("id, title, content, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      adminSupabase
        .from("material_favorites")
        .select(
          `
            created_at,
            material_id,
            materials (
              id,
              title,
              description,
              pdf_url,
              categories (
                name,
                slug
              )
            )
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const notes = (notesData ?? []) as StudyNote[];
  const favorites = ((favoritesData ?? []) as FavoriteMaterialRaw[])
    .map(normalizeFavoriteMaterial)
    .filter((item): item is FavoriteMaterial => item !== null);

  const resolvedSearchParams = await searchParams;
  const statusMessage = getStatusMessage(resolvedSearchParams.status);

  const initialFullName =
    profile?.full_name ??
    String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();

  const initialBio = profile?.bio ?? "";
  const initialLocation = profile?.location ?? "";
  const initialAvatarUrl = profile?.avatar_url ?? null;
  const displayName =
    initialFullName || user.email || "Usuario do Acervo Logos";

  const editProfileSection = (
    <section className="p-1 text-[#1f2430] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-8 md:text-white md:shadow-none">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-[#93a0b8] md:text-amber-400">
          Dados basicos
        </p>
        <h2 className="mt-2 text-xl font-bold text-[#16213b] md:text-2xl md:text-white">
          Editar perfil
        </h2>
      </div>

      {statusMessage ? (
        <div
          className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
            statusMessage.type === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/20 bg-red-400/10 text-red-300"
          }`}
        >
          {statusMessage.text}
        </div>
      ) : null}

      <form action={updateUserProfileAction} className="mt-6 space-y-6">
        <div>
          <label
            htmlFor="full_name"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Nome
          </label>

          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={initialFullName}
            maxLength={120}
            placeholder="Digite seu nome"
            className="w-full rounded-none border-0 border-b border-[#d5dbea] bg-transparent px-0 py-3 text-sm text-[#16213b] outline-none transition placeholder:text-[#9aa3b8] focus:border-[#16213b] md:rounded-2xl md:border md:border-white/10 md:bg-[#12151d] md:px-4 md:text-white md:placeholder:text-zinc-500 md:focus:border-amber-400/60"
          />
        </div>

        <div>
          <label
            htmlFor="bio"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Biografia curta
          </label>

          <textarea
            id="bio"
            name="bio"
            defaultValue={initialBio}
            maxLength={500}
            rows={5}
            placeholder="Fale um pouco sobre voce ou sobre seu foco de estudo."
            className="w-full rounded-none border-0 border-b border-[#d5dbea] bg-transparent px-0 py-3 text-sm leading-6 text-[#16213b] outline-none transition placeholder:text-[#9aa3b8] focus:border-[#16213b] md:rounded-2xl md:border md:border-white/10 md:bg-[#12151d] md:px-4 md:text-white md:placeholder:text-zinc-500 md:focus:border-amber-400/60"
          />
        </div>

        <div>
          <label
            htmlFor="location"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Sua cidade
          </label>

          <input
            id="location"
            name="location"
            type="text"
            defaultValue={initialLocation}
            maxLength={120}
            placeholder="Ex.: Macarani - BA"
            className="w-full rounded-none border-0 border-b border-[#d5dbea] bg-transparent px-0 py-3 text-sm text-[#16213b] outline-none transition placeholder:text-[#9aa3b8] focus:border-[#16213b] md:rounded-2xl md:border md:border-white/10 md:bg-[#12151d] md:px-4 md:text-white md:placeholder:text-zinc-500 md:focus:border-amber-400/60"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="submit"
            className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
          >
            Salvar perfil
          </button>
        </div>
      </form>
    </section>
  );

  const favoritesSection = (
    <ProfileSectionAnchor
      id="favoritos-salvos"
      openDetailsSelector="details"
      className="text-white md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-8 md:shadow-none"
    >
      <div className="md:hidden">
        {favorites.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#131722] p-5 text-sm leading-7 text-zinc-400">
            Voce ainda nao possui materiais favoritos. Quando usar o botao de
            favoritar dentro de um material, ele aparecera aqui.
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((favorite) =>
              favorite.material ? (
                <article
                  key={`${favorite.material.id}:${favorite.created_at}:mobile`}
                  className="rounded-[22px] border border-white/8 bg-[#131722] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
                        {favorite.material.category?.name ?? "Categorias"}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-white">
                        {favorite.material.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {getMaterialPreview(favorite.material.description)}
                      </p>
                      <p className="mt-3 text-[11px] text-zinc-500">
                        {formatDate(favorite.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/material/${favorite.material.id}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
                    >
                      Abrir material
                    </Link>

                    {favorite.material.pdf_url ? (
                      <Link
                        href={`/ler/${favorite.material.id}`}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                      >
                        Ler agora
                      </Link>
                    ) : null}
                  </div>
                </article>
              ) : null
            )}
          </div>
        )}
      </div>

      <div className="hidden flex-col gap-4 md:flex md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
            Meus favoritos
          </p>
          <h2 className="mt-2 text-xl font-bold md:text-2xl">
            Materiais salvos para ler depois
          </h2>
        </div>

        <div className="hidden w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:block md:w-auto">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Total de favoritos
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {favorites.length}
          </p>
        </div>
      </div>

      <details className="group mt-5 hidden md:block md:mt-6 md:rounded-3xl md:border md:border-white/10 md:bg-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-white marker:hidden">
          <span>Mostrar materiais favoritos</span>
          <span aria-hidden="true" className="transition group-open:rotate-180">
            â–¼
          </span>
        </summary>

        <div className="border-t border-white/10 px-5 py-5">
          {favorites.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#131722] p-6 text-sm text-zinc-400 md:bg-[#12151d]">
              Voce ainda nao possui materiais favoritos. Quando usar o botao de
              favoritar dentro de um material, ele aparecera aqui.
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((favorite) =>
                favorite.material ? (
                  <article
                    key={`${favorite.material.id}:${favorite.created_at}`}
                    className="rounded-3xl bg-[#131722] p-5 transition hover:bg-white/[0.04] md:border md:border-white/10 md:bg-[#12151d]"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                            Favorito
                          </span>

                          <Link
                            href={getCategoryHref(favorite.material.category)}
                            className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/10"
                          >
                            {favorite.material.category?.name ?? "Categorias"}
                          </Link>
                        </div>

                        <h3 className="mt-4 truncate text-base font-semibold text-white md:text-lg">
                          {favorite.material.title}
                        </h3>

                        <p className="mt-3 text-sm leading-7 text-zinc-400">
                          {getMaterialPreview(favorite.material.description)}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Link
                            href={`/material/${favorite.material.id}`}
                            className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
                          >
                            Abrir material
                          </Link>

                          {favorite.material.pdf_url ? (
                            <Link
                              href={`/ler/${favorite.material.id}`}
                              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                              Ler agora
                            </Link>
                          ) : null}
                        </div>
                      </div>

                      <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:block">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                          Favoritado em
                        </p>
                        <p className="mt-2 text-xs text-zinc-300">
                          {formatDate(favorite.created_at)}
                        </p>
                      </div>
                    </div>
                  </article>
                ) : null
              )}
            </div>
          )}
        </div>
      </details>
    </ProfileSectionAnchor>
  );

  const notesSection = (
    <ProfileSectionAnchor
      id="notas-salvas"
      openDetailsSelector="details"
      className="text-white md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-8 md:shadow-none"
    >
      <div className="md:hidden">
        {notes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-[#131722] p-5 text-sm leading-7 text-zinc-400">
            Voce ainda nao possui notas salvas. Quando criar anotacoes no
            bloco de notas do leitor, elas aparecerao aqui.
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <article
                key={`${note.id}:mobile`}
                className="rounded-[22px] border border-white/8 bg-[#131722] p-4"
              >
                <h3 className="text-base font-semibold text-white">
                  {note.title?.trim() || "Nova nota"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {getNotePreview(note.content)}
                </p>
                <p className="mt-3 text-[11px] text-zinc-500">
                  {formatDate(note.updated_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="hidden flex-col gap-4 md:flex md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
            Minhas notas
          </p>
          <h2 className="mt-2 text-xl font-bold md:text-2xl">
            Todas as notas salvas
          </h2>
        </div>

        <div className="hidden w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:block md:w-auto">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Total de notas
          </p>
          <p className="mt-2 text-2xl font-bold text-white">{notes.length}</p>
        </div>
      </div>

      <details className="group mt-5 hidden md:block md:mt-6 md:rounded-3xl md:border md:border-white/10 md:bg-black/20">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-white marker:hidden">
          <span>Mostrar notas salvas</span>
          <span aria-hidden="true" className="transition group-open:rotate-180">
            â–¼
          </span>
        </summary>

        <div className="border-t border-white/10 px-5 py-5">
          {notes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-[#131722] p-6 text-sm text-zinc-400 md:bg-[#12151d]">
              Voce ainda nao possui notas salvas. Quando criar anotacoes no
              bloco de notas do leitor, elas aparecerao aqui.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-3xl bg-[#131722] p-5 transition hover:bg-white/[0.04] md:border md:border-white/10 md:bg-[#12151d]"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-semibold text-white md:text-lg">
                        {note.title?.trim() || "Nova nota"}
                      </h3>

                      <p className="mt-3 text-sm leading-7 text-zinc-400">
                        {getNotePreview(note.content)}
                      </p>
                    </div>

                    <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:block">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                        Atualizada em
                      </p>
                      <p className="mt-2 text-xs text-zinc-300">
                        {formatDate(note.updated_at)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </details>
    </ProfileSectionAnchor>
  );

  const accountInfoSection = (
    <section className="border-t border-[#dfe4ef] px-1 pt-5 text-[#1f2430] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-6 md:text-white md:shadow-none">
      <p className="text-xs uppercase tracking-[0.3em] text-[#93a0b8] md:text-amber-400">
        Conta
      </p>
      <h2 className="mt-2 text-lg font-bold text-[#16213b] md:text-xl md:text-white">
        Informacoes da conta
      </h2>

      <div className="mt-5 space-y-3">
        <div className="border-b border-[#dfe4ef] px-0 pb-4 md:rounded-2xl md:border md:border-white/10 md:bg-black/20 md:p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8e97ab] md:text-zinc-500">
            E-mail
          </p>
          <p className="mt-2 break-all text-sm text-[#1f2430] md:text-zinc-200">
            {user.email ?? "E-mail indisponivel"}
          </p>
        </div>

        <div className="px-0 pt-1 md:rounded-2xl md:border md:border-white/10 md:bg-black/20 md:p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8e97ab] md:text-zinc-500">
            ID do usuario
          </p>
          <p className="mt-2 break-all text-xs text-[#5b647a] md:text-zinc-400">
            {user.id}
          </p>
        </div>
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-[#0a0c12] px-3 py-5 text-white md:bg-[#05060a] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <ProfileSectionAnchor
          id="perfil-topo"
          className="rounded-[28px] bg-[#13203b] p-5 shadow-[0_20px_48px_-28px_rgba(15,23,42,0.65)] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-8 md:shadow-2xl"
        >
          <div className="hidden items-center justify-between gap-5 md:flex">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
                Perfil do usuario
              </p>
              <h1 className="mt-3 text-4xl font-bold">Minha conta</h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">
                Organize sua leitura, atualize seus dados e acompanhe tudo o
                que voce salvou no acervo.
              </p>
            </div>
          </div>

          <div className="md:hidden">
            <div>
              <p className="text-[28px] font-semibold tracking-[-0.03em] text-white">
                Minha conta
              </p>

              <div className="mt-5 rounded-[24px] bg-[linear-gradient(180deg,#151720_0%,#11131a_100%)] px-4 py-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
                <ProfileAvatarSection
                  userId={user.id}
                  initialAvatarUrl={initialAvatarUrl}
                  displayName={displayName}
                  initialBio={initialBio}
                  variant="compact"
                />
              </div>
            </div>
          </div>
        </ProfileSectionAnchor>

        <div className="mt-6 space-y-4 md:hidden">
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#151720] shadow-[0_18px_40px_-28px_rgba(0,0,0,0.55)]">
            <details open className="group border-b border-white/8">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-medium text-white marker:hidden">
                <span>Dados</span>
                <span
                  aria-hidden="true"
                  className="text-amber-300/75 transition group-open:rotate-90"
                >
                  â€º
                </span>
              </summary>
              <div className="border-t border-white/8 bg-white p-5">
                <div className="space-y-4">
                  {editProfileSection}
                  {accountInfoSection}
                </div>
              </div>
            </details>

            <details className="group border-b border-white/8">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-medium text-white marker:hidden">
                <span>Leitura</span>
                <span
                  aria-hidden="true"
                  className="text-amber-300/75 transition group-open:rotate-90"
                >
                  â€º
                </span>
              </summary>
              <div className="border-t border-white/8 bg-[#0f1117] p-5">
                <ProfileRecentReadingSection variant="embedded" />
              </div>
            </details>

            <details className="group border-b border-white/8">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-medium text-white marker:hidden">
                <span>Favoritos</span>
                <span
                  aria-hidden="true"
                  className="text-amber-300/75 transition group-open:rotate-90"
                >
                  â€º
                </span>
              </summary>
              <div className="border-t border-white/8 bg-[#0f1117] p-5">
                {favoritesSection}
              </div>
            </details>

            <details className="group border-b border-white/8">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-medium text-white marker:hidden">
                <span>Notas</span>
                <span
                  aria-hidden="true"
                  className="text-amber-300/75 transition group-open:rotate-90"
                >
                  â€º
                </span>
              </summary>
              <div className="border-t border-white/8 bg-[#0f1117] p-5">
                {notesSection}
              </div>
            </details>

            <details className="group">
              <summary className="flex min-h-[58px] cursor-pointer list-none items-center justify-between px-5 py-4 text-[15px] font-medium text-white marker:hidden">
                <span>Seguranca</span>
                <span
                  aria-hidden="true"
                  className="text-amber-300/75 transition group-open:rotate-90"
                >
                  â€º
                </span>
              </summary>
              <div className="border-t border-white/8 bg-white p-5">
                <AccountSecuritySection
                  userEmail={user.email ?? ""}
                  variant="embedded"
                />
              </div>
            </details>
          </div>
        </div>

        <div className="mt-8 hidden gap-8 xl:grid xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-8">
            {editProfileSection}
            <ProfileSectionAnchor id="leituras-recentes">
              <ProfileRecentReadingSection />
            </ProfileSectionAnchor>
            {favoritesSection}
            {notesSection}
          </div>

          <aside className="space-y-6">
            <ProfileAvatarSection
              userId={user.id}
              initialAvatarUrl={initialAvatarUrl}
              displayName={displayName}
            />
            {accountInfoSection}
            <ProfileSectionAnchor id="seguranca">
              <AccountSecuritySection userEmail={user.email ?? ""} />
            </ProfileSectionAnchor>
          </aside>
        </div>
      </div>
    </main>
  );
}



