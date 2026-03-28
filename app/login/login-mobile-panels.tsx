"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { loginUserAction } from "./actions";

type LoginMobilePanelsProps = {
  nextPath: string;
  errorMessage: string | null;
  whatsappLink: string;
  cinzelClassName: string;
};

export default function LoginMobilePanels({
  nextPath,
  errorMessage,
  whatsappLink,
  cinzelClassName,
}: LoginMobilePanelsProps) {
  const [activePanel, setActivePanel] = useState<"login" | "welcome">("login");

  return (
    <div className="lg:hidden">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        {activePanel === "login" ? (
          <section className="relative px-5 py-7 sm:px-7 sm:py-8">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(111,0,255,0.16),transparent_24%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(255,0,153,0.14),transparent_26%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_82%,rgba(0,210,255,0.10),transparent_22%)]" />

            <div className="relative">
              <div className="flex justify-center">
                <Image
                  src="/logo-full.png"
                  alt="Acervo Logos"
                  width={1200}
                  height={380}
                  className="h-auto w-[240px]"
                  priority
                />
              </div>

              <div className="mt-6 flex justify-center">
                <div className="rounded-full border border-white/12 bg-white/[0.12] px-5 py-2 text-[11px] font-medium tracking-[0.22em] text-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-md">
                  ACESSO RESTRITO
                </div>
              </div>

              <div className="mt-8 text-center">
                <h2
                  className={`${cinzelClassName} text-[28px] font-medium uppercase tracking-[0.18em] text-white/92`}
                >
                  Faça Login
                </h2>

                <p className="mx-auto mt-3 max-w-[320px] text-sm leading-7 text-white/64">
                  Entre com seu e-mail e senha para acessar seu conteúdo no
                  acervo.
                </p>
              </div>

              {errorMessage ? (
                <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <form action={loginUserAction} className="mt-7">
                <input type="hidden" name="next" value={nextPath} />

                <div className="space-y-4">
                  <div className="overflow-hidden rounded-full border border-white/14 bg-white/[0.14] shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
                    <input
                      id="email-mobile"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full bg-transparent px-5 py-4 text-[16px] tracking-[0.08em] text-white outline-none placeholder:text-white/52"
                      placeholder="E-mail"
                    />
                  </div>

                  <div className="overflow-hidden rounded-full border border-white/14 bg-white/[0.14] shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
                    <input
                      id="password-mobile"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      className="w-full bg-transparent px-5 py-4 text-[16px] tracking-[0.08em] text-white outline-none placeholder:text-white/52"
                      placeholder="Senha"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-7 flex w-full items-center justify-center rounded-full bg-[#2b2955] px-6 py-4 text-[16px] font-semibold tracking-[0.08em] text-white shadow-[0_16px_35px_rgba(20,20,40,0.35)] transition hover:bg-[#34316b]"
                >
                  Entrar
                </button>
              </form>

              <button
                type="button"
                onClick={() => setActivePanel("welcome")}
                className="mt-4 flex w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.08] px-5 py-3 text-sm font-medium text-white/88 transition hover:bg-white/[0.12]"
              >
                Sou novo no acervo
              </button>

              <div className="pt-7 text-center">
                <Link
                  href="/"
                  className="text-sm text-white/55 transition hover:text-white/85"
                >
                  ← Voltar para a página inicial
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className="relative px-5 py-7 sm:px-7 sm:py-8">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]" />
            <div className="absolute -left-16 bottom-[-120px] h-80 w-80 rounded-full bg-amber-400/14 blur-3xl" />
            <div className="absolute left-10 top-10 h-44 w-44 rounded-full bg-white/4 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex justify-center">
                <Image
                  src="/logo-full.png"
                  alt="Acervo Logos"
                  width={1200}
                  height={380}
                  className="h-auto w-[240px]"
                  priority
                />
              </div>

              <div className="mt-8 text-center">
                <p
                  className={`${cinzelClassName} text-[32px] font-medium uppercase leading-[0.95] tracking-[0.08em] text-white/90`}
                >
                  Bem-vindo
                </p>

                <h1 className="mt-3 text-[22px] font-semibold leading-tight text-white">
                  É novo no Acervo?
                </h1>

                <p className="mx-auto mt-8 max-w-[320px] text-[15px] leading-8 text-white/68">
                  Explore tudo o que preparamos para você. Clique no botão
                  abaixo para falar conosco no WhatsApp e liberar seu acesso.
                </p>

                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-white/[0.14] px-6 py-4 text-sm font-semibold tracking-[0.14em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:bg-white/[0.20]"
                >
                  FALAR NO WHATSAPP
                </a>

                <button
                  type="button"
                  onClick={() => setActivePanel("login")}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/12 bg-white/[0.08] px-6 py-3 text-sm font-medium text-white/88 transition hover:bg-white/[0.12]"
                >
                  Já tenho conta
                </button>
              </div>

              <div className="pt-7 text-center">
                <Link
                  href="/"
                  className="text-sm text-white/55 transition hover:text-white/85"
                >
                  ← Voltar para a página inicial
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}