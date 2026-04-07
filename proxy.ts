import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function normalizeNextPath(value: string) {
  if (!value) {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/assinatura" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js"
  );
}

function isSubscriptionExpired(
  accessExpiresAt: string | null | undefined,
  subscriptionStatus: string | null | undefined
) {
  if (subscriptionStatus === "blocked") {
    return true;
  }

  if (!accessExpiresAt) {
    return true;
  }

  const expiresAt = new Date(accessExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return true;
  }

  return expiresAt.getTime() < Date.now();
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/admin/login";
  const isUserLoginPage = pathname === "/login";
  const isExpiredPage = pathname === "/assinatura";

  const isAdminUser =
    !!user?.email &&
    !!adminEmail &&
    user.email.toLowerCase() === adminEmail;

  if (isAdminRoute) {
    if (isAdminLoginPage && isAdminUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!isAdminLoginPage && !isAdminUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      url.searchParams.set("erro", user ? "sem-permissao" : "login");
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (isUserLoginPage && user) {
    const nextParam = normalizeNextPath(
      request.nextUrl.searchParams.get("next") ?? "/"
    );

    const url = request.nextUrl.clone();
    url.pathname = nextParam;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    const nextPath = `${pathname}${request.nextUrl.search}`;

    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("erro", "login");
    url.searchParams.set("next", normalizeNextPath(nextPath));

    return NextResponse.redirect(url);
  }

  if (user && !isAdminUser) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("access_expires_at, subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    const expired = isSubscriptionExpired(
      profile?.access_expires_at,
      profile?.subscription_status
    );

    if (expired && !isExpiredPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/assinatura";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (!expired && isExpiredPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};