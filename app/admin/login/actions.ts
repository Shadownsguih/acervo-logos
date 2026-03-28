"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

function buildLoginRedirect(errorCode: string) {
  return `/admin/login?erro=${encodeURIComponent(errorCode)}`;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(buildLoginRedirect("campos-obrigatorios"));
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(buildLoginRedirect("credenciais-invalidas"));
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  const loggedEmail = data.user.email?.toLowerCase() ?? "";

  if (!adminEmail || loggedEmail !== adminEmail) {
    await supabase.auth.signOut();
    redirect(buildLoginRedirect("sem-permissao"));
  }

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}