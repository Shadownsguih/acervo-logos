import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase-server";
import { logoutUserAction } from "@/app/login/actions";
import UserMenuDropdown from "@/app/components/user-menu-dropdown";
import HeaderSearch from "@/app/components/header-search";
import PwaRegister from "@/app/components/pwa-register";
import PwaInstallButton from "@/app/components/pwa-install-button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Acervo Logos",
  description: "Biblioteca teológica digital",
  applicationName: "Acervo Logos",
  manifest: "/manifest.webmanifest",
  themeColor: "#05060a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Acervo Logos",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/logo-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
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
      "Usuário do Acervo Logos";
  }

  const avatarInitials = getInitials(profileFullName);

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-zinc-950 text-zinc-100"
      >
        <PwaRegister />

        <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#05060a]">
          <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05060a]/88 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6">
              <Link
                href="/"
                className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
                aria-label="Ir para a página inicial do Acervo Logos"
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
                  <div className="hidden text-[10px] uppercase tracking-[0.22em] text-zinc-500 md:block">
                    Biblioteca Teológica Digital
                  </div>
                </div>
              </Link>

              <div className="hidden flex-1 justify-center lg:flex">
                <HeaderSearch />
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <PwaInstallButton />

                {!user ? (
                  <div className="hidden items-center gap-3 xl:flex">
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-zinc-400">
                      Acesso restrito
                    </span>
                  </div>
                ) : null}

                {isAdminUser ? (
                  <Link
                    href="/admin"
                    className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-400/20 sm:px-4 sm:text-sm"
                  >
                    Admin
                  </Link>
                ) : null}

                {user ? (
                  <UserMenuDropdown
                    profileFullName={profileFullName}
                    userEmail={user.email ?? ""}
                    profileAvatarUrl={profileAvatarUrl}
                    avatarInitials={avatarInitials}
                    logoutAction={logoutUserAction}
                  />
                ) : (
                  <Link
                    href="/login"
                    className="rounded-full bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 sm:px-5"
                  >
                    Entrar
                  </Link>
                )}
              </div>
            </div>

            <div className="border-t border-white/5 px-3 py-3 sm:px-4 lg:hidden">
              <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <HeaderSearch />
                </div>
                <div className="shrink-0">
                  <PwaInstallButton />
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}