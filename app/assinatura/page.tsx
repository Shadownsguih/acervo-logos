import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { buildPlanWhatsAppLink, getConfiguredWhatsAppLink } from "@/lib/whatsapp";

function formatDate(value: string | null) {
  if (!value) {
    return "Data nao disponivel";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data nao disponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

function hasAccessExpired(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() < Date.now();
}

function resolveMessage(status: string | null, isExpiredByDate: boolean) {
  if (status === "blocked") {
    return {
      title: "Seu acesso esta bloqueado",
      description:
        "No momento sua conta nao esta liberada para usar o Acervo Logos. Fale conosco para regularizar o acesso.",
    };
  }

  if (isExpiredByDate) {
    return {
      title: "Sua assinatura venceu",
      description:
        "Seu periodo de acesso ao Acervo Logos terminou. Para continuar estudando na biblioteca, renove sua assinatura.",
    };
  }

  return {
    title: "Seu acesso precisa de verificacao",
    description:
      "Nao foi possivel validar sua conta agora. Entre em contato para confirmar a situacao do seu acesso.",
  };
}

export default async function AssinaturaPage() {
  const supabase = await createClient();
  const whatsappLink = getConfiguredWhatsAppLink();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?erro=login&next=/assinatura");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select(
      "full_name, access_expires_at, subscription_status, payment_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  const expiresAt = profile?.access_expires_at ?? null;
  const subscriptionStatus = profile?.subscription_status ?? null;
  const paymentStatus = profile?.payment_status ?? null;
  const isExpiredByDate = hasAccessExpired(expiresAt);
  const content = resolveMessage(subscriptionStatus, isExpiredByDate);

  return (
    <main className="min-h-screen bg-[#05060a] px-4 py-10 text-white md:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6 shadow-2xl md:p-10">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-400">
            Assinatura
          </p>

          <h1 className="mt-4 text-3xl font-bold md:text-4xl">
            {content.title}
          </h1>

          <p className="mt-4 text-base leading-7 text-zinc-300">
            {content.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
                Conta
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {profile?.full_name?.trim() || user.email || "Usuario"}
              </p>
              <p className="mt-2 break-all text-sm text-zinc-400">
                {user.email}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-400">
                Vencimento
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {formatDate(expiresAt)}
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Pagamento:{" "}
                <span className="font-medium text-white">
                  {paymentStatus === "paid"
                    ? "Pago"
                    : paymentStatus === "pending"
                    ? "Pendente"
                    : paymentStatus === "overdue"
                    ? "Atrasado"
                    : "Nao definido"}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-sm font-medium text-white">
              Como voltar a estudar
            </p>

            <p className="mt-3 text-sm leading-6 text-zinc-200">
              Entre em contato para confirmar o pagamento ou solicitar a
              renovacao da assinatura. Assim que sua conta for liberada, o
              acesso ao acervo sera restabelecido.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-300">
                Plano mensal
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">R$ 15/mes</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Ideal para retomar seu acesso agora e voltar a estudar sem
                demora.
              </p>
              <a
                href={buildPlanWhatsAppLink("Mensal - R$ 15 por mes")}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Escolher plano mensal
              </a>
            </article>

            <article className="rounded-3xl border border-amber-300/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.10),rgba(255,255,255,0.03))] p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-amber-200">
                Plano anual
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">R$ 140/ano</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-200">
                Melhor custo-beneficio para manter seu acesso ao longo do ano.
              </p>
              <a
                href={buildPlanWhatsAppLink("Anual - R$ 140 por ano")}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-[46px] w-full items-center justify-center rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                Escolher plano anual
              </a>
            </article>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Falar no WhatsApp
            </a>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              Voltar para a pagina inicial
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
