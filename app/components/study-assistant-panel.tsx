"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

type StudyAssistantPanelProps = {
  reference: string;
  translationLabel?: string;
  chapterText: string;
  selectedVerseText?: string;
  mode?: "bible" | "pdf";
  contextLabel?: string;
};

type RecommendedMaterial = {
  id: string;
  title: string;
  description: string | null;
};

type AssistantResponse = {
  ok: boolean;
  source?: string;
  answer?: string;
  themes?: string[];
  doctrine?: string[];
  application?: string[];
  keyPoints?: string[];
  recommendedMaterials?: RecommendedMaterial[];
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  renderedContent?: string;
  source?: string;
  themes?: string[];
  doctrine?: string[];
  application?: string[];
  keyPoints?: string[];
  recommendedMaterials?: RecommendedMaterial[];
};

const DEFAULT_QUESTIONS = [
  "Explique o sentido principal deste trecho.",
  "Qual a aplicacao pratica deste texto para hoje?",
  "Quais materiais do acervo podem aprofundar este assunto?",
];

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function AssistantSparkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 11a8 8 0 0 0-14.7-4M4 5v4h4" />
      <path d="M4 13a8 8 0 0 0 14.7 4M20 19v-4h-4" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" aria-label="Assistente digitando">
      <span className="h-2.5 w-2.5 animate-[typing-dot_1s_infinite] rounded-full bg-amber-400 [animation-delay:-0.2s]" />
      <span className="h-2.5 w-2.5 animate-[typing-dot_1s_infinite] rounded-full bg-amber-400 [animation-delay:-0.05s]" />
      <span className="h-2.5 w-2.5 animate-[typing-dot_1s_infinite] rounded-full bg-amber-400 [animation-delay:0.1s]" />
    </div>
  );
}

export default function StudyAssistantPanel({
  reference,
  translationLabel = "",
  chapterText,
  selectedVerseText = "",
  mode = "bible",
  contextLabel = "",
}: StudyAssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const effectiveReference = useMemo(() => {
    return reference || "Trecho atual";
  }, [reference]);

  const effectiveContextLabel = useMemo(() => {
    if (contextLabel) {
      return contextLabel;
    }

    if (mode === "pdf") {
      return "Leitura do PDF";
    }

    return effectiveReference;
  }, [contextLabel, effectiveReference, mode]);

  useEffect(() => {
    const pendingMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          typeof message.renderedContent === "string" &&
          message.renderedContent.length < message.content.length
      );

    if (!pendingMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== pendingMessage.id) {
            return message;
          }

          const currentRendered = message.renderedContent ?? "";
          const remaining = message.content.length - currentRendered.length;
          const nextStep = remaining > 120 ? 18 : remaining > 60 ? 10 : 5;
          const nextLength = Math.min(
            currentRendered.length + nextStep,
            message.content.length
          );

          return {
            ...message,
            renderedContent: message.content.slice(0, nextLength),
          };
        })
      );
    }, 18);

    return () => window.clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function askAssistant(nextQuestion: string) {
    const normalizedQuestion = nextQuestion.trim();

    if (!normalizedQuestion) {
      setErrorMessage("Escreva sua pergunta antes de consultar o assistente.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const nextUserMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: normalizedQuestion,
    };

    const historyForRequest = messages
      .slice(-5)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }))
      .concat({
        role: "user" as const,
        content: normalizedQuestion,
      });

    setMessages((current) => [...current, nextUserMessage]);
    setQuestion("");

    try {
      const response = await fetch("/api/study-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: normalizedQuestion,
          reference: effectiveReference,
          translation: translationLabel,
          selectedVerseText,
          chapterText,
          mode,
          contextLabel: effectiveContextLabel,
          history: historyForRequest,
        }),
      });

      const payload = await readJsonSafely<AssistantResponse>(response);

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error || "O assistente nao conseguiu responder agora."
        );
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.answer || "",
          renderedContent: "",
          source: payload.source,
          themes: payload.themes || [],
          doctrine: payload.doctrine || [],
          application: payload.application || [],
          keyPoints: payload.keyPoints || [],
          recommendedMaterials: payload.recommendedMaterials || [],
        },
      ]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "O assistente nao conseguiu responder agora."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function resetConversation() {
    setMessages([]);
    setQuestion("");
    setErrorMessage("");
    setIsLoading(false);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isLoading) {
      return;
    }

    void askAssistant(question);
  }

  const helperLabel = selectedVerseText
    ? "O assistente vai priorizar o versiculo selecionado e o contexto do capitulo."
    : mode === "pdf"
    ? "O assistente vai considerar o documento atual, a pagina em leitura e o contexto do material."
    : "O assistente vai considerar o contexto do capitulo atual.";

  function renderTagSection(
    title: string,
    items: string[] | undefined,
    tone: "amber" | "slate" | "emerald"
  ) {
    if (!items?.length) {
      return null;
    }

    const toneClasses =
      tone === "amber"
        ? "border-amber-300/30 bg-[#fff7e7] text-[#6e5630]"
        : tone === "emerald"
        ? "border-emerald-300/30 bg-[#eefbf4] text-[#2f6a49]"
        : "border-[#d9d2c7] bg-[#f7f3ec] text-[#63574c]";

    return (
      <section className="rounded-[20px] border border-[#eadfce] bg-white/75 px-4 py-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9b8e80]">
          {title}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${title}-${item}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses}`}
            >
              {item}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 z-[46] -translate-y-1/2 rounded-l-[24px] border border-r-0 border-amber-300/25 bg-[linear-gradient(180deg,rgba(255,199,80,0.98),rgba(245,168,32,0.96))] px-3 py-4 text-[11px] font-semibold tracking-[0.12em] text-[#23180a] shadow-[-14px_16px_36px_rgba(0,0,0,0.22)] transition hover:brightness-[1.03] xl:right-4 xl:top-auto xl:bottom-24 xl:translate-y-0 xl:rounded-[22px] xl:border-r xl:px-4 xl:py-3 xl:text-sm"
      >
        <span className="block xl:hidden [writing-mode:vertical-rl] [text-orientation:mixed]">
          Logos IA
        </span>
        <span className="hidden items-center gap-2 xl:inline-flex">
          <AssistantSparkIcon />
          Logos IA
        </span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[65]">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_34%),rgba(7,10,18,0.72)] backdrop-blur-[3px]"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-2 right-0 w-[calc(100vw-0.75rem)] max-w-[450px] overflow-hidden rounded-l-[30px] border border-r-0 border-white/60 bg-[#f7f4ef] text-[#141414] shadow-[-28px_0_80px_rgba(0,0,0,0.24)] xl:inset-y-5 xl:right-5 xl:w-[430px] xl:rounded-[30px] xl:border-r">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-[#e6dfd4] bg-[linear-gradient(180deg,#fffdfa,#f5f1e8)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#23180a,#3b2a12)] text-amber-300 shadow-[0_10px_28px_rgba(35,24,10,0.22)]">
                        <AssistantSparkIcon />
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-[#181512]">
                          Logos IA
                        </h2>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <p className="text-xs text-[#6f665c]">
                            Online para estudo
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={resetConversation}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5dccf] bg-white/85 text-[#7c6f61] transition hover:border-amber-300/60 hover:text-amber-700"
                      aria-label="Nova conversa"
                      title="Nova conversa"
                    >
                      <RefreshIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5dccf] bg-white/85 text-lg text-[#7c6f61] transition hover:border-amber-300/60 hover:text-[#2a2118]"
                      aria-label="Fechar assistente"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-[22px] border border-[#ebe2d7] bg-white/88 px-4 py-3 shadow-[0_8px_24px_rgba(24,21,18,0.05)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f6efe2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#977443]">
                      {mode === "pdf" ? "Leitura PDF" : "Biblia"}
                    </span>
                    {translationLabel ? (
                      <span className="rounded-full bg-[#f2f0eb] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6f665c]">
                        {translationLabel}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-[#191511]">
                    {effectiveContextLabel}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-[#72675d]">
                    {helperLabel}
                  </p>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[linear-gradient(180deg,#f7f4ef,#f1ece3)]">
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  {!messages.length && !isLoading ? (
                    <div className="space-y-4">
                      <div className="mx-auto w-fit rounded-full border border-[#eadfce] bg-white/85 px-4 py-1.5 text-[11px] font-medium text-[#8a7c6d]">
                        Conversa iniciada agora
                      </div>

                      <div className="max-w-[88%] rounded-[24px] rounded-bl-md bg-white px-4 py-4 text-sm leading-7 text-[#2c241d] shadow-[0_18px_34px_rgba(24,21,18,0.08)]">
                        Pergunte sobre o texto, contexto biblico, aplicacao pratica,
                        significado de termos ou livros do acervo que podem ajudar no
                        seu estudo.
                      </div>
                    </div>
                  ) : null}

                  {messages.length ? (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const hasFinishedRendering =
                          (message.renderedContent ?? "") === message.content;
                        const visibleContent =
                          message.renderedContent ?? message.content;

                        if (message.role === "user") {
                          return (
                            <div key={message.id} className="flex justify-end">
                              <div className="max-w-[86%] rounded-[24px] rounded-br-md bg-[linear-gradient(180deg,#ffcc59,#f0ab24)] px-4 py-3 text-sm leading-6 text-[#23180a] shadow-[0_16px_30px_rgba(240,171,36,0.22)]">
                                {message.content}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={message.id} className="space-y-3">
                            <div className="flex justify-start">
                              <div className="max-w-[92%] rounded-[24px] rounded-bl-md bg-white px-4 py-4 shadow-[0_18px_34px_rgba(24,21,18,0.08)]">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f160b] text-amber-300">
                                      <AssistantSparkIcon />
                                    </span>
                                    <div>
                                      <p className="text-sm font-semibold text-[#17130f]">
                                        Assistente de estudo
                                      </p>
                                      {visibleContent.length < message.content.length ? (
                                        <div className="mt-1">
                                          <TypingDots />
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  {message.source ? (
                                    <span className="rounded-full border border-[#eadfce] bg-[#faf5ec] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8f7d67]">
                                      {message.source}
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-[#2a241d]">
                                  {visibleContent}
                                  {visibleContent.length < message.content.length ? (
                                    <span className="ml-1 inline-block h-4 w-2 rounded-sm bg-amber-400 align-middle" />
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            {hasFinishedRendering ? (
                              <div className="space-y-3 pl-1">
                                {message.keyPoints?.length ? (
                                  <section className="rounded-[20px] border border-[#eadfce] bg-white/75 px-4 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#9b8e80]">
                                      Pontos-chave
                                    </p>
                                    <div className="mt-2 space-y-2">
                                      {message.keyPoints.map((point) => (
                                        <p
                                          key={`${message.id}-${point}`}
                                          className="border-l-2 border-amber-300 pl-3 text-sm leading-6 text-[#43382f]"
                                        >
                                          {point}
                                        </p>
                                      ))}
                                    </div>
                                  </section>
                                ) : null}

                                {renderTagSection(
                                  "Temas",
                                  message.themes,
                                  "amber"
                                )}

                                {renderTagSection(
                                  "Doutrina",
                                  message.doctrine,
                                  "slate"
                                )}

                                {renderTagSection(
                                  "Aplicacao",
                                  message.application,
                                  "emerald"
                                )}

                                {message.recommendedMaterials?.length ? (
                                  <section className="rounded-[20px] border border-[#eadfce] bg-white/75 px-4 py-3">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#9b8e80]">
                                      Leitura recomendada
                                    </p>
                                    <div className="mt-3 space-y-3">
                                      {message.recommendedMaterials.map((material) => (
                                        <Link
                                          key={`${message.id}-${material.id}`}
                                          href={`/material/${material.id}`}
                                          className="block rounded-2xl border border-[#eee5d9] bg-[#fcfaf7] px-3 py-3 transition hover:border-amber-300/50 hover:bg-white"
                                        >
                                          <p className="text-sm font-semibold text-[#17130f]">
                                            {material.title}
                                          </p>
                                          <p className="mt-1 text-sm leading-6 text-[#5e544b]">
                                            {material.description ||
                                              "Sem descricao cadastrada."}
                                          </p>
                                        </Link>
                                      ))}
                                    </div>
                                  </section>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="mt-4 flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfce] bg-white/90 px-4 py-2 text-sm text-[#776b5f] shadow-[0_12px_24px_rgba(24,21,18,0.06)]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        Respondendo sua pergunta...
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-[#e6dfd4] bg-[linear-gradient(180deg,#fbf8f3,#f3ede3)] px-4 py-4">
                  <div className="mb-3 flex snap-x gap-2 overflow-x-auto pb-1">
                    {DEFAULT_QUESTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          if (isLoading) {
                            return;
                          }

                          setQuestion(item);
                          void askAssistant(item);
                        }}
                        className="shrink-0 snap-start rounded-full border border-amber-300/30 bg-white px-3 py-2 text-[11px] font-medium text-[#6b5a44] shadow-[0_8px_18px_rgba(24,21,18,0.04)] transition hover:border-amber-400/50 hover:text-[#2b2115]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-[#e7dece] bg-white px-3 py-3 shadow-[0_12px_28px_rgba(24,21,18,0.06)]">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        onKeyDown={handleComposerKeyDown}
                        rows={3}
                        placeholder="Digite sua pergunta sobre o texto..."
                        className="min-h-[78px] flex-1 resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[#1f1b17] outline-none placeholder:text-[#9e9488]"
                      />

                      <button
                        type="button"
                        onClick={() => void askAssistant(question)}
                        disabled={isLoading}
                        className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffcc59,#f0ab24)] text-[#23180a] shadow-[0_14px_28px_rgba(240,171,36,0.24)] transition hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Enviar pergunta"
                      >
                        <SendIcon />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#f0e9dd] pt-2">
                      <p className="text-[11px] text-[#988d80]">
                        Enter envia • Shift + Enter quebra linha
                      </p>
                      <p className="text-[11px] font-medium text-[#8e7a5d]">
                        Estudo guiado
                      </p>
                    </div>
                  </div>

                  {errorMessage ? (
                    <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                      {errorMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes typing-dot {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.45;
          }

          40% {
            transform: translateY(-5px);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
