import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

type UserProfileAccessRow = {
  access_expires_at: string | null;
  subscription_status: string | null;
};

type AccessContext =
  | {
      ok: true;
      user: User;
      isAdminUser: boolean;
    }
  | {
      ok: false;
      status: 401 | 403;
      error: string;
    };

export function isSubscriptionExpired(
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

export async function getAuthenticatedAccessContext(
  supabase: SupabaseClient
): Promise<AccessContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      error: "Faca login para continuar.",
    };
  }

  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const isAdminUser =
    !!adminEmail &&
    !!user.email &&
    user.email.trim().toLowerCase() === adminEmail;

  if (isAdminUser) {
    return {
      ok: true,
      user,
      isAdminUser: true,
    };
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("access_expires_at, subscription_status")
    .eq("id", user.id)
    .maybeSingle<UserProfileAccessRow>();

  if (
    isSubscriptionExpired(
      profile?.access_expires_at,
      profile?.subscription_status
    )
  ) {
    return {
      ok: false,
      status: 403,
      error: "Seu acesso nao esta ativo no momento.",
    };
  }

  return {
    ok: true,
    user,
    isAdminUser: false,
  };
}
