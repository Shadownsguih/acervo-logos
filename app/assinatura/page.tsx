import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

function formatDate(value: string | null) {
  if (!value) {
    return "Data não disponível";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data não disponível";
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
      title: "Seu acesso foi bloqueado",
      description:
        "Seu acesso ao Acervo Logos está bloqueado no momento. Para regularizar sua conta, entre em contato com o administrador.",
    };
  }

  if (isExpiredByDate) {
    return {
      title: "Sua assinatura venceu",
      description:
        "Seu período de acesso ao Acervo Logos terminou. Para continuar usando a biblioteca, é necessário renovar sua assinatura.",
    };
  }

  return {
    title: "Seu acesso está indisponível",
    description:
      "Não foi possível validar o acesso da sua conta no momento. Entre em contato com o administrador para regularizar.",
  };
}

export default async function AssinaturaPage() {
  const supabase = await createClient();

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
                Usuário
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {profile?.full_name?.trim() || user.email || "Usuário"}
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
                    : "Não definido"}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-sm font-medium text-white">
              Como regularizar seu acesso
            </p>

            <p className="mt-3 text-sm leading-6 text-zinc-200">
              Entre em contato para confirmar o pagamento ou solicitar a
              renovação da assinatura. Assim que sua conta for liberada no
              painel administrativo, o acesso será restabelecido.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://wa.me/5577988292621"
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
              Voltar para a página inicial
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
