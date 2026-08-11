"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StudyAssistantPanelProps = {
  reference: string;
  translationLabel?: string;
  chapterText: string;
  selectedVerseText?: string;
  mode?: "bible" | "pdf";
  contextLabel?: string;
};

type DictionaryEntryPreview = {
  id: string;
  displayTerm: string;
  shortDefinition: string;
  language: string;
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
  keyPoints?: string[];
  dictionaryEntries?: DictionaryEntryPreview[];
  recommendedMaterials?: RecommendedMaterial[];
  error?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  renderedContent?: string;
  source?: string;
  keyPoints?: string[];
  dictionaryEntries?: DictionaryEntryPreview[];
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
          const nextLength = Math.min(
            currentRendered.length + 22,
            message.content.length
          );

          return {
            ...message,
            renderedContent: message.content.slice(0, nextLength),
          };
        })
      );
    }, 24);

    return () => window.clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
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
          keyPoints: payload.keyPoints || [],
          dictionaryEntries: payload.dictionaryEntries || [],
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

  const helperLabel = selectedVerseText
    ? "O assistente vai priorizar o versiculo selecionado e o contexto do capitulo."
    : mode === "pdf"
    ? "O assistente vai considerar o documento atual, a pagina em leitura e o contexto do material."
    : "O assistente vai considerar o contexto do capitulo atual.";

  function handleComposerKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (isLoading) {
      return;
    }

    void askAssistant(question);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 z-[46] -translate-y-1/2 rounded-l-2xl border border-r-0 border-amber-300/20 bg-[linear-gradient(180deg,rgba(34,27,15,0.96),rgba(17,13,9,0.98))] px-3 py-4 text-[11px] font-semibold tracking-[0.12em] text-amber-50 shadow-[-12px_18px_34px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:bg-[linear-gradient(180deg,rgba(44,35,18,0.98),rgba(20,15,10,0.99))] xl:right-4 xl:top-auto xl:bottom-24 xl:translate-y-0 xl:rounded-2xl xl:border-r xl:px-4 xl:py-3 xl:text-sm"
      >
        <span className="block xl:hidden [writing-mode:vertical-rl] [text-orientation:mixed]">
          Assistente
        </span>
        <span className="hidden xl:block">Assistente</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[65]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute inset-y-3 right-0 w-[calc(100vw-1.25rem)] max-w-[440px] overflow-hidden rounded-l-[28px] border border-r-0 border-white/10 bg-[linear-gradient(180deg,rgba(15,17,23,0.99),rgba(11,13,19,1))] text-white shadow-[-24px_0_70px_rgba(0,0,0,0.42)] backdrop-blur-xl xl:inset-y-6 xl:right-4 xl:w-[420px] xl:rounded-[28px] xl:border-r">
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-white/10 bg-[#11141b] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300/80">
                      Assistente de estudo
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      Conversa de estudo
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {effectiveContextLabel}
                      {translationLabel ? ` | ${translationLabel}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/10"
                  >
                    Fechar
                  </button>
                </div>

                <p className="mt-3 text-xs leading-6 text-zinc-500">
                  {helperLabel}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#0c0f15] px-4 py-4">
                  {!messages.length && !isLoading ? (
                    <div className="flex min-h-full items-start">
                      <div className="max-w-[88%] rounded-[20px] rounded-bl-md border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-zinc-300">
                        Use o assistente para pedir explicacao do texto, aplicacao pratica, contexto biblico ou recomendacao de leitura do proprio acervo.
                      </div>
                    </div>
                  ) : null}

                  {isLoading ? (
                    <div className="flex min-h-full items-start justify-end">
                      <div className="max-w-[88%] rounded-[20px] rounded-br-md border border-amber-300/14 bg-amber-300/8 px-4 py-4 text-sm leading-7 text-amber-50">
                        Respondendo sua pergunta...
                      </div>
                    </div>
                  ) : null}

                  {messages.length ? (
                    <div className="space-y-3">
                      {messages.map((message) =>
                        message.role === "user" ? (
                          <div key={message.id} className="flex justify-end">
                            <div className="max-w-[88%] rounded-[20px] rounded-br-md border border-white/8 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-zinc-100">
                              {message.content}
                            </div>
                          </div>
                        ) : (
                          <div key={message.id} className="space-y-3">
                            <div className="flex justify-start">
                              <div className="max-w-[92%] rounded-[20px] rounded-bl-md border border-amber-300/12 bg-[linear-gradient(180deg,rgba(251,191,36,0.07),rgba(251,191,36,0.02))] px-4 py-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-medium text-amber-100/80">
                                    Resposta
                                  </p>
                                  {message.source ? (
                                    <span className="rounded-full border border-amber-300/12 bg-amber-300/[0.06] px-2.5 py-1 text-[10px] font-medium text-amber-100/85">
                                      {message.source}
                                    </span>
                                  ) : null}
                                </div>

                                <p className="mt-3 text-sm leading-7 text-zinc-100">
                                  {message.renderedContent ?? message.content}
                                  {(message.renderedContent ?? "").length <
                                  message.content.length ? (
                                    <span className="ml-1 inline-block h-4 w-2 rounded-sm bg-amber-200/80 align-middle" />
                                  ) : null}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4 pl-1">
                              {(message.renderedContent ?? "") === message.content &&
                              message.keyPoints?.length ? (
                                <section>
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                    Pontos-chave
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {message.keyPoints.map((point) => (
                                      <p
                                        key={`${message.id}-${point}`}
                                        className="border-l border-amber-300/18 pl-3 text-sm leading-6 text-zinc-300"
                                      >
                                        {point}
                                      </p>
                                    ))}
                                  </div>
                                </section>
                              ) : null}

                              {(message.renderedContent ?? "") === message.content &&
                              message.dictionaryEntries?.length ? (
                                <section>
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                    Dicionario relacionado
                                  </p>
                                  <div className="mt-2 space-y-3">
                                    {message.dictionaryEntries.map((entry) => (
                                      <div key={`${message.id}-${entry.id}`} className="border-l border-white/10 pl-3">
                                        <div className="flex items-center gap-2">
                                          <p className="text-sm font-semibold text-white">
                                            {entry.displayTerm}
                                          </p>
                                          {entry.language ? (
                                            <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                              {entry.language}
                                            </span>
                                          ) : null}
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                                          {entry.shortDefinition}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              ) : null}

                              {(message.renderedContent ?? "") === message.content &&
                              message.recommendedMaterials?.length ? (
                                <section>
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                    Leitura recomendada
                                  </p>
                                  <div className="mt-2 space-y-3">
                                    {message.recommendedMaterials.map((material) => (
                                      <Link
                                        key={`${message.id}-${material.id}`}
                                        href={`/material/${material.id}`}
                                        className="block border-l border-sky-300/18 pl-3 transition hover:border-sky-300/32"
                                      >
                                        <p className="text-sm font-semibold text-white">
                                          {material.title}
                                        </p>
                                        <p className="mt-1 text-sm leading-6 text-zinc-400">
                                          {material.description || "Sem descricao cadastrada."}
                                        </p>
                                      </Link>
                                    ))}
                                  </div>
                                </section>
                              ) : null}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-white/10 bg-[#11141b] px-4 py-4">
                  <div className="mb-3 flex snap-x gap-2 overflow-x-auto pb-1">
                    {DEFAULT_QUESTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setQuestion(item);
                          void askAssistant(item);
                        }}
                        className="shrink-0 snap-start rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-300 transition hover:bg-white/[0.06]"
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-end gap-3">
                    <textarea
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      rows={3}
                      placeholder="Digite sua pergunta sobre o texto..."
                      className="min-h-[84px] flex-1 rounded-[18px] border border-white/8 bg-[#151821] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/40"
                    />

                    <div className="w-[88px] shrink-0">
                      <button
                        type="button"
                        onClick={() => void askAssistant(question)}
                        disabled={isLoading}
                        className="w-full rounded-[18px] bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? "Aguarde" : "Enviar"}
                      </button>
                    </div>
                  </div>

                  {errorMessage ? (
                    <p className="mt-3 text-sm text-red-300">{errorMessage}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
