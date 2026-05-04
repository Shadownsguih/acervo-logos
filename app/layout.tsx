import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import { logoutUserAction } from "@/app/login/actions";
import AppHeaderDrawer from "@/app/components/app-header-drawer";
import PwaRegister from "@/app/components/pwa-register";
import PwaInstallButton from "@/app/components/pwa-install-button";
import GlobalRouteLoading from "@/app/components/global-route-loading";

export const metadata: Metadata = {
  title: "Acervo Logos",
  description: "Biblioteca teologica digital",
};

function getInitials(name: string) {
  const cleaned = name.trim();

  if (!cleaned) {
    return "AL";
  }

  const parts = cleaned.split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "AL";
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const userEmail = (user?.email ?? "").trim().toLowerCase();

  const isAdminUser = !!adminEmail && !!userEmail && userEmail === adminEmail;

  let profileAvatarUrl: string | null = null;
  let profileFullName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    profileAvatarUrl = profile?.avatar_url ?? null;
    profileFullName =
      profile?.full_name?.trim() ||
      String(
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""
      ).trim() ||
      user.email ||
      "Usuario do Acervo Logos";
  }

  const avatarInitials = getInitials(profileFullName);

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-zinc-950 text-zinc-100"
      >
        <PwaRegister />

        <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#05060a]">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05060a]/88 backdrop-blur-xl">
            <div className="mx-auto grid w-full max-w-7xl grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 px-3 py-3 sm:px-4 md:px-6">
              <div className="flex justify-start">
                <AppHeaderDrawer
                  isLoggedIn={Boolean(user)}
                  isAdminUser={isAdminUser}
                  profileFullName={profileFullName}
                  userEmail={user?.email ?? ""}
                  profileAvatarUrl={profileAvatarUrl}
                  avatarInitials={avatarInitials}
                  logoutAction={logoutUserAction}
                />
              </div>

              <Link
                href="/"
                className="group mx-auto flex min-w-0 items-center justify-center gap-2.5 sm:gap-3"
                aria-label="Ir para a pagina inicial do Acervo Logos"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition group-hover:bg-white/10 sm:h-11 sm:w-11">
                  <Image
                    src="/logo-icon.png"
                    alt="Acervo Logos"
                    width={32}
                    height={32}
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white sm:text-base md:text-lg">
                    Acervo Logos
                  </div>
                </div>
              </Link>

              <div aria-hidden="true" className="h-11 w-11" />
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden">
            <Suspense fallback={<GlobalRouteLoading />}>{children}</Suspense>
          </main>
        </div>

        <PwaInstallButton />
      </body>
    </html>
  );
}
