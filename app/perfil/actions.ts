"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

function normalizeText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function updateUserProfileAction(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?erro=login&next=/perfil");
  }

  const fullName = normalizeText(formData.get("full_name"), 120);
  const bio = normalizeText(formData.get("bio"), 500);
  const location = normalizeText(formData.get("location"), 120);

  const { error } = await supabase.from("user_profiles").upsert(
    {
      id: user.id,
      full_name: fullName || null,
      bio: bio || null,
      location: location || null,
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    redirect("/perfil?status=erro");
  }

  revalidatePath("/perfil");
  redirect("/perfil?status=salvo");
}