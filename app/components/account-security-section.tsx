"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type AccountSecuritySectionProps = {
  userEmail: string;
  variant?: "default" | "embedded";
};

export default function AccountSecuritySection({
  userEmail,
  variant = "default",
}: AccountSecuritySectionProps) {
  const supabase = useMemo(() => createClient(), []);
  const isEmbedded = variant === "embedded";

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  function resetMessages() {
    setErrorMessage("");
    setStatusMessage("");
  }

  function validatePassword(value: string) {
    if (value.length < 6) {
      return "A nova senha deve ter pelo menos 6 caracteres.";
    }

    if (value.length > 72) {
      return "A nova senha e muito longa.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    const normalizedCurrentPassword = currentPassword.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!userEmail) {
      setErrorMessage("Nao foi possivel identificar o e-mail do usuario.");
      return;
    }

    if (!normalizedCurrentPassword) {
      setErrorMessage("Informe sua senha atual.");
      return;
    }

    const validationError = validatePassword(normalizedPassword);

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      setErrorMessage("A confirmacao de senha nao corresponde a nova senha.");
      return;
    }

    if (normalizedCurrentPassword === normalizedPassword) {
      setErrorMessage("A nova senha deve ser diferente da senha atual.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: normalizedCurrentPassword,
      });

      if (reauthError) {
        setErrorMessage("A senha atual informada esta incorreta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: normalizedPassword,
      });

      if (updateError) {
        setErrorMessage(
          updateError.message || "Nao foi possivel alterar a senha."
        );
        return;
      }

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setStatusMessage("Senha alterada com sucesso.");
    } catch {
      setErrorMessage("Nao foi possivel alterar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      className={
        isEmbedded
          ? "text-[#1f2430] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-6 md:text-white md:shadow-none"
          : "rounded-[24px] bg-white p-5 text-[#1f2430] shadow-[0_18px_48px_-30px_rgba(15,23,42,0.28)] md:rounded-[32px] md:border md:border-white/10 md:bg-white/[0.03] md:p-6 md:text-white md:shadow-none"
      }
    >
      <p className="text-xs uppercase tracking-[0.3em] text-[#93a0b8] md:text-amber-400">
        Seguranca
      </p>

      <h2 className="mt-2 text-xl font-bold text-[#16213b] md:text-white">
        Alterar senha
      </h2>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="current_password"
            className="mb-2 block text-sm font-medium text-[#7f8aa3] md:text-zinc-200"
          >
            Senha atual
          </label>

          <input
            id="current_password"
            name="current_password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            placeholder="Digite sua senha atual"
            className="w-full rounded-none border-0 border-b border-[#d5dbea] bg-transparent px-0 py-3 text-sm text-[#16213b] outline-none transition placeholder:text-[#9aa3b8] focus:border-[#16213b] md:rounded-2xl md:border md:border-white/10 md:bg-[#12151d] md:px-4 md:text-white md:placeholder:text-zinc-500 md:focus:border-amber-400/60"
          />
        </div>

        <div>
          <label
            htmlFor="new_password"
            className="mb-2 block text-sm font-medium text-[#7f8aa3] md:text-zinc-200"
          >
            Nova senha
          </label>

          <input
            id="new_password"
            name="new_password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Digite a nova senha"
            className="w-full rounded-none border-0 border-b border-[#d5dbea] bg-transparent px-0 py-3 text-sm text-[#16213b] outline-none transition placeholder:text-[#9aa3b8] focus:border-[#16213b] md:rounded-2xl md:border md:border-white/10 md:bg-[#12151d] md:px-4 md:text-white md:placeholder:text-zinc-500 md:focus:border-amber-400/60"
          />
        </div>

        <div>
          <label
            htmlFor="confirm_new_password"
            className="mb-2 block text-sm font-medium text-[#7f8aa3] md:text-zinc-200"
          >
            Confirmar nova senha
          </label>

          <input
            id="confirm_new_password"
            name="confirm_new_password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            placeholder="Digite novamente a nova senha"
            className="w-full rounded-none border-0 border-b border-[#d5dbea] bg-transparent px-0 py-3 text-sm text-[#16213b] outline-none transition placeholder:text-[#9aa3b8] focus:border-[#16213b] md:rounded-2xl md:border md:border-white/10 md:bg-[#12151d] md:px-4 md:text-white md:placeholder:text-zinc-500 md:focus:border-amber-400/60"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            {statusMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Alterando senha..." : "Alterar senha"}
          </button>
        </div>
      </form>
    </section>
  );
}
