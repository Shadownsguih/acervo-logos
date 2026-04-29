import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isAdminEmail(email?: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase() ?? "";
  return !!email && !!adminEmail && email.toLowerCase() === adminEmail;
}

function normalizePayload(body: Record<string, unknown>) {
  const version = typeof body.version === "string" ? body.version.trim() : "";
  const book = typeof body.book === "string" ? body.book.trim() : "";
  const abbrev =
    typeof body.abbrev === "string" && body.abbrev.trim()
      ? body.abbrev.trim()
      : null;
  const chapter = Number(body.chapter);
  const verse = Number(body.verse);
  const reference =
    typeof body.reference === "string" ? body.reference.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const insight = typeof body.insight === "string" ? body.insight.trim() : "";
  const displayOrder =
    body.displayOrder === null ||
    body.displayOrder === undefined ||
    body.displayOrder === ""
      ? null
      : Number(body.displayOrder);
  const isActive = Boolean(body.isActive);

  if (!version || !book || !reference || !text || !insight) {
    throw new Error("Preencha todos os campos obrigatorios do versiculo.");
  }

  if (!Number.isInteger(chapter) || chapter <= 0) {
    throw new Error("O capitulo deve ser um numero inteiro maior que zero.");
  }

  if (!Number.isInteger(verse) || verse <= 0) {
    throw new Error("O versiculo deve ser um numero inteiro maior que zero.");
  }

  if (
    displayOrder !== null &&
    (!Number.isInteger(displayOrder) || displayOrder <= 0)
  ) {
    throw new Error("A ordem deve ser um numero inteiro maior que zero.");
  }

  return {
    version,
    book,
    abbrev,
    chapter,
    verse,
    reference,
    text,
    insight,
    display_order: displayOrder,
    is_active: isActive,
  };
}

async function validateAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { isAdmin: isAdminEmail(user?.email) };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { isAdmin } = await validateAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const { id } = await context.params;
    const adminSupabase = createAdminClient();
    const body = (await request.json()) as Record<string, unknown>;
    const payload = normalizePayload(body);

    const { error } = await adminSupabase
      .from("daily_bible_verse_library")
      .update(payload)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel atualizar o versiculo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao atualizar versiculo.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { isAdmin } = await validateAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Nao autorizado." }, { status: 401 });
    }

    const { id } = await context.params;
    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("daily_bible_verse_library")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Nao foi possivel excluir o versiculo." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao excluir versiculo." },
      { status: 500 }
    );
  }
}
