"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SubscriptionUser = {
  id: string;
  email: string;
  fullName: string | null;
  accessExpiresAt: string | null;
  subscriptionStatus: string | null;
  paymentStatus: string | null;
  createdAt: string | null;
};

type SubscriptionsManagerProps = {
  users: SubscriptionUser[];
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

type FilterType =
  | "all"
  | "active"
  | "expired"
  | "blocked"
  | "expiring_soon";

function formatDate(value: string | null) {
  if (!value) {
    return "Sem data definida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDaysDifference(value: string | null) {
  if (!value) {
    return null;
  }

  const expiresAt = new Date(value);

  if (Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  const oneDay = 1000 * 60 * 60 * 24;

  return Math.ceil(diffMs / oneDay);
}

function isExpired(user: SubscriptionUser) {
  if (!user.accessExpiresAt) {
    return false;
  }

  const expiresAt = new Date(user.accessExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() < Date.now();
}

function isExpiringSoon(user: SubscriptionUser) {
  if (user.subscriptionStatus === "blocked") {
    return false;
  }

  const days = getDaysDifference(user.accessExpiresAt);

  if (days === null) {
    return false;
  }

  return days >= 0 && days <= 3;
}

function isActive(user: SubscriptionUser) {
  if (user.subscriptionStatus === "blocked") {
    return false;
  }

  if (!user.accessExpiresAt) {
    return false;
  }

  const expiresAt = new Date(user.accessExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() >= Date.now();
}

function resolveVisualStatus(user: SubscriptionUser) {
  if (user.subscriptionStatus === "blocked") {
    return {
      label: "Bloqueado",
      className: "border-red-500/20 bg-red-500/10 text-red-300",
    };
  }

  if (!user.accessExpiresAt) {
    return {
      label: "Sem vencimento",
      className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-300",
    };
  }

  const expiresAt = new Date(user.accessExpiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return {
      label: "Data inválida",
      className: "border-zinc-500/20 bg-zinc-500/10 text-zinc-300",
    };
  }

  if (expiresAt.getTime() < Date.now()) {
    return {
      label: "Vencido",
      className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  if (isExpiringSoon(user)) {
    return {
      label: "Vence em breve",
      className: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
    };
  }

  return {
    label: "Ativo",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  };
}

function resolvePaymentLabel(paymentStatus: string | null) {
  if (paymentStatus === "pending") {
    return "Pendente";
  }

  if (paymentStatus === "overdue") {
    return "Atrasado";
  }

  if (paymentStatus === "paid") {
    return "Pago";
  }

  return "Não definido";
}

function resolveRemainingLabel(user: SubscriptionUser) {
  if (user.subscriptionStatus === "blocked") {
    return {
      label: "bloqueado",
      className: "text-red-300",
    };
  }

  const days = getDaysDifference(user.accessExpiresAt);

  if (days === null) {
    return {
      label: "sem data",
      className: "text-zinc-400",
    };
  }

  if (days < 0) {
    return {
      label: "vencido",
      className: "text-amber-300",
    };
  }

  if (days === 0) {
    return {
      label: "vence hoje",
      className: "text-yellow-300",
    };
  }

  if (days === 1) {
    return {
      label: "1 dia",
      className: "text-yellow-300",
    };
  }

  if (days <= 3) {
    return {
      label: `${days} dias`,
      className: "text-yellow-300",
    };
  }

  return {
    label: `${days} dias`,
    className: "text-emerald-300",
  };
}

export default function SubscriptionsManager({
  users,
}: SubscriptionsManagerProps) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [feedbackByUser, setFeedbackByUser] = useState<
    Record<string, ActionFeedback | undefined>
  >({});

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => isActive(user)).length;
  const expiredUsers = users.filter((user) => isExpired(user)).length;
  const blockedUsers = users.filter(
    (user) => user.subscriptionStatus === "blocked"
  ).length;
  const expiringSoonUsers = users.filter((user) => isExpiringSoon(user)).length;

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesFilter =
        activeFilter === "all"
          ? true
          : activeFilter === "active"
          ? isActive(user)
          : activeFilter === "expired"
          ? isExpired(user)
          : activeFilter === "blocked"
          ? user.subscriptionStatus === "blocked"
          : isExpiringSoon(user);

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const content = [
        user.email,
        user.fullName ?? "",
        user.subscriptionStatus ?? "",
        user.paymentStatus ?? "",
        user.accessExpiresAt ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return content.includes(normalizedSearch);
    });
  }, [users, search, activeFilter]);

  async function handleAction(
    userId: string,
    action: "renew" | "block" | "reactivate"
  ) {
    try {
      setLoadingUserId(userId);
      setFeedbackByUser((current) => ({
        ...current,
        [userId]: undefined,
      }));

      const response = await fetch(`/api/admin/subscriptions/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível concluir a ação.");
      }

      setFeedbackByUser((current) => ({
        ...current,
        [userId]: {
          type: "success",
          message: data?.message || "Ação concluída com sucesso.",
        },
      }));

      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro inesperado.";

      setFeedbackByUser((current) => ({
        ...current,
        [userId]: {
          type: "error",
          message,
        },
      }));
    } finally {
      setLoadingUserId(null);
    }
  }

  function FilterButton({
    label,
    value,
    count,
  }: {
    label: string;
    value: FilterType;
    count?: number;
  }) {
    const isActiveFilter = activeFilter === value;

    return (
      <button
        type="button"
        onClick={() => setActiveFilter(value)}
        className={`rounded-full border px-4 py-2.5 text-xs font-semibold tracking-[0.12em] transition ${
          isActiveFilter
            ? "border-amber-300 bg-amber-300 text-black shadow-[0_12px_28px_-18px_rgba(251,191,36,0.95)]"
            : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-white/20 hover:bg-white/[0.08]"
        }`}
      >
        {label}
        {typeof count === "number" ? ` (${count})` : ""}
      </button>
    );
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-300">
            Assinaturas
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">
            Controle de acesso dos usuários
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Agora você pode filtrar usuários por situação da assinatura e ver
            rapidamente quantos dias faltam para o vencimento.
          </p>
        </div>

        <div className="w-full md:max-w-sm">
          <label
            htmlFor="subscription-search"
            className="mb-2 block text-sm font-medium text-zinc-200"
          >
            Buscar usuário
          </label>
          <input
            id="subscription-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite nome, e-mail ou status"
            className="w-full rounded-2xl border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterButton label="Todos" value="all" count={totalUsers} />
        <FilterButton label="Ativos" value="active" count={activeUsers} />
        <FilterButton label="Vencidos" value="expired" count={expiredUsers} />
        <FilterButton
          label="Bloqueados"
          value="blocked"
          count={blockedUsers}
        />
        <FilterButton
          label="Vencendo em breve"
          value="expiring_soon"
          count={expiringSoonUsers}
        />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <div className="rounded-[24px] border border-white/10 bg-[#0b0f16]/85 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            Total
          </p>
          <p className="mt-3 text-3xl font-bold text-white">{totalUsers}</p>
        </div>

        <div className="rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.95)]">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-300">
            Ativos
          </p>
          <p className="mt-3 text-3xl font-bold text-white">{activeUsers}</p>
        </div>

        <div className="rounded-[24px] border border-yellow-500/20 bg-yellow-500/10 p-4 shadow-[0_18px_40px_-28px_rgba(234,179,8,0.95)]">
          <p className="text-xs uppercase tracking-[0.24em] text-yellow-300">
            Vencendo em breve
          </p>
          <p className="mt-3 text-3xl font-bold text-white">
            {expiringSoonUsers}
          </p>
        </div>

        <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/10 p-4 shadow-[0_18px_40px_-28px_rgba(245,158,11,0.95)]">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-300">
            Vencidos
          </p>
          <p className="mt-3 text-3xl font-bold text-white">{expiredUsers}</p>
        </div>

        <div className="rounded-[24px] border border-red-500/20 bg-red-500/10 p-4 shadow-[0_18px_40px_-28px_rgba(239,68,68,0.95)]">
          <p className="text-xs uppercase tracking-[0.24em] text-red-300">
            Bloqueados
          </p>
          <p className="mt-3 text-3xl font-bold text-white">{blockedUsers}</p>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0d13]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-white/[0.04] backdrop-blur-xl">
              <tr className="text-left">
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Usuário
                </th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Vencimento
                </th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Restante
                </th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Assinatura
                </th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Pagamento
                </th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Cadastro
                </th>
                <th className="px-4 py-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const visualStatus = resolveVisualStatus(user);
                  const remaining = resolveRemainingLabel(user);
                  const feedback = feedbackByUser[user.id];
                  const isLoading = loadingUserId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-white/10 bg-black/10 align-top transition hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-white">
                            {user.fullName?.trim() || "Sem nome informado"}
                          </p>
                          <p className="mt-1 break-all text-sm text-zinc-400">
                            {user.email}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-300">
                        {formatDate(user.accessExpiresAt)}
                      </td>

                      <td className="px-4 py-4 text-sm">
                        <span className={`font-semibold ${remaining.className}`}>
                          {remaining.label}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${visualStatus.className}`}
                        >
                          {visualStatus.label}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-300">
                        {resolvePaymentLabel(user.paymentStatus)}
                      </td>

                      <td className="px-4 py-4 text-sm text-zinc-400">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-[240px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => handleAction(user.id, "renew")}
                            disabled={isLoading}
                            className="rounded-full bg-amber-300 px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoading ? "Processando..." : "Renovar 31 dias"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction(user.id, "block")}
                            disabled={isLoading}
                            className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoading ? "Processando..." : "Bloquear"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAction(user.id, "reactivate")}
                            disabled={isLoading}
                            className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold tracking-[0.08em] text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoading ? "Processando..." : "Reativar"}
                          </button>

                          {feedback ? (
                            <div
                              className={`rounded-2xl border px-3 py-2 text-xs leading-6 ${
                                feedback.type === "success"
                                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                                  : "border-red-500/20 bg-red-500/10 text-red-300"
                              }`}
                            >
                              {feedback.message}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-zinc-400"
                  >
                    Nenhum usuário encontrado com esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
