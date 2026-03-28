"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

function normalizeNextPath(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "/";
  }

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  return trimmed;
}

function buildLoginRedirect(errorCode: string, nextPath?: string) {
  const params = new URLSearchParams();
  params.set("erro", errorCode);

  if (nextPath) {
    params.set("next", normalizeNextPath(nextPath));
  }

  return `/login?${params.toString()}`;
}

export async function loginUserAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    redirect(buildLoginRedirect("campos-obrigatorios", nextPath));
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(buildLoginRedirect("credenciais-invalidas", nextPath));
  }

  redirect(nextPath);
}

export async function logoutUserAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}