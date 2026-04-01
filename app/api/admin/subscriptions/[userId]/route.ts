import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
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
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const { userId } = await context.params;
    const body = await request.json();
    const action = String(body?.action ?? "").trim();

    if (!userId) {
      return NextResponse.json(
        { error: "Usuário não informado." },
        { status: 400 }
      );
    }

    if (!["renew", "block", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Ação inválida." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: currentProfile, error: profileError } = await adminSupabase
      .from("user_profiles")
      .select(
        "id, access_expires_at, subscription_status, payment_status, full_name"
      )
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { error: "Erro ao localizar perfil do usuário." },
        { status: 500 }
      );
    }

    if (!currentProfile) {
      return NextResponse.json(
        { error: "Perfil do usuário não encontrado em user_profiles." },
        { status: 404 }
      );
    }

    if (action === "renew") {
      const now = new Date();

      const currentExpiresAt = currentProfile.access_expires_at
        ? new Date(currentProfile.access_expires_at)
        : null;

      const hasValidCurrentDate =
        !!currentExpiresAt && !Number.isNaN(currentExpiresAt.getTime());

      const nextExpiresAt =
        hasValidCurrentDate && currentExpiresAt.getTime() > now.getTime()
          ? addDays(currentExpiresAt, 31)
          : addDays(now, 31);

      const { error: updateError } = await adminSupabase
        .from("user_profiles")
        .update({
          access_expires_at: nextExpiresAt.toISOString(),
          subscription_status: "active",
          payment_status: "paid",
        })
        .eq("id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: "Erro ao renovar a assinatura." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Assinatura renovada por mais 31 dias.",
      });
    }

    if (action === "block") {
      const { error: updateError } = await adminSupabase
        .from("user_profiles")
        .update({
          subscription_status: "blocked",
          payment_status: "overdue",
        })
        .eq("id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: "Erro ao bloquear o usuário." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Usuário bloqueado com sucesso.",
      });
    }

    if (action === "reactivate") {
      const now = new Date();

      const currentExpiresAt = currentProfile.access_expires_at
        ? new Date(currentProfile.access_expires_at)
        : null;

      const hasValidCurrentDate =
        !!currentExpiresAt && !Number.isNaN(currentExpiresAt.getTime());

      const nextExpiresAt =
        hasValidCurrentDate && currentExpiresAt.getTime() > now.getTime()
          ? currentExpiresAt
          : addDays(now, 31);

      const { error: updateError } = await adminSupabase
        .from("user_profiles")
        .update({
          access_expires_at: nextExpiresAt.toISOString(),
          subscription_status: "active",
          payment_status: "paid",
        })
        .eq("id", userId);

      if (updateError) {
        return NextResponse.json(
          { error: "Erro ao reativar o usuário." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Usuário reativado com sucesso.",
      });
    }

    return NextResponse.json(
      { error: "Ação não tratada." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro na rota de assinaturas:", error);

    return NextResponse.json(
      { error: "Erro interno ao processar a solicitação." },
      { status: 500 }
    );
  }
}