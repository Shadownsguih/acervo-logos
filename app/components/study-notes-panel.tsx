"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase-browser";

type StudyNotesPanelProps = {
  currentDocumentTitle: string;
  variant?: "floating" | "embedded";
  embeddedLabel?: string;
  onOpenChange?: (isOpen: boolean) => void;
  noteContext?: {
    type: string;
    key: string;
    label: string;
  } | null;
};

type StudyNote = {
  id: string;
  title: string;
  content: string;
  context_type: string | null;
  context_key: string | null;
  context_label: string | null;
  created_at: string;
  updated_at: string;
};

type FloatingWindowState = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const AUTOSAVE_DELAY = 900;
const LAST_NOTE_STORAGE_KEY = "acervo-logos:last-study-note-id";
const WINDOW_STATE_STORAGE_KEY = "acervo-logos:study-notes-window-state";
const MOBILE_BREAKPOINT = 768;
const FULLSCREEN_WINDOW_MARGIN = 16;

const DEFAULT_WINDOW_STATE: FloatingWindowState = {
  x: 24,
  y: 24,
  width: 420,
  height: 640,
};

const MIN_WIDTH = 340;
const MIN_HEIGHT = 420;
const RESIZE_HANDLE_SIZE = 18;
const MINIMIZED_WINDOW_HEIGHT = 78;

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponivel";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 1440, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function isDocumentInFullscreen() {
  if (typeof document === "undefined") {
    return false;
  }

  return Boolean(document.fullscreenElement);
}

function normalizeWindowState(state: FloatingWindowState): FloatingWindowState {
  const viewport = getViewportSize();

  const maxWidth = Math.max(MIN_WIDTH, viewport.width - 16);
  const maxHeight = Math.max(MIN_HEIGHT, viewport.height - 16);

  const width = clamp(state.width, MIN_WIDTH, maxWidth);
  const height = clamp(state.height, MIN_HEIGHT, maxHeight);

  const maxX = Math.max(8, viewport.width - width - 8);
  const maxY = Math.max(8, viewport.height - height - 8);

  const x = clamp(state.x, 8, maxX);
  const y = clamp(state.y, 8, maxY);

  return { x, y, width, height };
}

function getFullscreenWindowState(): FloatingWindowState {
  const viewport = getViewportSize();
  const width = Math.min(460, Math.max(MIN_WIDTH, viewport.width * 0.34));
  const height = Math.min(
    Math.max(MIN_HEIGHT, viewport.height - FULLSCREEN_WINDOW_MARGIN * 2),
    760
  );

  return normalizeWindowState({
    x: Math.max(8, viewport.width - width - FULLSCREEN_WINDOW_MARGIN),
    y: FULLSCREEN_WINDOW_MARGIN,
    width,
    height,
  });
}

function getEmbeddedDesktopWindowState(): FloatingWindowState {
  const viewport = getViewportSize();
  const width = Math.min(620, Math.max(440, viewport.width - 120));
  const height = Math.min(760, Math.max(560, viewport.height - 120));

  return normalizeWindowState({
    x: Math.round((viewport.width - width) / 2),
    y: Math.max(24, Math.round((viewport.height - height) / 2)),
    width,
    height,
  });
}

function getInitialWindowState(): FloatingWindowState {
  if (typeof window === "undefined") {
    return DEFAULT_WINDOW_STATE;
  }

  if (isDocumentInFullscreen()) {
    return getFullscreenWindowState();
  }

  const raw = window.localStorage.getItem(WINDOW_STATE_STORAGE_KEY);

  if (!raw) {
    const viewport = getViewportSize();

    return normalizeWindowState({
      x: Math.max(12, viewport.width - DEFAULT_WINDOW_STATE.width - 24),
      y: 24,
      width: DEFAULT_WINDOW_STATE.width,
      height: DEFAULT_WINDOW_STATE.height,
    });
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FloatingWindowState>;

    return normalizeWindowState({
      x: typeof parsed.x === "number" ? parsed.x : DEFAULT_WINDOW_STATE.x,
      y: typeof parsed.y === "number" ? parsed.y : DEFAULT_WINDOW_STATE.y,
      width:
        typeof parsed.width === "number"
          ? parsed.width
          : DEFAULT_WINDOW_STATE.width,
      height:
        typeof parsed.height === "number"
          ? parsed.height
          : DEFAULT_WINDOW_STATE.height,
    });
  } catch {
    return DEFAULT_WINDOW_STATE;
  }
}

export default function StudyNotesPanel({
  currentDocumentTitle,
  variant = "floating",
  embeddedLabel = "Notas",
  onOpenChange,
  noteContext = null,
}: StudyNotesPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosaveRef = useRef<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeDataRef = useRef<{
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  } | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isNotesListOpen, setIsNotesListOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [windowState, setWindowState] = useState<FloatingWindowState>(() =>
    getInitialWindowState()
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const isEmbedded = variant === "embedded";
  const isEmbeddedDesktop = isEmbedded && !isMobile;
  const lastSelectedNoteStorageKey = useMemo(() => {
    if (!noteContext) {
      return LAST_NOTE_STORAGE_KEY;
    }

    return `${LAST_NOTE_STORAGE_KEY}:${noteContext.type}:${noteContext.key}`;
  }, [noteContext]);
  const scopedDocumentTitle = noteContext?.label ?? currentDocumentTitle;

  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  const minimizedTitle = selectedNote
    ? title.trim() || "Nova nota"
    : "Nenhuma nota selecionada";

  const filteredNotes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return notes;
    }

    return notes.filter((note) => {
      const normalizedTitle = (note.title ?? "").toLowerCase();
      const normalizedContent = (note.content ?? "").toLowerCase();

      return (
        normalizedTitle.includes(normalizedSearch) ||
        normalizedContent.includes(normalizedSearch)
      );
    });
  }, [notes, searchTerm]);

  useEffect(() => {
    onOpenChange?.(isOpen);

    return () => {
      onOpenChange?.(false);
    };
  }, [isOpen, onOpenChange]);

  function persistLastSelectedNote(noteId: string | null) {
    if (typeof window === "undefined") return;

    if (!noteId) {
      window.localStorage.removeItem(lastSelectedNoteStorageKey);
      return;
    }

    window.localStorage.setItem(lastSelectedNoteStorageKey, noteId);
  }

  function getPersistedLastSelectedNote() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(lastSelectedNoteStorageKey);
  }

  function persistWindowState(nextState: FloatingWindowState) {
    if (typeof window === "undefined" || isDocumentInFullscreen()) return;

    window.localStorage.setItem(
      WINDOW_STATE_STORAGE_KEY,
      JSON.stringify(nextState)
    );
  }

  function focusEditor() {
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }

  function applySelectedNote(note: StudyNote) {
    skipNextAutosaveRef.current = true;
    setSelectedNoteId(note.id);
    setTitle(note.title ?? "");
    setContent(note.content ?? "");
    persistLastSelectedNote(note.id);
    setErrorMessage("");
    setStatusMessage("");
    setIsNotesListOpen(false);
    focusEditor();
  }

  function openWindow() {
    if (isMobile) {
      setIsMinimized(false);
      setIsOpen(true);
      return;
    }

    if (isEmbeddedDesktop) {
      setWindowState(getEmbeddedDesktopWindowState());
      setIsMinimized(false);
      setIsOpen(true);
      return;
    }

    const nextState = isDocumentInFullscreen()
      ? getFullscreenWindowState()
      : normalizeWindowState(getInitialWindowState());

    setWindowState(nextState);
    setIsMinimized(false);
    setIsOpen(true);
  }

  function toggleMinimized() {
    if (isMobile || isEmbeddedDesktop) {
      return;
    }

    setIsMinimized((prev) => !prev);
  }

  function startDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (isMobile || isEmbeddedDesktop) {
      return;
    }

    if ((event.target as HTMLElement).closest("[data-no-drag='true']")) {
      return;
    }

    dragDataRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: windowState.x,
      originY: windowState.y,
    };

    setIsDragging(true);
  }

  function startResizing(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (isMobile || isEmbeddedDesktop || isMinimized) {
      return;
    }

    resizeDataRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originWidth: windowState.width,
      originHeight: windowState.height,
    };

    setIsResizing(true);
  }

  const loadNotes = useEffectEvent(async () => {
    setIsLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId("");
      setNotes([]);
      setSelectedNoteId(null);
      setIsLoading(false);
      setErrorMessage("Nao foi possivel identificar o usuario logado.");
      return;
    }

    setUserId(user.id);

    let query = supabase
      .from("study_notes")
      .select(
        "id, title, content, context_type, context_key, context_label, created_at, updated_at"
      )
      .order("updated_at", { ascending: false });

    if (noteContext) {
      query = query
        .eq("context_type", noteContext.type)
        .eq("context_key", noteContext.key);
    }

    const { data, error } = await query;

    if (error) {
      setNotes([]);
      setSelectedNoteId(null);
      setIsLoading(false);
      setErrorMessage("Nao foi possivel carregar suas notas.");
      return;
    }

    const loadedNotes = (data ?? []) as StudyNote[];
    setNotes(loadedNotes);

    if (loadedNotes.length > 0) {
      const lastSelectedId = getPersistedLastSelectedNote();
      const rememberedNote = lastSelectedId
        ? loadedNotes.find((note) => note.id === lastSelectedId) ?? null
        : null;

      const initialNote = rememberedNote ?? loadedNotes[0];

      skipNextAutosaveRef.current = true;
      setSelectedNoteId(initialNote.id);
      setTitle(initialNote.title ?? "");
      setContent(initialNote.content ?? "");
      persistLastSelectedNote(initialNote.id);
    } else {
      skipNextAutosaveRef.current = true;
      setSelectedNoteId(null);
      setTitle("");
      setContent("");
      persistLastSelectedNote(null);
    }

    setIsLoading(false);
  });

  useEffect(() => {
    function syncViewport() {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);

      if (mobile) {
        setIsMinimized(false);
      }
    }

    syncViewport();

    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadNotes();
    });
  }, [noteContext]);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedNoteId) return;

    window.localStorage.setItem(lastSelectedNoteStorageKey, selectedNoteId);
  }, [lastSelectedNoteStorageKey, selectedNoteId]);

  const saveCurrentNote = useCallback(
    async (nextTitle: string, nextContent: string) => {
      if (!selectedNoteId) return;

      setIsSaving(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("study_notes")
        .update({
          title: nextTitle.trim() || "Nova nota",
          content: nextContent,
          context_type: noteContext?.type ?? null,
          context_key: noteContext?.key ?? null,
          context_label: noteContext?.label ?? null,
        })
        .eq("id", selectedNoteId)
        .select(
          "id, title, content, context_type, context_key, context_label, created_at, updated_at"
        )
        .single();

      setIsSaving(false);

      if (error || !data) {
        setErrorMessage("Nao foi possivel salvar esta nota.");
        return;
      }

      const updatedNote = data as StudyNote;

      setNotes((prev) =>
        prev
          .map((note) => (note.id === updatedNote.id ? updatedNote : note))
          .sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
      );

      setStatusMessage(`Salvo em ${formatDate(updatedNote.updated_at)}.`);
    },
    [noteContext, selectedNoteId, supabase]
  );

  useEffect(() => {
    if (!isOpen || !selectedNoteId || isNotesListOpen || isMinimized) return;
    focusEditor();
  }, [isOpen, selectedNoteId, isNotesListOpen, isMinimized]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      const isSaveShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";

      if (isSaveShortcut) {
        event.preventDefault();

        if (!selectedNoteId || isSaving || isNotesListOpen) {
          return;
        }

        void saveCurrentNote(title, content);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (isNotesListOpen) {
          setIsNotesListOpen(false);
          return;
        }

        setIsOpen(false);
      }
    }

    function handlePointerMove(event: PointerEvent) {
      if (isMobile) {
        return;
      }

      if (dragDataRef.current) {
        const dx = event.clientX - dragDataRef.current.startX;
        const dy = event.clientY - dragDataRef.current.startY;

        const nextState = normalizeWindowState({
          ...windowState,
          x: dragDataRef.current.originX + dx,
          y: dragDataRef.current.originY + dy,
        });

        setWindowState((prev) => ({
          ...prev,
          x: nextState.x,
          y: nextState.y,
        }));

        return;
      }

      if (resizeDataRef.current) {
        const viewport = getViewportSize();

        const nextWidth =
          resizeDataRef.current.originWidth +
          (event.clientX - resizeDataRef.current.startX);
        const nextHeight =
          resizeDataRef.current.originHeight +
          (event.clientY - resizeDataRef.current.startY);

        const maxWidth = Math.max(MIN_WIDTH, viewport.width - windowState.x - 8);
        const maxHeight = Math.max(
          MIN_HEIGHT,
          viewport.height - windowState.y - 8
        );

        setWindowState((prev) => ({
          ...prev,
          width: clamp(nextWidth, MIN_WIDTH, maxWidth),
          height: clamp(nextHeight, MIN_HEIGHT, maxHeight),
        }));
      }
    }

    function handlePointerUp() {
      if (isMobile) {
        dragDataRef.current = null;
        resizeDataRef.current = null;
        setIsDragging(false);
        setIsResizing(false);
        return;
      }

      if (dragDataRef.current || resizeDataRef.current) {
        const normalized = normalizeWindowState(windowState);
        setWindowState(normalized);
        persistWindowState(normalized);
      }

      dragDataRef.current = null;
      resizeDataRef.current = null;
      setIsDragging(false);
      setIsResizing(false);
    }

    function handleResize() {
      if (isMobile) {
        return;
      }

      setWindowState((prev) => {
        const normalized = normalizeWindowState(prev);
        persistWindowState(normalized);
        return normalized;
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    isOpen,
    isNotesListOpen,
    selectedNoteId,
    isSaving,
    title,
    content,
    windowState,
    isMinimized,
    isMobile,
    saveCurrentNote,
  ]);

  async function handleCreateNote() {
    if (!userId) {
      setErrorMessage("Usuario nao encontrado.");
      return;
    }

    setIsCreating(true);
    setErrorMessage("");
    setStatusMessage("");

    const { data, error } = await supabase
      .from("study_notes")
      .insert({
        user_id: userId,
        title: noteContext?.label ?? "Nova nota",
        content: "",
        context_type: noteContext?.type ?? null,
        context_key: noteContext?.key ?? null,
        context_label: noteContext?.label ?? null,
      })
      .select(
        "id, title, content, context_type, context_key, context_label, created_at, updated_at"
      )
      .single();

    setIsCreating(false);

    if (error || !data) {
      setErrorMessage("Nao foi possivel criar uma nova nota.");
      return;
    }

    const newNote = data as StudyNote;

    setNotes((prev) => [newNote, ...prev]);
    setSearchTerm("");
    setIsMinimized(false);
    applySelectedNote(newNote);
    setStatusMessage("Nova nota criada.");
    setIsOpen(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function _saveCurrentNoteLegacy(
    nextTitle: string,
    nextContent: string
  ) {
    if (!selectedNoteId) return;

    setIsSaving(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("study_notes")
      .update({
        title: nextTitle.trim() || "Nova nota",
        content: nextContent,
        context_type: noteContext?.type ?? null,
        context_key: noteContext?.key ?? null,
        context_label: noteContext?.label ?? null,
      })
      .eq("id", selectedNoteId)
      .select(
        "id, title, content, context_type, context_key, context_label, created_at, updated_at"
      )
      .single();

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage("Nao foi possivel salvar esta nota.");
      return;
    }

    const updatedNote = data as StudyNote;

    setNotes((prev) =>
      prev
        .map((note) => (note.id === updatedNote.id ? updatedNote : note))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
    );

    setStatusMessage(`Salvo em ${formatDate(updatedNote.updated_at)}.`);
  }

  useEffect(() => {
    if (!selectedNoteId || isNotesListOpen) return;

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      void saveCurrentNote(title, content);
    }, AUTOSAVE_DELAY);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, selectedNoteId, isNotesListOpen, saveCurrentNote]);

  async function handleDeleteCurrentNote() {
    if (!selectedNoteId) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta nota?"
    );

    if (!confirmed) return;

    setErrorMessage("");
    setStatusMessage("");

    const deletingId = selectedNoteId;

    const { error } = await supabase
      .from("study_notes")
      .delete()
      .eq("id", deletingId);

    if (error) {
      setErrorMessage("Nao foi possivel excluir esta nota.");
      return;
    }

    const remainingNotes = notes.filter((note) => note.id !== deletingId);
    setNotes(remainingNotes);

    if (remainingNotes.length > 0) {
      const nextNote = remainingNotes[0];
      applySelectedNote(nextNote);
    } else {
      skipNextAutosaveRef.current = true;
      setSelectedNoteId(null);
      setTitle("");
      setContent("");
      persistLastSelectedNote(null);
      setIsNotesListOpen(false);
    }

    setStatusMessage("Nota excluida.");
  }

  const renderedWindowHeight = isMobile
    ? 0
    : isMinimized
    ? MINIMIZED_WINDOW_HEIGHT
    : windowState.height;

  const isDesktopFullscreen = !isMobile && isDocumentInFullscreen();
  const mainBodyHeight = Math.max(0, renderedWindowHeight - 84);

  return (
    <>
      <button
        type="button"
        onClick={openWindow}
        className={
          isEmbedded
            ? `inline-flex min-w-[92px] items-center justify-center gap-2 border font-medium transition ${
                isMobile
                  ? "rounded-xl border-white/10 bg-black/20 px-3 py-2 text-xs text-white hover:bg-white/5"
                  : "rounded-full border-white/12 bg-[#10131a]/92 px-3.5 py-2.5 text-[12px] text-zinc-100 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm hover:border-white/20 hover:bg-[#151922]"
              }`
            : `fixed z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-amber-400 font-semibold text-black shadow-lg transition hover:bg-amber-300 ${
                isMobile
                  ? "bottom-[calc(0.8rem+env(safe-area-inset-bottom))] right-3 h-11 w-[4.9rem] justify-center rounded-xl border border-white/12 bg-[linear-gradient(180deg,rgba(27,31,39,0.95),rgba(12,15,22,0.98))] px-2.5 text-center text-[10px] font-medium text-zinc-100 shadow-[0_-12px_28px_rgba(0,0,0,0.16)] backdrop-blur-xl hover:bg-white/[0.08]"
                  : "bottom-5 right-5 px-4 py-3 text-sm"
              }`
        }
      >
        <span className={isMobile ? "leading-none" : ""}>
          {isEmbedded ? embeddedLabel : isMobile ? "Notas" : "Bloco de notas"}
        </span>
      </button>

      {isOpen ? (
        <div className="pointer-events-none fixed inset-0 z-50">
          <div
            className="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />

          <div
            className={`pointer-events-auto overflow-hidden border border-white/10 bg-[#0f1117] text-white shadow-2xl ${
              isDragging || isResizing ? "select-none" : ""
            } ${
              isMobile
                ? "fixed inset-x-0 bottom-0 rounded-t-[1.5rem] rounded-b-none"
                : isEmbeddedDesktop
                ? "fixed bottom-24 right-6 rounded-[28px]"
                : "fixed rounded-2xl transition-[height] duration-200"
            }`}
            style={
              isMobile
                ? {
                    height: "84vh",
                    paddingBottom: "env(safe-area-inset-bottom)",
                  }
                : isEmbeddedDesktop
                ? {
                    width: "min(620px, calc(100vw - 4rem))",
                    height: "min(78vh, 760px)",
                  }
                : {
                    left: windowState.x,
                    top: windowState.y,
                    width: windowState.width,
                    height: renderedWindowHeight,
                  }
            }
          >
            <div className="flex h-full min-h-0 flex-col">
              <div
                onPointerDown={startDragging}
                className={`shrink-0 border-b border-white/10 bg-[#12151d] ${
                  isMobile
                    ? "cursor-default px-4 py-3"
                    : isEmbeddedDesktop
                    ? "cursor-default px-5 py-4"
                    : isMinimized
                    ? "cursor-move px-3 py-2"
                    : isDesktopFullscreen
                    ? "cursor-move px-3 py-2.5"
                    : "cursor-move px-4 py-3"
                }`}
              >
                {isMobile ? (
                  <div className="mb-2 flex justify-center">
                    <span className="h-1.5 w-12 rounded-full bg-white/15" />
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`uppercase tracking-[0.24em] text-amber-400 ${
                        isMinimized ? "text-[10px]" : "text-[11px]"
                      }`}
                    >
                      Bloco de notas
                    </p>

                    {isMinimized ? (
                      <div className="mt-0.5">
                        <h2 className="truncate text-[13px] font-semibold text-white">
                          {minimizedTitle}
                        </h2>
                        <p className="truncate text-[10px] text-zinc-400">
                          {scopedDocumentTitle}
                        </p>
                      </div>
                    ) : (
                      <>
                        <h2 className="mt-1 text-sm font-semibold">
                          Anotacoes de estudo
                        </h2>
                        <p className="mt-1 truncate text-[11px] text-zinc-400">
                          {scopedDocumentTitle}
                        </p>
                      </>
                    )}
                  </div>

                  <div
                    data-no-drag="true"
                    className={`flex shrink-0 items-center ${
                      isMinimized ? "gap-1.5" : "gap-2"
                    }`}
                  >
                    {!isMobile && !isEmbeddedDesktop ? (
                      <button
                        type="button"
                        onClick={toggleMinimized}
                        className={`rounded-lg border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10 ${
                          isMinimized
                            ? "px-2.5 py-1 text-[10px]"
                            : "px-3 py-1.5 text-[11px]"
                        }`}
                      >
                        {isMinimized ? "Restaurar" : "Minimizar"}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className={`rounded-lg border border-white/10 bg-white/5 font-medium text-white transition hover:bg-white/10 ${
                        isMinimized
                          ? "px-2.5 py-1 text-[10px]"
                          : "px-3 py-1.5 text-[11px]"
                      }`}
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                <p
                  className={`text-zinc-500 ${
                    isMinimized ? "mt-1 text-[10px]" : "mt-2 text-[11px]"
                  }`}
                >
                  {isMobile
                    ? "Painel otimizado para celular."
                    : isMinimized
                    ? "Painel minimizado | arraste pelo topo"
                    : isDesktopFullscreen
                    ? "Modo tela cheia | arraste pelo topo | Esc fecha"
                    : "Arraste pelo topo | redimensione no canto inferior direito | Ctrl+S/Cmd+S salva | Esc fecha"}
                </p>
              </div>

              {!isMinimized ? (
                <div
                  className="relative flex-1 overflow-hidden"
                  style={
                    isMobile || isEmbeddedDesktop
                      ? undefined
                      : { height: mainBodyHeight }
                  }
                >
                  <div
                    className={`absolute inset-0 transition-transform duration-200 ${
                      isNotesListOpen ? "-translate-x-full" : "translate-x-0"
                    }`}
                  >
                    <div className="flex h-full min-h-0 flex-col">
                      <div className="shrink-0 border-b border-white/10 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCreateNote}
                            disabled={isCreating || isLoading}
                            className="rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isCreating ? "Criando..." : "Nova nota"}
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsNotesListOpen(true)}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-white/10"
                          >
                            Minhas notas
                          </button>
                        </div>
                      </div>

                      <section className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0 border-b border-white/10 px-4 py-4">
                          {selectedNote ? (
                            <>
                              <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Titulo da nota"
                                className="w-full rounded-xl border border-white/10 bg-[#151821] px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
                              />

                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveCurrentNote(title, content)}
                                  disabled={isSaving}
                                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isSaving ? "Salvando..." : "Salvar agora"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => void handleDeleteCurrentNote()}
                                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                                >
                                  Excluir
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                              {noteContext
                                ? `Crie uma nova nota para ${scopedDocumentTitle}.`
                                : "Crie uma nova nota para comecar."}
                            </div>
                          )}

                          {errorMessage ? (
                            <p className="mt-3 text-sm text-red-400">
                              {errorMessage}
                            </p>
                          ) : isSaving ? (
                            <p className="mt-3 flex items-center gap-2 text-sm text-yellow-400">
                              <span>•</span>
                              <span>Salvando...</span>
                            </p>
                          ) : statusMessage ? (
                            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                              <span>•</span>
                              <span>{statusMessage}</span>
                            </p>
                          ) : (
                            <p className="mt-3 text-xs text-zinc-500">
                              As alteracoes sao salvas automaticamente enquanto voce
                              escreve.
                            </p>
                          )}
                        </div>

                        <div className="min-h-0 flex-1 p-4">
                          {selectedNote ? (
                            <textarea
                              ref={textareaRef}
                              value={content}
                              onChange={(e) => setContent(e.target.value)}
                              placeholder="Escreva aqui suas anotacoes de estudo..."
                              className="h-full min-h-0 w-full resize-none rounded-2xl border border-white/10 bg-[#151821] p-4 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-400">
                              {noteContext
                                ? `Nenhuma nota selecionada para ${scopedDocumentTitle}.`
                                : "Nenhuma nota selecionada."}
                            </div>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>

                  <div
                    className={`absolute inset-0 transition-transform duration-200 ${
                      isNotesListOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                  >
                    <div className="flex h-full min-h-0 flex-col bg-[#0f1117]">
                      <div className="shrink-0 border-b border-white/10 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-400">
                              Minhas notas
                            </p>
                            <h3 className="mt-1 text-sm font-semibold text-white">
                              Escolha uma nota salva
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsNotesListOpen(false)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-white/10"
                          >
                            Voltar
                          </button>
                        </div>

                        <div className="mt-3">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar notas..."
                            className="w-full rounded-xl border border-white/10 bg-[#151821] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-400/60"
                          />
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto bg-[#11131a] p-3">
                        {isLoading ? (
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                            Carregando notas...
                          </div>
                        ) : notes.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                            {noteContext ? (
                              <>
                                Voce ainda nao tem notas para{" "}
                                <strong>{scopedDocumentTitle}</strong>. Clique
                                em <strong>Nova nota</strong> para comecar.
                              </>
                            ) : (
                              <>
                                Voce ainda nao tem notas. Clique em{" "}
                                <strong>Nova nota</strong> para comecar.
                              </>
                            )}
                          </div>
                        ) : filteredNotes.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
                            Nenhuma nota encontrada para essa busca.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {filteredNotes.map((note) => {
                              const isActive = note.id === selectedNoteId;

                              return (
                                <button
                                  key={note.id}
                                  type="button"
                                  onClick={() => applySelectedNote(note)}
                                  className={`relative w-full rounded-2xl border p-3 text-left transition ${
                                    isActive
                                      ? "border-amber-400 bg-amber-400/10 shadow-md shadow-amber-400/10"
                                      : "border-white/10 bg-white/5 hover:bg-white/10"
                                  }`}
                                >
                                  {isActive ? (
                                    <span className="absolute left-0 top-0 h-full w-1 rounded-l-2xl bg-amber-400" />
                                  ) : null}

                                  <p className="truncate text-sm font-semibold text-white">
                                    {note.title?.trim() || "Nova nota"}
                                  </p>

                                  {note.context_label ? (
                                    <p className="mt-1 truncate text-[11px] text-amber-300/80">
                                      {note.context_label}
                                    </p>
                                  ) : null}

                                  <p className="mt-2 line-clamp-2 text-xs text-zinc-400">
                                    {note.content?.trim()
                                      ? note.content
                                      : "Sem conteudo ainda."}
                                  </p>

                                  <p className="mt-3 text-[11px] text-zinc-500">
                                    {formatDate(note.updated_at)}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {!isMobile && !isMinimized && !isEmbeddedDesktop ? (
              <button
                type="button"
                aria-label="Redimensionar bloco de notas"
                onPointerDown={startResizing}
                className="absolute bottom-0 right-0 z-10"
                style={{
                  width: RESIZE_HANDLE_SIZE,
                  height: RESIZE_HANDLE_SIZE,
                  cursor: "nwse-resize",
                }}
              >
                <span className="absolute bottom-[4px] right-[4px] h-[10px] w-[10px] border-b-2 border-r-2 border-amber-400/70" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

