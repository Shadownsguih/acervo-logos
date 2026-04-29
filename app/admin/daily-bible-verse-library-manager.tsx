"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DailyVerseLibraryItem = {
  id: string;
  version: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
  insight: string;
  displayOrder: number | null;
  isActive: boolean;
};

type DailyVerseLibraryManagerProps = {
  items: DailyVerseLibraryItem[];
};

type DailyVerseFormState = {
  version: string;
  book: string;
  abbrev: string;
  chapter: string;
  verse: string;
  reference: string;
  text: string;
  insight: string;
  displayOrder: string;
  isActive: boolean;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
  targetId: string;
};

const emptyForm: DailyVerseFormState = {
  version: "NVI",
  book: "",
  abbrev: "",
  chapter: "",
  verse: "",
  reference: "",
  text: "",
  insight: "",
  displayOrder: "",
  isActive: true,
};

const fieldClassName =
  "w-full rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-300/60 focus:bg-[#141924]";

export default function DailyBibleVerseLibraryManager({
  items,
}: DailyVerseLibraryManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState<DailyVerseFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<DailyVerseFormState>(emptyForm);
  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) =>
      [
        item.reference,
        item.book,
        item.version,
        item.text,
        item.insight,
        item.abbrev ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [items, search]);

  function fillFormFromItem(item: DailyVerseLibraryItem): DailyVerseFormState {
    return {
      version: item.version,
      book: item.book,
      abbrev: item.abbrev ?? "",
      chapter: String(item.chapter),
      verse: String(item.verse),
      reference: item.reference,
      text: item.text,
      insight: item.insight,
      displayOrder:
        typeof item.displayOrder === "number" && item.displayOrder > 0
          ? String(item.displayOrder)
          : "",
      isActive: item.isActive,
    };
  }

  function normalizePayload(form: DailyVerseFormState) {
    const chapter = Number(form.chapter);
    const verse = Number(form.verse);
    const displayOrder = form.displayOrder.trim()
      ? Number(form.displayOrder.trim())
      : null;

    if (!form.version.trim()) {
      throw new Error("A traducao e obrigatoria.");
    }

    if (!form.book.trim()) {
      throw new Error("O livro e obrigatorio.");
    }

    if (!Number.isInteger(chapter) || chapter <= 0) {
      throw new Error("O capitulo deve ser um numero inteiro maior que zero.");
    }

    if (!Number.isInteger(verse) || verse <= 0) {
      throw new Error("O versiculo deve ser um numero inteiro maior que zero.");
    }

    if (!form.reference.trim()) {
      throw new Error("A referencia e obrigatoria.");
    }

    if (!form.text.trim()) {
      throw new Error("O texto do versiculo e obrigatorio.");
    }

    if (!form.insight.trim()) {
      throw new Error("O texto reflexivo e obrigatorio.");
    }

    if (
      displayOrder !== null &&
      (!Number.isInteger(displayOrder) || displayOrder <= 0)
    ) {
      throw new Error("A ordem deve ser um numero inteiro maior que zero.");
    }

    return {
      version: form.version.trim(),
      book: form.book.trim(),
      abbrev: form.abbrev.trim() || null,
      chapter,
      verse,
      reference: form.reference.trim(),
      text: form.text.trim(),
      insight: form.insight.trim(),
      displayOrder,
      isActive: form.isActive,
    };
  }

  async function handleCreate() {
    setFeedback(null);

    try {
      const payload = normalizePayload(createForm);
      setSavingCreate(true);

      const response = await fetch("/api/admin/daily-bible-verse-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Nao foi possivel criar o versiculo.");
      }

      setCreateForm(emptyForm);
      setFeedback({
        type: "success",
        message: "Versiculo curado criado com sucesso.",
        targetId: "create",
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao criar o versiculo.",
        targetId: "create",
      });
    } finally {
      setSavingCreate(false);
    }
  }

  function startEditing(item: DailyVerseLibraryItem) {
    setFeedback(null);
    setEditingId(item.id);
    setEditForm(fillFormFromItem(item));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(emptyForm);
    setFeedback(null);
  }

  async function handleSave(itemId: string) {
    setFeedback(null);

    try {
      const payload = normalizePayload(editForm);
      setSavingEdit(true);

      const response = await fetch(
        `/api/admin/daily-bible-verse-library/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Nao foi possivel atualizar o versiculo."
        );
      }

      setEditingId(null);
      setFeedback({
        type: "success",
        message: "Versiculo curado atualizado com sucesso.",
        targetId: itemId,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao atualizar o versiculo.",
        targetId: itemId,
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(itemId: string) {
    setFeedback(null);

    try {
      setDeletingId(itemId);

      const response = await fetch(
        `/api/admin/daily-bible-verse-library/${itemId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Nao foi possivel excluir o versiculo.");
      }

      setFeedback({
        type: "success",
        message: "Versiculo curado removido com sucesso.",
        targetId: itemId,
      });
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao excluir o versiculo.",
        targetId: itemId,
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.32em] text-amber-300">
            Curadoria
          </p>
          <h2 className="mt-3 text-2xl font-bold text-white md:text-3xl">
            Versiculos diarios
          </h2>
          <p className="mt-4 text-zinc-400">
            Cadastre, edite, ative e reorganize a biblioteca de versiculos
            diarios com o texto reflexivo que aparece na home.
          </p>
        </div>

        <div className="w-full md:max-w-md">
          <label htmlFor="daily-verse-search" className="sr-only">
            Buscar versiculo curado
          </label>
          <input
            id="daily-verse-search"
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por referencia, livro, texto ou reflexao"
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-white/10 bg-[#0b0f16]/80 p-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">
          Novo versiculo curado
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <input
            type="text"
            value={createForm.version}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                version: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Traducao"
          />
          <input
            type="text"
            value={createForm.reference}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                reference: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Referencia"
          />
          <input
            type="text"
            value={createForm.book}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                book: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Livro"
          />
          <input
            type="text"
            value={createForm.abbrev}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                abbrev: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Abreviacao"
          />
          <input
            type="number"
            min={1}
            value={createForm.chapter}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                chapter: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Capitulo"
          />
          <input
            type="number"
            min={1}
            value={createForm.verse}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                verse: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Versiculo"
          />
          <input
            type="number"
            min={1}
            value={createForm.displayOrder}
            onChange={(event) =>
              setCreateForm((current) => ({
                ...current,
                displayOrder: event.target.value,
              }))
            }
            className={fieldClassName}
            placeholder="Ordem de exibicao"
          />
          <label className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  isActive: event.target.checked,
                }))
              }
            />
            Ativo na rotacao
          </label>
        </div>

        <textarea
          value={createForm.text}
          onChange={(event) =>
            setCreateForm((current) => ({
              ...current,
              text: event.target.value,
            }))
          }
          rows={4}
          className={`${fieldClassName} mt-4`}
          placeholder="Texto do versiculo"
        />

        <textarea
          value={createForm.insight}
          onChange={(event) =>
            setCreateForm((current) => ({
              ...current,
              insight: event.target.value,
            }))
          }
          rows={5}
          className={`${fieldClassName} mt-4`}
          placeholder="Texto unico da explicacao/reflexao"
        />

        {feedback?.targetId === "create" ? (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/20 bg-red-500/10 text-red-300"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={savingCreate}
            className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingCreate ? "Salvando..." : "Criar versiculo curado"}
          </button>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {filteredItems.length > 0 ? (
          filteredItems.map((item, index) => {
            const itemFeedback =
              feedback?.targetId === item.id ? feedback : null;
            const isEditing = editingId === item.id;

            return (
              <article
                key={item.id}
                className="rounded-[28px] border border-white/10 bg-[#0b0f16]/85 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
                        #{index + 1}
                      </span>
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        {item.version}
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          item.isActive
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border-zinc-500/20 bg-zinc-500/10 text-zinc-400"
                        }`}
                      >
                        {item.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-2xl font-bold text-white">
                      {item.reference}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-300">
                      {item.text}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-zinc-400">
                      {item.insight}
                    </p>
                  </div>

                  <div className="grid gap-3 lg:w-64">
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
                      <p>Livro: {item.book}</p>
                      <p className="mt-2">
                        Capitulo {item.chapter} | Versiculo {item.verse}
                      </p>
                      <p className="mt-2">
                        Ordem: {item.displayOrder ?? "Sem ordem"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:bg-amber-300/15"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === item.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </div>

                {itemFeedback ? (
                  <div
                    className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                      itemFeedback.type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                    }`}
                  >
                    {itemFeedback.message}
                  </div>
                ) : null}

                {isEditing ? (
                  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        value={editForm.version}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            version: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Traducao"
                      />
                      <input
                        type="text"
                        value={editForm.reference}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            reference: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Referencia"
                      />
                      <input
                        type="text"
                        value={editForm.book}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            book: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Livro"
                      />
                      <input
                        type="text"
                        value={editForm.abbrev}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            abbrev: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Abreviacao"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editForm.chapter}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            chapter: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Capitulo"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editForm.verse}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            verse: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Versiculo"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editForm.displayOrder}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            displayOrder: event.target.value,
                          }))
                        }
                        className={fieldClassName}
                        placeholder="Ordem de exibicao"
                      />
                      <label className="flex items-center gap-3 rounded-[20px] border border-white/10 bg-[#11151d] px-4 py-3 text-sm text-zinc-200">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              isActive: event.target.checked,
                            }))
                          }
                        />
                        Ativo na rotacao
                      </label>
                    </div>

                    <textarea
                      value={editForm.text}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          text: event.target.value,
                        }))
                      }
                      rows={4}
                      className={`${fieldClassName} mt-4`}
                    />

                    <textarea
                      value={editForm.insight}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          insight: event.target.value,
                        }))
                      }
                      rows={5}
                      className={`${fieldClassName} mt-4`}
                    />

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => void handleSave(item.id)}
                        disabled={savingEdit}
                        className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingEdit ? "Salvando..." : "Salvar alteracoes"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={savingEdit}
                        className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-[#0b0f16]/82 p-8 text-center text-zinc-400">
            Nenhum versiculo curado encontrado para a busca informada.
          </div>
        )}
      </div>
    </section>
  );
}
