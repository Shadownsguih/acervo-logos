"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type AccountSecuritySectionProps = {
  userEmail: string;
};

export default function AccountSecuritySection({
  userEmail,
}: AccountSecuritySectionProps) {
  const supabase = useMemo(() => createClient(), []);

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
      return "A nova senha é muito longa.";
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
      setErrorMessage("Não foi possível identificar o e-mail do usuário.");
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
      setErrorMessage("A confirmação de senha não corresponde à nova senha.");
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
        setErrorMessage("A senha atual informada está incorreta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: normalizedPassword,
      });

      if (updateError) {
        setErrorMessage(
          updateError.message || "Não foi possível alterar a senha."
        );
        return;
      }

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setStatusMessage("Senha alterada com sucesso.");
    } catch {
      setErrorMessage("Não foi possível alterar a senha.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-400">
        Segurança
      </p>

      <h2 className="mt-2 text-xl font-bold">Alterar senha</h2>

      

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="current_password"
            className="mb-2 block text-sm font-medium text-zinc-200"
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
            className="w-full rounded-2xl border border-white/10 bg-[#12151d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
          />
        </div>

        <div>
          <label
            htmlFor="new_password"
            className="mb-2 block text-sm font-medium text-zinc-200"
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
            className="w-full rounded-2xl border border-white/10 bg-[#12151d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
          />
        </div>

        <div>
          <label
            htmlFor="confirm_new_password"
            className="mb-2 block text-sm font-medium text-zinc-200"
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
            className="w-full rounded-2xl border border-white/10 bg-[#12151d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
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