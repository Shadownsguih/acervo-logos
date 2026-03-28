import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { updateUserProfileAction } from "./actions";
import ProfileAvatarSection from "@/app/components/profile-avatar-section";
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
      text: "Não foi possível salvar o perfil.",
    };
  }

  return null;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getNotePreview(content: string | null) {
  const normalized = String(content ?? "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Sem conteúdo ainda.";
  }

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 180).trim()}...`;
}

export default async function PerfilPage({ searchParams }: PerfilPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?erro=login&next=/perfil");
  }

  const [{ data: profile }, { data: notesData }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("full_name, bio, location, avatar_url, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("study_notes")
      .select("id, title, content, created_at, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const notes = (notesData ?? []) as StudyNote[];

  const resolvedSearchParams = await searchParams;
  const statusMessage = getStatusMessage(resolvedSearchParams.status);

  const initialFullName =
    profile?.full_name ??
    String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim();

  const initialBio = profile?.bio ?? "";
  const initialLocation = profile?.location ?? "";
  const initialAvatarUrl = profile?.avatar_url ?? null;
  const displayName =
    initialFullName || user.email || "Usuário do Acervo Logos";

  const accountCreatedAt = user.created_at
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(user.created_at))
    : "Data indisponível";

  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-10 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <ProfileSectionAnchor
          id="perfil-topo"
          className="border border-white/10 bg-white/[0.03] p-6 shadow-2xl md:p-8"
        >
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
                Perfil do usuário
              </p>

              <h1 className="mt-3 text-3xl font-bold md:text-4xl">
                Minha conta
              </h1>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                Conta criada em
              </p>
              <p className="mt-2 text-sm text-zinc-200">{accountCreatedAt}</p>
            </div>
          </div>
        </ProfileSectionAnchor>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-8">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                    Dados básicos
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Editar perfil</h2>
                </div>
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
                    className="w-full rounded-2xl border border-white/10 bg-[#12151d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
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
                    placeholder="Fale um pouco sobre você ou sobre seu foco de estudo."
                    className="w-full rounded-2xl border border-white/10 bg-[#12151d] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="mb-2 block text-sm font-medium text-zinc-200"
                  >
                    Sua Cidade
                  </label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    defaultValue={initialLocation}
                    maxLength={120}
                    placeholder="Ex.: Macarani - BA"
                    className="w-full rounded-2xl border border-white/10 bg-[#12151d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
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

            <ProfileSectionAnchor
              id="notas-salvas"
              openDetailsSelector="details"
              className="border border-white/10 bg-white/[0.03] p-6 md:p-8"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                    Minhas notas
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">
                    Todas as notas salvas
                  </h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    Total de notas
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {notes.length}
                  </p>
                </div>
              </div>

              <details className="mt-6 group rounded-3xl border border-white/10 bg-black/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-white marker:hidden">
                  <span>Mostrar notas salvas</span>
                  <span
                    aria-hidden="true"
                    className="transition group-open:rotate-180"
                  >
                    ▼
                  </span>
                </summary>

                <div className="border-t border-white/10 px-5 py-5">
                  {notes.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-[#12151d] p-6 text-sm text-zinc-400">
                      Você ainda não possui notas salvas. Quando criar anotações
                      no bloco de notas do leitor, elas aparecerão aqui.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <article
                          key={note.id}
                          className="rounded-3xl border border-white/10 bg-[#12151d] p-5 transition hover:bg-white/[0.04]"
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

                            <div className="shrink-0 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
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
          </div>

          <aside className="space-y-6">
            <ProfileAvatarSection
              userId={user.id}
              initialAvatarUrl={initialAvatarUrl}
              displayName={displayName}
            />

            <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
                Conta
              </p>

              <h2 className="mt-2 text-xl font-bold">Informações da conta</h2>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    E-mail
                  </p>
                  <p className="mt-2 break-all text-sm text-zinc-200">
                    {user.email ?? "E-mail indisponível"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                    ID do usuário
                  </p>
                  <p className="mt-2 break-all text-xs text-zinc-400">
                    {user.id}
                  </p>
                </div>
              </div>
            </section>

            <ProfileSectionAnchor id="seguranca">
              <AccountSecuritySection userEmail={user.email ?? ""} />
            </ProfileSectionAnchor>
          </aside>
        </div>
      </div>
    </main>
  );
}