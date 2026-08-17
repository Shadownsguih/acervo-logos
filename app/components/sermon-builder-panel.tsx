"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { OPEN_SERMON_BUILDER_EVENT } from "@/app/components/sermon-builder-events";

type SermonBuilderPanelProps = {
  isEnabled: boolean;
};

type TranslationOption = {
  id: string;
  label: string;
  value: string;
  availability: "ready";
};

type BookOption = {
  id: string;
  label: string;
  abbrev: string | null;
  chapters: number;
  testament: "AT" | "NT";
};

type VerseItem = {
  version: string;
  book: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

type PassageResponse = {
  version: string;
  book: string;
  bookSlug: string;
  abbrev: string | null;
  chapter: number;
  verses: VerseItem[];
};

type MainPoint = {
  id: string;
  title: string;
  content: string;
};

type SermonRecord = {
  id: string;
  title: string;
  timer_enabled: boolean;
  timer_minutes: number | null;
  reference_version: string | null;
  reference_book: string | null;
  reference_chapter: number | null;
  reference_verse_start: number | null;
  reference_verse_end: number | null;
  reference_label: string | null;
  reference_text: string | null;
  introduction: string;
  main_points: unknown;
  conclusion: string;
  application: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type SermonDraft = {
  title: string;
  referenceVersion: string;
  referenceBook: string;
  referenceChapter: string;
  referenceVerseStart: string;
  referenceVerseEnd: string;
  referenceLabel: string;
  referenceText: string;
  introduction: string;
  mainPoints: MainPoint[];
  conclusion: string;
  application: string;
  notes: string;
};

type SermonAssistantOutline = {
  title?: string;
  introduction?: string;
  mainPoints?: Array<{
    title?: string;
    content?: string;
  }>;
  application?: string;
  conclusion?: string;
};

type SermonAiAction =
  | "outline"
  | "introduction"
  | "main_points"
  | "conclusion"
  | "notes_to_point"
  | "point_refine";

type SermonPointInsertPosition = "inicio" | "meio" | "fim";
type SermonPointAiMode = "improve" | "expand" | "retone";

type SermonAiTone =
  | "expositivo"
  | "devocional"
  | "evangelistico"
  | "doutrinario"
  | "pastoral";

const AUTOSAVE_DELAY = 900;
const SERMON_STORAGE_KEY = "acervo-logos:last-sermon-id";
const MOBILE_BREAKPOINT = 768;

const EMPTY_MAIN_POINT = (): MainPoint => ({
  id: crypto.randomUUID(),
  title: "",
  content: "",
});

const EMPTY_DRAFT = (): SermonDraft => ({
  title: "",
  referenceVersion: "",
  referenceBook: "",
  referenceChapter: "1",
  referenceVerseStart: "",
  referenceVerseEnd: "",
  referenceLabel: "",
  referenceText: "",
  introduction: "",
  mainPoints: [EMPTY_MAIN_POINT()],
  conclusion: "",
  application: "",
  notes: "",
});

function normalizeMainPoints(value: unknown): MainPoint[] {
  if (!Array.isArray(value)) {
    return [EMPTY_MAIN_POINT()];
  }

  const parsed = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<MainPoint>;

      return {
        id: typeof candidate.id === "string" && candidate.id
          ? candidate.id
          : crypto.randomUUID(),
        title: typeof candidate.title === "string" ? candidate.title : "",
        content: typeof candidate.content === "string" ? candidate.content : "",
      };
    })
    .filter(Boolean) as MainPoint[];

  return parsed.length ? parsed : [EMPTY_MAIN_POINT()];
}

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

function getFilledSermonSections(sermon: SermonRecord) {
  const points = normalizeMainPoints(sermon.main_points);

  return [
    sermon.reference_label?.trim(),
    sermon.introduction.trim(),
    points.some((point) => point.title.trim() || point.content.trim())
      ? "points"
      : "",
    sermon.application.trim(),
    sermon.conclusion.trim(),
    sermon.notes.trim(),
  ].filter(Boolean).length;
}

function getSermonStageLabel(sermon: SermonRecord) {
  const filledSections = getFilledSermonSections(sermon);

  if (filledSections >= 6) {
    return "Pronto para ministrar";
  }

  if (filledSections >= 4) {
    return "Em refinamento";
  }

  if (filledSections >= 2) {
    return "Em construcao";
  }

  return "Rascunho inicial";
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function autoResizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) {
    return;
  }

  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
}

function buildDraftFromRecord(record: SermonRecord): SermonDraft {
  return {
    title: record.title ?? "",
    referenceVersion: record.reference_version ?? "",
    referenceBook: record.reference_book ?? "",
    referenceChapter: record.reference_chapter
      ? String(record.reference_chapter)
      : "1",
    referenceVerseStart: record.reference_verse_start
      ? String(record.reference_verse_start)
      : "",
    referenceVerseEnd: record.reference_verse_end
      ? String(record.reference_verse_end)
      : "",
    referenceLabel: record.reference_label ?? "",
    referenceText: record.reference_text ?? "",
    introduction: record.introduction ?? "",
    mainPoints: normalizeMainPoints(record.main_points),
    conclusion: record.conclusion ?? "",
    application: record.application ?? "",
    notes: record.notes ?? "",
  };
}

function SermonIcon() {
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
      <path d="M6 3.5h8.5L18 7v13.5H6z" />
      <path d="M14 3.5V7h4" />
      <path d="M9 11h6" />
      <path d="M9 14.5h6" />
      <path d="M9 18h4" />
    </svg>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMultilineHtml(value: string) {
  return escapeHtml(value.trim()).replace(/\n/g, "<br />");
}

function buildSermonPdfHtml(draft: SermonDraft) {
  const visiblePoints = draft.mainPoints.filter(
    (point) => point.title.trim() || point.content.trim()
  );

  const sections: string[] = [];

  if (draft.introduction.trim()) {
    sections.push(`
      <section>
        <h2>Introdução</h2>
        <p>${formatMultilineHtml(draft.introduction)}</p>
      </section>
    `);
  }

  if (visiblePoints.length) {
    sections.push(`
      <section>
        <h2>Pontos Principais</h2>
        ${visiblePoints
          .map(
            (point, index) => `
              <article class="point">
                <h3>${index + 1}. ${escapeHtml(
                  point.title.trim() || `Ponto ${index + 1}`
                )}</h3>
                <p>${formatMultilineHtml(point.content)}</p>
              </article>
            `
          )
          .join("")}
      </section>
    `);
  }

  if (draft.application.trim()) {
    sections.push(`
      <section>
        <h2>Aplicação</h2>
        <p>${formatMultilineHtml(draft.application)}</p>
      </section>
    `);
  }

  if (draft.conclusion.trim()) {
    sections.push(`
      <section>
        <h2>Conclusão</h2>
        <p>${formatMultilineHtml(draft.conclusion)}</p>
      </section>
    `);
  }

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(draft.title.trim() || "Esboço de Sermão")}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #171717;
        background: #ffffff;
      }

      .sheet {
        width: min(820px, 100%);
        margin: 0 auto;
        padding: 42px 34px 56px;
      }

      .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.24em;
        text-transform: uppercase;
        color: #b7791f;
      }

      h1 {
        margin: 12px 0 0;
        font-size: 30px;
        line-height: 1.15;
      }

      .reference-box {
        margin-top: 24px;
        border: 1px solid #e6dccb;
        border-radius: 18px;
        background: #fbf7ef;
        padding: 18px 20px;
      }

      .reference-title {
        margin: 0 0 10px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #8b6b3e;
      }

      .reference-label {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 700;
        color: #1c1917;
      }

      .reference-text {
        margin: 0;
        font-size: 14px;
        line-height: 1.75;
        color: #2f2a25;
        white-space: pre-line;
      }

      section {
        margin-top: 28px;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #8b6b3e;
      }

      h3 {
        margin: 0 0 8px;
        font-size: 17px;
        color: #1f2937;
      }

      p {
        margin: 0;
        font-size: 15px;
        line-height: 1.8;
      }

      .point + .point {
        margin-top: 18px;
      }

      .footer {
        margin-top: 34px;
        padding-top: 14px;
        border-top: 1px solid #ece7de;
        font-size: 12px;
        color: #6b7280;
      }

      @page {
        size: A4;
        margin: 14mm;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .sheet {
          width: 100%;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <p class="eyebrow">Meu Sermonário | Esboço de Sermão</p>
      <h1>${escapeHtml(draft.title.trim() || "Esboço de Sermão")}</h1>

      ${
        draft.referenceLabel.trim() || draft.referenceText.trim()
          ? `
            <section class="reference-box">
              <p class="reference-title">Texto de Referência</p>
              ${
                draft.referenceLabel.trim()
                  ? `<p class="reference-label">${escapeHtml(
                      draft.referenceLabel
                    )}</p>`
                  : ""
              }
              ${
                draft.referenceText.trim()
                  ? `<p class="reference-text">${formatMultilineHtml(
                      draft.referenceText
                    )}</p>`
                  : ""
              }
            </section>
          `
          : ""
      }

      ${sections.join("")}

      <p class="footer">Gerado no Acervo Logos para uso em estudo e pregação.</p>
    </main>
  </body>
</html>`;
}

export default function SermonBuilderPanel({
  isEnabled,
}: SermonBuilderPanelProps) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosaveRef = useRef(true);
  const manuscriptContainerRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "editor" | "manuscript" | "library"
  >("editor");
  const [userId, setUserId] = useState("");
  const [sermons, setSermons] = useState<SermonRecord[]>([]);
  const [selectedSermonId, setSelectedSermonId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SermonDraft>(() => EMPTY_DRAFT());
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateWarningOpen, setIsCreateWarningOpen] = useState(false);
  const [isRefreshingManuscript, setIsRefreshingManuscript] = useState(false);
  const [isManuscriptFullscreen, setIsManuscriptFullscreen] = useState(false);
  const [generatingAiAction, setGeneratingAiAction] =
    useState<SermonAiAction | null>(null);
  const [isAiGuideOpen, setIsAiGuideOpen] = useState(false);
  const [aiTheme, setAiTheme] = useState("");
  const [aiObjective, setAiObjective] = useState("");
  const [aiTone, setAiTone] = useState<SermonAiTone>("expositivo");
  const [notesPointInsertPosition, setNotesPointInsertPosition] =
    useState<SermonPointInsertPosition>("fim");
  const [pointAiModes, setPointAiModes] = useState<Record<string, SermonPointAiMode>>(
    {}
  );
  const [generatingPointId, setGeneratingPointId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [versions, setVersions] = useState<TranslationOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(false);
  const [passageLoading, setPassageLoading] = useState(false);
  const [referencePassage, setReferencePassage] = useState<PassageResponse | null>(
    null
  );

  const shouldHide =
    !isEnabled ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin");
  const isReaderRoute = pathname.startsWith("/ler");

  const selectedSermon =
    sermons.find((item) => item.id === selectedSermonId) ?? null;

  const selectedBookOption =
    books.find((item) => item.id === draft.referenceBook) ?? null;

  const chapterOptions = useMemo(() => {
    const totalChapters = selectedBookOption?.chapters ?? 1;
    return Array.from({ length: totalChapters }, (_, index) => index + 1);
  }, [selectedBookOption]);

  const availableVerses = referencePassage?.verses ?? [];

  const filteredSermons = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return sermons;
    }

    return sermons.filter((sermon) => {
      const haystack = [
        sermon.title,
        sermon.reference_label,
        sermon.introduction,
        sermon.conclusion,
        sermon.application,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [searchTerm, sermons]);

  const selectedVerseStartNumber = Number(draft.referenceVerseStart || "0");
  const selectedVerseEndNumber = Number(
    draft.referenceVerseEnd || draft.referenceVerseStart || "0"
  );

  const previewVerses = useMemo(() => {
    if (!availableVerses.length || !selectedVerseStartNumber) {
      return [];
    }

    return availableVerses.filter((verse) => {
      if (!selectedVerseEndNumber || selectedVerseEndNumber < selectedVerseStartNumber) {
        return verse.verse === selectedVerseStartNumber;
      }

      return (
        verse.verse >= selectedVerseStartNumber &&
        verse.verse <= selectedVerseEndNumber
      );
    });
  }, [availableVerses, selectedVerseEndNumber, selectedVerseStartNumber]);

  const hasReferenceSelection = Boolean(
    draft.referenceLabel.trim() && draft.referenceText.trim()
  );
  const hasIntroductionContent = Boolean(draft.introduction.trim());
  const hasDevelopmentContent = draft.mainPoints.some(
    (point) => point.title.trim() || point.content.trim()
  );
  const visibleMainPoints = draft.mainPoints.filter(
    (point) => point.title.trim() || point.content.trim()
  );
  const isGeneratingOutline = generatingAiAction !== null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const elements = document.querySelectorAll<HTMLTextAreaElement>(
      'textarea[data-autogrow="true"]'
    );

    elements.forEach((element) => autoResizeTextarea(element));
  }, [draft, isAiGuideOpen, activeTab]);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    function syncFullscreenState() {
      setIsManuscriptFullscreen(
        document.fullscreenElement === manuscriptContainerRef.current
      );
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    function handleOpenEvent() {
      setIsOpen(true);
      setActiveTab("editor");
    }

    window.addEventListener(OPEN_SERMON_BUILDER_EVENT, handleOpenEvent);
    return () =>
      window.removeEventListener(OPEN_SERMON_BUILDER_EVENT, handleOpenEvent);
  }, []);

  useEffect(() => {
    if (shouldHide) {
      setIsOpen(false);
    }
  }, [shouldHide]);

  useEffect(() => {
    if (!isOpen || versions.length) {
      return;
    }

    let active = true;

    async function loadVersions() {
      setVersionsLoading(true);

      try {
        const response = await fetch("/api/bible/versions", {
          cache: "no-store",
        });
        const result = await readJsonSafely<{
          ok: boolean;
          versions?: TranslationOption[];
        }>(response);

        if (!active || !response.ok || !result?.ok || !result.versions?.length) {
          return;
        }

        setVersions(result.versions);
        setDraft((current) => ({
          ...current,
          referenceVersion:
            current.referenceVersion || result.versions?.[0]?.id || "",
        }));
      } finally {
        if (active) {
          setVersionsLoading(false);
        }
      }
    }

    void loadVersions();

    return () => {
      active = false;
    };
  }, [isOpen, versions.length]);

  useEffect(() => {
    if (!isOpen || !draft.referenceVersion) {
      return;
    }

    const selectedVersion =
      versions.find((item) => item.id === draft.referenceVersion)?.value ?? "";

    if (!selectedVersion) {
      return;
    }

    let active = true;

    async function loadBooks() {
      setBooksLoading(true);

      try {
        const response = await fetch(
          `/api/bible/books?version=${encodeURIComponent(selectedVersion)}`,
          { cache: "no-store" }
        );
        const result = await readJsonSafely<{
          ok: boolean;
          books?: BookOption[];
        }>(response);

        if (!active || !response.ok || !result?.ok || !result.books?.length) {
          return;
        }

        setBooks(result.books);
        setDraft((current) => {
          const nextBook =
            current.referenceBook &&
            result.books?.some((book) => book.id === current.referenceBook)
              ? current.referenceBook
              : result.books?.[0]?.id || "";

          const nextChapter = (() => {
            const maxChapters =
              result.books?.find((book) => book.id === nextBook)?.chapters ?? 1;
            const currentChapter = Number(current.referenceChapter || "1");
            return String(Math.min(Math.max(currentChapter, 1), maxChapters));
          })();

          return {
            ...current,
            referenceBook: nextBook,
            referenceChapter: nextChapter,
          };
        });
      } finally {
        if (active) {
          setBooksLoading(false);
        }
      }
    }

    void loadBooks();

    return () => {
      active = false;
    };
  }, [draft.referenceVersion, isOpen, versions]);

  useEffect(() => {
    if (!isOpen || !draft.referenceVersion || !draft.referenceBook) {
      setReferencePassage(null);
      return;
    }

    const selectedVersion =
      versions.find((item) => item.id === draft.referenceVersion)?.value ?? "";
    const chapterNumber = Number(draft.referenceChapter || "1");

    if (!selectedVersion || !chapterNumber) {
      setReferencePassage(null);
      return;
    }

    let active = true;

    async function loadPassage() {
      setPassageLoading(true);

      try {
        const params = new URLSearchParams({
          version: selectedVersion,
          book: draft.referenceBook,
          chapter: String(chapterNumber),
        });

        const response = await fetch(`/api/bible/passage?${params.toString()}`, {
          cache: "no-store",
        });

        const result = await readJsonSafely<{
          ok: boolean;
          passage?: PassageResponse;
        }>(response);

        if (!active || !response.ok || !result?.ok || !result.passage) {
          setReferencePassage(null);
          return;
        }

        setReferencePassage(result.passage);
      } finally {
        if (active) {
          setPassageLoading(false);
        }
      }
    }

    void loadPassage();

    return () => {
      active = false;
    };
  }, [
    draft.referenceBook,
    draft.referenceChapter,
    draft.referenceVersion,
    isOpen,
    versions,
  ]);

  useEffect(() => {
    if (!referencePassage?.verses.length) {
      return;
    }

    const firstVerse = referencePassage.verses[0]?.verse ?? 1;
    const lastVerse =
      referencePassage.verses[referencePassage.verses.length - 1]?.verse ?? firstVerse;

    setDraft((current) => {
      const currentStart = Number(current.referenceVerseStart || "0");
      const currentEnd = Number(current.referenceVerseEnd || "0");

      const safeStart =
        currentStart >= firstVerse && currentStart <= lastVerse
          ? currentStart
          : firstVerse;

      const safeEnd =
        currentEnd >= safeStart && currentEnd <= lastVerse ? currentEnd : safeStart;

      return {
        ...current,
        referenceVerseStart: String(safeStart),
        referenceVerseEnd: String(safeEnd),
      };
    });
  }, [referencePassage]);

  useEffect(() => {
    if (!referencePassage?.verses.length || !draft.referenceVerseStart) {
      return;
    }

    const startVerse = Number(draft.referenceVerseStart || "0");
    const endVerse = Number(draft.referenceVerseEnd || draft.referenceVerseStart || "0");

    if (!startVerse) {
      return;
    }

    const selectedRange = referencePassage.verses.filter((verse) => {
      if (!endVerse || endVerse < startVerse) {
        return verse.verse === startVerse;
      }

      return verse.verse >= startVerse && verse.verse <= endVerse;
    });

    if (!selectedRange.length) {
      return;
    }

    const nextReferenceLabel = `${referencePassage.book} ${referencePassage.chapter}:${startVerse}${
      endVerse > startVerse ? `-${endVerse}` : ""
    } | ${draft.referenceVersion.toUpperCase()}`;
    const nextReferenceText = selectedRange
      .map((verse) => `${verse.verse}. ${verse.text}`)
      .join("\n");

    setDraft((current) => {
      if (
        current.referenceLabel === nextReferenceLabel &&
        current.referenceText === nextReferenceText
      ) {
        return current;
      }

      return {
        ...current,
        referenceLabel: nextReferenceLabel,
        referenceText: nextReferenceText,
      };
    });
  }, [
    draft.referenceVerseEnd,
    draft.referenceVerseStart,
    draft.referenceVersion,
    referencePassage,
  ]);

  useEffect(() => {
    if (!isOpen || sermons.length || isLoading) {
      return;
    }

    void loadSermons();
  }, [isLoading, isOpen, sermons.length]);

  useEffect(() => {
    if (!selectedSermonId) {
      return;
    }

    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      void saveCurrentSermon(draft);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [draft, selectedSermonId]);

  async function loadSermons() {
    setIsLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId("");
      setIsLoading(false);
      setErrorMessage("Nao foi possivel identificar o usuario logado.");
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from("sermons")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    setIsLoading(false);

    if (error) {
      setErrorMessage("Nao foi possivel carregar seus sermoes.");
      return;
    }

    const loadedSermons = (data ?? []) as SermonRecord[];
    setSermons(loadedSermons);

    if (!loadedSermons.length) {
      skipAutosaveRef.current = true;
      setSelectedSermonId(null);
      setDraft((current) => ({
        ...EMPTY_DRAFT(),
        referenceVersion: current.referenceVersion,
      }));
      return;
    }

    const rememberedId =
      typeof window !== "undefined"
        ? window.localStorage.getItem(SERMON_STORAGE_KEY)
        : null;

    const initialSermon =
      loadedSermons.find((item) => item.id === rememberedId) ?? loadedSermons[0];

    applySermon(initialSermon);
  }

  function applySermon(
    sermon: SermonRecord,
    options?: { keepActiveTab?: boolean }
  ) {
    skipAutosaveRef.current = true;
    setSelectedSermonId(sermon.id);
    setDraft(buildDraftFromRecord(sermon));
    setStatusMessage("");
    setErrorMessage("");
    if (!options?.keepActiveTab) {
      setActiveTab("editor");
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SERMON_STORAGE_KEY, sermon.id);
    }
  }

  async function refreshManuscriptNow() {
    if (!selectedSermonId) {
      return;
    }

    setIsRefreshingManuscript(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("sermons")
      .select("*")
      .eq("id", selectedSermonId)
      .single();

    setIsRefreshingManuscript(false);

    if (error || !data) {
      setErrorMessage("Nao foi possivel atualizar o manuscrito agora.");
      return;
    }

    const refreshed = data as SermonRecord;

    setSermons((current) =>
      current
        .map((item) => (item.id === refreshed.id ? refreshed : item))
        .sort(
          (left, right) =>
            new Date(right.updated_at).getTime() -
            new Date(left.updated_at).getTime()
        )
    );

    applySermon(refreshed, { keepActiveTab: true });
    setStatusMessage(`Manuscrito atualizado em ${formatDate(refreshed.updated_at)}.`);
  }

  async function toggleManuscriptFullscreen() {
    if (typeof document === "undefined") {
      return;
    }

    try {
      if (document.fullscreenElement === manuscriptContainerRef.current) {
        await document.exitFullscreen();
        return;
      }

      await manuscriptContainerRef.current?.requestFullscreen();
    } catch {
      setErrorMessage("Nao foi possivel abrir o manuscrito em tela cheia.");
    }
  }

  async function createSermon() {
    if (!userId) {
      await loadSermons();
      return;
    }

    setIsCreating(true);
    setErrorMessage("");

    const versionId =
      draft.referenceVersion || versions[0]?.id || "";

    const { data, error } = await supabase
      .from("sermons")
      .insert({
        user_id: userId,
        title: "Novo sermao",
        timer_enabled: false,
        timer_minutes: null,
        reference_version: versionId || null,
        reference_book: null,
        reference_chapter: null,
        reference_verse_start: null,
        reference_verse_end: null,
        reference_label: null,
        reference_text: null,
        introduction: "",
        main_points: [],
        conclusion: "",
        application: "",
        notes: "",
      })
      .select("*")
      .single();

    setIsCreating(false);

    if (error || !data) {
      setErrorMessage("Nao foi possivel criar um novo sermao.");
      return;
    }

    const created = data as SermonRecord;

    setSermons((current) => [created, ...current]);
    applySermon(created);
    setStatusMessage("Novo sermao criado.");
    setIsOpen(true);
  }

  async function saveCurrentSermon(nextDraft: SermonDraft) {
    if (!selectedSermonId) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const referenceChapterValue = Number(nextDraft.referenceChapter || "0");
    const referenceVerseStartValue = Number(nextDraft.referenceVerseStart || "0");
    const referenceVerseEndValue = Number(nextDraft.referenceVerseEnd || "0");

    const payload = {
      title: nextDraft.title.trim() || "Novo sermao",
      timer_enabled: false,
      timer_minutes: null,
      reference_version: nextDraft.referenceVersion || null,
      reference_book: nextDraft.referenceBook || null,
      reference_chapter: referenceChapterValue > 0 ? referenceChapterValue : null,
      reference_verse_start:
        referenceVerseStartValue > 0 ? referenceVerseStartValue : null,
      reference_verse_end: referenceVerseEndValue > 0 ? referenceVerseEndValue : null,
      reference_label: nextDraft.referenceLabel.trim() || null,
      reference_text: nextDraft.referenceText.trim() || null,
      introduction: nextDraft.introduction,
      main_points: nextDraft.mainPoints.map((point) => ({
        id: point.id,
        title: point.title,
        content: point.content,
      })),
      conclusion: nextDraft.conclusion,
      application: nextDraft.application,
      notes: nextDraft.notes,
    };

    const { data, error } = await supabase
      .from("sermons")
      .update(payload)
      .eq("id", selectedSermonId)
      .select("*")
      .single();

    setIsSaving(false);

    if (error || !data) {
      setErrorMessage("Nao foi possivel salvar este sermao.");
      return;
    }

    const updated = data as SermonRecord;

    setSermons((current) =>
      current
        .map((item) => (item.id === updated.id ? updated : item))
        .sort(
          (left, right) =>
            new Date(right.updated_at).getTime() -
            new Date(left.updated_at).getTime()
        )
    );

    if (selectedSermonId === updated.id) {
      const savedDraft = buildDraftFromRecord(updated);
      const currentSerialized = JSON.stringify({
        ...nextDraft,
        mainPoints: nextDraft.mainPoints.map((point) => ({
          title: point.title,
          content: point.content,
        })),
      });
      const savedSerialized = JSON.stringify({
        ...savedDraft,
        mainPoints: savedDraft.mainPoints.map((point) => ({
          title: point.title,
          content: point.content,
        })),
      });

      if (currentSerialized !== savedSerialized) {
        skipAutosaveRef.current = true;
        setDraft(savedDraft);
      }
    }

    setStatusMessage(`Salvo em ${formatDate(updated.updated_at)}.`);
  }

  async function deleteCurrentSermon() {
    if (!selectedSermonId) {
      return;
    }

    const deletingId = selectedSermonId;

    const { error } = await supabase.from("sermons").delete().eq("id", deletingId);

    if (error) {
      setErrorMessage("Nao foi possivel excluir este sermao.");
      return;
    }

    const remaining = sermons.filter((item) => item.id !== deletingId);
    setSermons(remaining);

    if (!remaining.length) {
      skipAutosaveRef.current = true;
      setSelectedSermonId(null);
      setDraft((current) => ({
        ...EMPTY_DRAFT(),
        referenceVersion: current.referenceVersion,
      }));
      setStatusMessage("Sermao removido.");
      return;
    }

    applySermon(remaining[0]);
    setStatusMessage("Sermao removido.");
  }

  async function deleteSermonById(sermonId: string) {
    const target = sermons.find((item) => item.id === sermonId);

    if (!target) {
      return;
    }

    if (
      typeof window !== "undefined" &&
      !window.confirm(`Excluir o sermao "${target.title}"?`)
    ) {
      return;
    }

    const { error } = await supabase.from("sermons").delete().eq("id", sermonId);

    if (error) {
      setErrorMessage("Nao foi possivel excluir este sermao.");
      return;
    }

    const remaining = sermons.filter((item) => item.id !== sermonId);
    setSermons(remaining);

    if (selectedSermonId === sermonId) {
      if (!remaining.length) {
        skipAutosaveRef.current = true;
        setSelectedSermonId(null);
        setDraft((current) => ({
          ...EMPTY_DRAFT(),
          referenceVersion: current.referenceVersion,
        }));
      } else {
        applySermon(remaining[0]);
      }
    }

    setStatusMessage("Sermao removido.");
  }

  function getAiActionLabel(action: SermonAiAction) {
    switch (action) {
      case "introduction":
        return "introducao";
      case "main_points":
        return "pontos principais";
      case "conclusion":
        return "conclusao";
      case "notes_to_point":
        return "ponto a partir das notas";
      case "point_refine":
        return "ponto do sermao";
      default:
        return "esboco";
    }
  }

  function getPointAiModeLabel(mode: SermonPointAiMode) {
    switch (mode) {
      case "expand":
        return "expandir";
      case "retone":
        return "reescrever no tom";
      default:
        return "melhorar";
    }
  }

  async function generateSermonWithAi(
    action: SermonAiAction = "outline",
    options?: {
      pointId?: string;
      pointMode?: SermonPointAiMode;
    }
  ) {
    if (!draft.referenceLabel.trim() || !draft.referenceText.trim()) {
      setErrorMessage("Selecione primeiro o texto biblico do sermao.");
      return;
    }

    if (action === "notes_to_point" && !draft.notes.trim()) {
      setErrorMessage("Adicione algumas notas antes de gerar um ponto.");
      return;
    }

    const targetPoint =
      action === "point_refine" && options?.pointId
        ? draft.mainPoints.find((point) => point.id === options.pointId) ?? null
        : null;

    if (action === "point_refine" && !targetPoint) {
      setErrorMessage("Escolha um ponto valido para a IA trabalhar.");
      return;
    }

    setGeneratingAiAction(action);
    setGeneratingPointId(action === "point_refine" ? options?.pointId ?? null : null);
    setErrorMessage("");
    setStatusMessage("");

    const translationLabel =
      versions.find((item) => item.id === draft.referenceVersion)?.label ??
      draft.referenceVersion.toUpperCase();

    try {
      const response = await fetch("/api/sermon-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reference: draft.referenceLabel,
          translation: translationLabel,
          referenceText: draft.referenceText,
          notes: draft.notes,
          currentTitle: draft.title,
          introduction: draft.introduction,
          application: draft.application,
          currentConclusion: draft.conclusion,
          currentMainPoints: draft.mainPoints.map((point) => ({
            title: point.title,
            content: point.content,
          })),
          insertPosition:
            action === "notes_to_point" ? notesPointInsertPosition : "",
          pointTitle: action === "point_refine" ? targetPoint?.title ?? "" : "",
          pointContent:
            action === "point_refine" ? targetPoint?.content ?? "" : "",
          pointIndex:
            action === "point_refine" && targetPoint
              ? draft.mainPoints.findIndex((point) => point.id === targetPoint.id) + 1
              : 0,
          pointMode: action === "point_refine" ? options?.pointMode ?? "improve" : "",
          theme: aiTheme,
          objective: aiObjective,
          tone: aiTone,
        }),
      });

      const payload = await readJsonSafely<{
        ok: boolean;
        outline?: SermonAssistantOutline;
        error?: string;
      }>(response);

      if (!response.ok || !payload?.ok || !payload.outline) {
        setErrorMessage(
          payload?.error || "A IA nao conseguiu montar o esboco agora."
        );
        return;
      }

      skipAutosaveRef.current = true;
      let nextDraft: SermonDraft = draft;

      if (action === "outline") {
        const nextPoints =
          payload.outline.mainPoints?.length
            ? payload.outline.mainPoints.map((point) => ({
                id: crypto.randomUUID(),
                title: String(point.title ?? "").trim(),
                content: String(point.content ?? "").trim(),
              }))
            : [EMPTY_MAIN_POINT()];

        nextDraft = {
          ...draft,
          title: payload.outline.title?.trim() || draft.title,
          introduction:
            payload.outline.introduction?.trim() || draft.introduction,
          mainPoints: nextPoints,
          application: payload.outline.application?.trim() || draft.application,
          conclusion: payload.outline.conclusion?.trim() || draft.conclusion,
        };
      } else if (action === "introduction") {
        nextDraft = {
          ...draft,
          title: payload.outline.title?.trim() || draft.title,
          introduction:
            payload.outline.introduction?.trim() || draft.introduction,
        };
      } else if (action === "main_points") {
        nextDraft = {
          ...draft,
          mainPoints:
            payload.outline.mainPoints?.length
              ? payload.outline.mainPoints.map((point) => ({
                  id: crypto.randomUUID(),
                  title: String(point.title ?? "").trim(),
                  content: String(point.content ?? "").trim(),
                }))
              : draft.mainPoints,
        };
      } else if (action === "conclusion") {
        nextDraft = {
          ...draft,
          conclusion: payload.outline.conclusion?.trim() || draft.conclusion,
        };
      } else if (action === "notes_to_point") {
        const generatedPoint = payload.outline.mainPoints?.[0];

        if (!generatedPoint?.title?.trim() && !generatedPoint?.content?.trim()) {
          setErrorMessage("A IA nao conseguiu transformar as notas em ponto.");
          return;
        }

        const nextPoint = {
          id: crypto.randomUUID(),
          title: String(generatedPoint.title ?? "").trim(),
          content: String(generatedPoint.content ?? "").trim(),
        };

        const currentPoints = [...draft.mainPoints];
        let positionedPoints = currentPoints;

        if (notesPointInsertPosition === "inicio") {
          positionedPoints = [nextPoint, ...currentPoints];
        } else if (notesPointInsertPosition === "meio") {
          const insertIndex = Math.max(1, Math.ceil(currentPoints.length / 2));
          positionedPoints = [
            ...currentPoints.slice(0, insertIndex),
            nextPoint,
            ...currentPoints.slice(insertIndex),
          ];
        } else {
          positionedPoints = [...currentPoints, nextPoint];
        }

        nextDraft = {
          ...draft,
          mainPoints: positionedPoints,
        };
      } else if (action === "point_refine" && targetPoint) {
        const generatedPoint = payload.outline.mainPoints?.[0];

        if (!generatedPoint?.title?.trim() && !generatedPoint?.content?.trim()) {
          setErrorMessage("A IA nao conseguiu trabalhar neste ponto agora.");
          return;
        }

        nextDraft = {
          ...draft,
          mainPoints: draft.mainPoints.map((point) =>
            point.id === targetPoint.id
              ? {
                  ...point,
                  title: String(generatedPoint.title ?? "").trim() || point.title,
                  content:
                    String(generatedPoint.content ?? "").trim() || point.content,
                }
              : point
          ),
        };
      }

      setDraft(nextDraft);
      setStatusMessage(
        action === "point_refine"
          ? `Sugestao para ${getPointAiModeLabel(
              options?.pointMode ?? "improve"
            )} o ponto aplicada ao sermonario.`
          : `Sugestao de ${getAiActionLabel(action)} aplicada ao sermonario.`
      );

      if (action === "outline") {
        setIsAiGuideOpen(false);
      }

      if (selectedSermonId) {
        void saveCurrentSermon(nextDraft);
      }
    } catch {
      setErrorMessage(
        action === "point_refine"
          ? "A IA nao conseguiu trabalhar neste ponto agora."
          : `A IA nao conseguiu gerar ${getAiActionLabel(action)} agora.`
      );
    } finally {
      setGeneratingAiAction(null);
      setGeneratingPointId(null);
    }
  }

  function updateDraft<K extends keyof SermonDraft>(key: K, value: SermonDraft[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateMainPoint(
    pointId: string,
    key: keyof MainPoint,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      mainPoints: current.mainPoints.map((point) =>
        point.id === pointId ? { ...point, [key]: value } : point
      ),
    }));
  }

  function addMainPoint() {
    setDraft((current) => ({
      ...current,
      mainPoints: [...current.mainPoints, EMPTY_MAIN_POINT()],
    }));
  }

  function removeMainPoint(pointId: string) {
    setDraft((current) => {
      const nextPoints = current.mainPoints.filter((point) => point.id !== pointId);

      return {
        ...current,
        mainPoints: nextPoints.length ? nextPoints : [EMPTY_MAIN_POINT()],
      };
    });
  }

  function exportSermonToPdf(sourceDraft: SermonDraft) {
    if (typeof window === "undefined") {
      return;
    }

    const frame = document.createElement("iframe");
    frame.setAttribute(
      "style",
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;"
    );

    const cleanup = () => {
      window.setTimeout(() => {
        frame.remove();
      }, 1200);
    };

    frame.onload = () => {
      const frameWindow = frame.contentWindow;

      if (!frameWindow) {
        setErrorMessage("Nao foi possivel preparar o PDF do sermao.");
        cleanup();
        return;
      }

      window.setTimeout(() => {
        frameWindow.focus();
        frameWindow.print();
        cleanup();
      }, 350);
    };

    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument;

    if (!frameDocument) {
      setErrorMessage("Nao foi possivel preparar o PDF do sermao.");
      cleanup();
      return;
    }

    frameDocument.open();
    frameDocument.write(buildSermonPdfHtml(sourceDraft));
    frameDocument.close();
  }

  function requestCreateSermon() {
    setIsCreateWarningOpen(true);
  }

  async function confirmCreateSermon() {
    setIsCreateWarningOpen(false);
    await createSermon();
  }

  if (shouldHide) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setActiveTab("editor");
        }}
        className={`fixed z-[1005] inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(22,25,34,0.97),rgba(10,12,18,0.99))] px-3.5 py-3 text-xs font-semibold text-zinc-100 shadow-[0_18px_38px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:bg-white/[0.08] md:px-4 md:py-3 md:text-sm ${
          isReaderRoute
            ? isMobile
              ? "left-3 top-[calc(5.2rem+env(safe-area-inset-top))]"
              : "bottom-24 left-6"
            : "bottom-[calc(5.1rem+env(safe-area-inset-bottom))] left-3 md:bottom-5 md:left-5"
        }`}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/12 text-amber-300">
          <SermonIcon />
        </span>
        <span className="leading-tight">
          <span className="block text-[10px] uppercase tracking-[0.18em] text-amber-300/80 md:text-[11px]">
            Area pastoral
          </span>
          <span className="block">Meu Sermonario</span>
        </span>
      </button>

      {isOpen ? (
        <div className="pointer-events-none fixed inset-0 z-[1006]">
          {isCreateWarningOpen ? (
            <div className="pointer-events-auto absolute inset-0 z-[3] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[4px]">
              <div className="w-full max-w-[36rem] rounded-[30px] border border-amber-300/18 bg-[linear-gradient(180deg,#151922,#0b0d13)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/80">
                  Alerta pastoral
                </p>
                <h3 className="mt-3 text-xl font-semibold leading-tight text-white">
                  Antes de criar um novo sermão
                </h3>

                <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-200">
                  <p>
                    O uso da IA deve ser moderado. Nada substitui a busca e o
                    estudo da Palavra de Deus, e principalmente a oração.
                  </p>
                  <p>
                    Um bom pregador nao sobe ao púlpito com sermões prontos.
                    Use a IA apenas como apoio para organizar ideias, revisar
                    anotações e ajudar no processo dos seus estudos.
                  </p>
                  <p>
                    O verdadeiro sermão nasce do texto bíblico, da comunhão com
                    o Senhor e de um coração dependente do Espírito de Deus.
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateWarningOpen(false)}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.08]"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmCreateSermon()}
                    disabled={isCreating}
                    className="rounded-2xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? "Criando..." : "Estou ciente, continuar"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isMobile ? (
            <button
              type="button"
              aria-label="Fechar sermonario"
              onClick={() => setIsOpen(false)}
              className="pointer-events-auto absolute inset-0 bg-black/45 backdrop-blur-[3px]"
            />
          ) : null}

          <section
            className={`pointer-events-auto overflow-hidden border border-white/10 bg-[linear-gradient(180deg,#0f1117,#090b11)] text-white shadow-[0_28px_90px_rgba(0,0,0,0.34)] ${
              isMobile
                ? "absolute inset-x-0 bottom-0 h-[88vh] rounded-t-[30px]"
                : isReaderRoute
                ? "absolute left-4 top-[5.4rem] h-[min(84vh,860px)] w-[min(500px,calc(100vw-2rem))] rounded-[30px] md:left-6"
                : "absolute right-4 top-[5.4rem] h-[min(84vh,860px)] w-[min(540px,calc(100vw-2rem))] rounded-[30px]"
            }`}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-4 pb-4 pt-4">
                {isMobile ? (
                  <div className="mb-3 flex justify-center">
                    <span className="h-1.5 w-14 rounded-full bg-white/15" />
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300/75">
                      Preparacao de mensagem
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      Meu Sermonario
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={requestCreateSermon}
                      disabled={isCreating}
                      className="rounded-full border border-amber-300/25 bg-amber-300/12 px-3 py-2 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-300/18 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCreating ? "Criando..." : "Novo"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-zinc-100 transition hover:bg-white/10"
                    >
                      Fechar
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-[22px] border border-white/10 bg-black/15 p-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("editor")}
                    className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                      activeTab === "editor"
                        ? "bg-amber-400 text-black shadow-[0_12px_24px_rgba(245,158,11,0.26)]"
                        : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("manuscript")}
                    className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                      activeTab === "manuscript"
                        ? "bg-amber-400 text-black shadow-[0_12px_24px_rgba(245,158,11,0.26)]"
                        : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    Manuscrito
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("library")}
                    className={`rounded-[18px] px-4 py-3 text-sm font-medium transition ${
                      activeTab === "library"
                        ? "bg-amber-400 text-black shadow-[0_12px_24px_rgba(245,158,11,0.26)]"
                        : "bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    Meus sermoes
                  </button>
                </div>
              </div>

              {activeTab === "editor" ? (
                <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.06),transparent_22%)] px-4 py-4">
                  {!selectedSermon ? (
                    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
                      Crie um novo sermao para comecar a montar sua mensagem.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setIsAiGuideOpen((current) => !current)
                            }
                            disabled={passageLoading}
                            className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Gerar com IA
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveCurrentSermon(draft)}
                            disabled={isSaving}
                            className="rounded-2xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSaving ? "Salvando..." : "Salvar agora"}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportSermonToPdf(draft)}
                            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.08]"
                          >
                            Salvar em PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteCurrentSermon()}
                            className="rounded-2xl border border-red-400/16 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-200 transition hover:bg-red-500/16"
                          >
                            Excluir
                          </button>
                        </div>

                        {errorMessage ? (
                          <p className="text-sm text-red-300">{errorMessage}</p>
                        ) : statusMessage ? (
                          <p className="text-sm text-emerald-300">
                            {statusMessage}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-500">Salvamento automatico ativo.</p>
                        )}

                        {isAiGuideOpen ? (
                          <div className="rounded-[26px] border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.1),rgba(8,25,20,0.32))] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">
                                  Direcionamento da IA
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => setIsAiGuideOpen(false)}
                                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-100 transition hover:bg-white/10"
                              >
                                Fechar
                              </button>
                            </div>

                            <div className="mt-4 grid gap-3">
                              <div className="rounded-[22px] border border-white/10 bg-[#0b0d13] px-4 py-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                  Texto base da IA
                                </p>
                                <p className="mt-1 text-xs text-zinc-400">
                                  Escolha o trecho usado na geracao.
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                      Versao
                                    </span>
                                    <select
                                      value={draft.referenceVersion}
                                      onChange={(event) =>
                                        updateDraft(
                                          "referenceVersion",
                                          event.target.value
                                        )
                                      }
                                      disabled={versionsLoading || !versions.length}
                                      className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                    >
                                      {versions.map((translation) => (
                                        <option
                                          key={`ai-${translation.id}`}
                                          value={translation.id}
                                        >
                                          {translation.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                      Livro
                                    </span>
                                    <select
                                      value={draft.referenceBook}
                                      onChange={(event) =>
                                        updateDraft(
                                          "referenceBook",
                                          event.target.value
                                        )
                                      }
                                      disabled={booksLoading || !books.length}
                                      className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                    >
                                      {books.map((book) => (
                                        <option key={`ai-${book.id}`} value={book.id}>
                                          {book.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="block">
                                    <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                      Capitulo
                                    </span>
                                    <select
                                      value={draft.referenceChapter}
                                      onChange={(event) =>
                                        updateDraft(
                                          "referenceChapter",
                                          event.target.value
                                        )
                                      }
                                      className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                    >
                                      {chapterOptions.map((chapter) => (
                                        <option key={`ai-${chapter}`} value={chapter}>
                                          {chapter}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                        Verso inicial
                                      </span>
                                      <select
                                        value={draft.referenceVerseStart}
                                        onChange={(event) =>
                                          updateDraft(
                                            "referenceVerseStart",
                                            event.target.value
                                          )
                                        }
                                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                      >
                                        {availableVerses.map((verse) => (
                                          <option
                                            key={`ai-start-${verse.verse}`}
                                            value={verse.verse}
                                          >
                                            {verse.verse}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <label className="block">
                                      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                        Verso final
                                      </span>
                                      <select
                                        value={draft.referenceVerseEnd}
                                        onChange={(event) =>
                                          updateDraft(
                                            "referenceVerseEnd",
                                            event.target.value
                                          )
                                        }
                                        className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                      >
                                        {availableVerses
                                          .filter(
                                            (verse) =>
                                              !selectedVerseStartNumber ||
                                              verse.verse >= selectedVerseStartNumber
                                          )
                                          .map((verse) => (
                                            <option
                                              key={`ai-end-${verse.verse}`}
                                              value={verse.verse}
                                            >
                                              {verse.verse}
                                            </option>
                                          ))}
                                      </select>
                                    </label>
                                  </div>
                                </div>

                              <p className="mt-4 text-sm font-semibold text-white">
                                {draft.referenceLabel || "Nenhuma referencia selecionada"}
                              </p>
                                <div className="mt-3 max-h-36 overflow-y-auto rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm leading-6 text-zinc-300">
                                  {draft.referenceText.trim() ? (
                                    <p className="whitespace-pre-line">
                                      {draft.referenceText}
                                    </p>
                                  ) : (
                                    <p className="text-zinc-500">
                                      Escolha acima o texto base para a IA montar
                                      o serm?o.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                  Tema do sermao
                                </span>
                                <input
                                  value={aiTheme}
                                  onChange={(event) => setAiTheme(event.target.value)}
                                  placeholder="Ex.: A fidelidade de Deus em meio a crise"
                                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                />
                              </label>

                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                  Objetivo da mensagem
                                </span>
                                <textarea
                                  data-autogrow="true"
                                  value={aiObjective}
                                  onChange={(event) => {
                                    autoResizeTextarea(event.currentTarget);
                                    setAiObjective(event.target.value);
                                  }}
                                  rows={2}
                                  placeholder="Ex.: consolar a igreja, chamar a fe e mostrar a resposta pratica desse texto."
                                  className="mt-2 min-h-[52px] w-full overflow-hidden resize-none rounded-[22px] border border-white/10 bg-[#0b0d13] p-4 text-sm leading-6 text-white outline-none transition focus:border-emerald-300/40"
                                />
                              </label>

                              <label className="block">
                                <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                  Tom da mensagem
                                </span>
                                <select
                                  value={aiTone}
                                  onChange={(event) =>
                                    setAiTone(event.target.value as SermonAiTone)
                                  }
                                  className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-emerald-300/40"
                                >
                                  <option value="expositivo">Expositivo</option>
                                  <option value="devocional">Devocional</option>
                                  <option value="evangelistico">Evangelistico</option>
                                  <option value="doutrinario">Doutrinario</option>
                                  <option value="pastoral">Pastoral</option>
                                </select>
                              </label>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void generateSermonWithAi("outline")}
                                disabled={isGeneratingOutline}
                                className="rounded-2xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-[#062016] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {generatingAiAction === "outline"
                                  ? "Gerando esboco..."
                                  : "Gerar esboco agora"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                        <div className="border-b border-white/8 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                              Texto de referencia
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-white">
                              Base biblica do sermao
                            </h3>
                          </div>
                          {passageLoading ? (
                            <span className="text-xs text-zinc-400">
                              Carregando...
                            </span>
                          ) : null}
                        </div>
                        </div>

                        <div className="p-4">
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                              Versao
                            </span>
                            <select
                              value={draft.referenceVersion}
                              onChange={(event) =>
                                updateDraft("referenceVersion", event.target.value)
                              }
                              disabled={versionsLoading || !versions.length}
                              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                            >
                              {versions.map((translation) => (
                                <option key={translation.id} value={translation.id}>
                                  {translation.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                              Livro
                            </span>
                            <select
                              value={draft.referenceBook}
                              onChange={(event) =>
                                updateDraft("referenceBook", event.target.value)
                              }
                              disabled={booksLoading || !books.length}
                              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                            >
                              {books.map((book) => (
                                <option key={book.id} value={book.id}>
                                  {book.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                              Capitulo
                            </span>
                            <select
                              value={draft.referenceChapter}
                              onChange={(event) =>
                                updateDraft("referenceChapter", event.target.value)
                              }
                              className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                            >
                              {chapterOptions.map((chapter) => (
                                <option key={chapter} value={chapter}>
                                  {chapter}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                Verso inicial
                              </span>
                              <select
                                value={draft.referenceVerseStart}
                                onChange={(event) =>
                                  updateDraft(
                                    "referenceVerseStart",
                                    event.target.value
                                  )
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                              >
                                {availableVerses.map((verse) => (
                                  <option key={`start-${verse.verse}`} value={verse.verse}>
                                    {verse.verse}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block">
                              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                Verso final
                              </span>
                              <select
                                value={draft.referenceVerseEnd}
                                onChange={(event) =>
                                  updateDraft("referenceVerseEnd", event.target.value)
                                }
                                className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                              >
                                {availableVerses
                                  .filter(
                                    (verse) =>
                                      !selectedVerseStartNumber ||
                                      verse.verse >= selectedVerseStartNumber
                                  )
                                  .map((verse) => (
                                    <option
                                      key={`end-${verse.verse}`}
                                      value={verse.verse}
                                    >
                                      {verse.verse}
                                    </option>
                                  ))}
                              </select>
                            </label>
                          </div>
                        </div>

                        <div className="mt-4 rounded-[26px] border border-amber-300/14 bg-[linear-gradient(180deg,rgba(11,13,19,0.98),rgba(20,14,8,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                            {draft.referenceLabel || "Selecione o texto"}
                          </p>
                          <div className="mt-3 space-y-2 text-sm leading-7 text-zinc-200">
                            {previewVerses.length ? (
                              previewVerses.map((verse) => (
                                <p key={verse.reference}>
                                  <span className="mr-2 font-semibold text-amber-300">
                                    {verse.verse}
                                  </span>
                                  <span>{verse.text}</span>
                                </p>
                              ))
                            ) : (
                              <p className="text-zinc-500">
                                Escolha o livro, capitulo e versiculos para montar
                                a base biblica do sermao.
                              </p>
                            )}
                          </div>
                        </div>
                        </div>
                      </section>

                      {hasReferenceSelection ? (
                      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                        <div className="border-b border-white/8 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                                Introducao
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-white">
                                Apresente o tema e desperte a atencao
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => void generateSermonWithAi("introduction")}
                              disabled={isGeneratingOutline}
                              className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {generatingAiAction === "introduction"
                                ? "Gerando..."
                                : "Gerar com IA"}
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                            Titulo do sermao
                          </span>
                          <input
                            value={draft.title}
                            onChange={(event) =>
                              updateDraft("title", event.target.value)
                            }
                            placeholder="Ex.: O Deus que sustenta no deserto"
                            className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                          />
                        </label>
                        <textarea
                          data-autogrow="true"
                          value={draft.introduction}
                          onChange={(event) => {
                            autoResizeTextarea(event.currentTarget);
                            updateDraft("introduction", event.target.value);
                          }}
                          rows={2}
                          placeholder="Contextualize o texto, traga a pergunta central e conecte o ouvinte com o tema."
                          className="mt-4 min-h-[56px] w-full overflow-hidden resize-none rounded-[24px] border border-white/10 bg-[#0b0d13] p-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/40"
                        />
                        </div>
                      </section>
                      ) : null}

                      {hasIntroductionContent ? (
                      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                        <div className="border-b border-white/8 px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                              Desenvolvimento
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-white">
                              Pontos principais do sermao
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void generateSermonWithAi("main_points")}
                              disabled={isGeneratingOutline}
                              className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {generatingAiAction === "main_points"
                                ? "Gerando..."
                                : "Gerar pontos"}
                            </button>
                            <button
                              type="button"
                              onClick={addMainPoint}
                              className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-medium text-zinc-100 transition hover:bg-white/[0.08]"
                            >
                              + Adicionar ponto
                            </button>
                          </div>
                        </div>
                        </div>

                        <div className="space-y-4 p-4">
                          {draft.mainPoints.map((point, index) => (
                            <div
                              key={point.id}
                              className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(11,13,19,0.98),rgba(16,18,26,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/75">
                                    Desenvolvimento
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-white">
                                    Ponto {index + 1}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                  <select
                                    value={pointAiModes[point.id] ?? "improve"}
                                    onChange={(event) =>
                                      setPointAiModes((current) => ({
                                        ...current,
                                        [point.id]:
                                          event.target.value as SermonPointAiMode,
                                      }))
                                    }
                                    className="h-9 rounded-2xl border border-white/10 bg-[#0b0d13] px-3 text-[11px] font-medium text-zinc-200 outline-none transition focus:border-amber-300/40"
                                  >
                                    <option value="improve">Melhorar</option>
                                    <option value="expand">Expandir</option>
                                    <option value="retone">Reescrever no tom</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void generateSermonWithAi("point_refine", {
                                        pointId: point.id,
                                        pointMode: pointAiModes[point.id] ?? "improve",
                                      })
                                    }
                                    disabled={isGeneratingOutline}
                                    className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {generatingAiAction === "point_refine" &&
                                    generatingPointId === point.id
                                      ? "Gerando..."
                                      : "IA neste ponto"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeMainPoint(point.id)}
                                    className="rounded-full border border-red-400/16 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-200 transition hover:bg-red-500/16"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>

                              <input
                                value={point.title}
                                onChange={(event) =>
                                  updateMainPoint(point.id, "title", event.target.value)
                                }
                                placeholder="Titulo do ponto principal"
                                className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                              />

                              <textarea
                                data-autogrow="true"
                                value={point.content}
                                onChange={(event) => {
                                  autoResizeTextarea(event.currentTarget);
                                  updateMainPoint(
                                    point.id,
                                    "content",
                                    event.target.value
                                  );
                                }}
                                rows={2}
                                placeholder="Explique o texto, desenvolva a ideia e registre o que voce encontrou na Biblia e nos PDFs."
                                className="mt-3 min-h-[56px] w-full overflow-hidden resize-none rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/40"
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                      ) : null}

                      {hasDevelopmentContent ? (
                      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                        <div className="border-b border-white/8 px-4 py-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                            Aplicacao pratica
                          </p>
                          <h3 className="mt-1 text-base font-semibold text-white">
                            O que esse texto exige hoje?
                          </h3>
                        </div>
                        <div className="p-4">
                        <textarea
                          data-autogrow="true"
                          value={draft.application}
                          onChange={(event) => {
                            autoResizeTextarea(event.currentTarget);
                            updateDraft("application", event.target.value);
                          }}
                          rows={2}
                          placeholder="Transforme a exposicao em chamada pastoral, confronto, consolo e resposta concreta."
                          className="mt-4 min-h-[56px] w-full overflow-hidden resize-none rounded-[24px] border border-white/10 bg-[#0b0d13] p-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/40"
                        />
                        </div>
                      </section>
                      ) : null}

                      {hasDevelopmentContent ? (
                      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                        <div className="border-b border-white/8 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                                Conclusao
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-white">
                                Feche a mensagem com clareza
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() => void generateSermonWithAi("conclusion")}
                              disabled={isGeneratingOutline}
                              className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {generatingAiAction === "conclusion"
                                ? "Gerando..."
                                : "Melhorar com IA"}
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                        <textarea
                          data-autogrow="true"
                          value={draft.conclusion}
                          onChange={(event) => {
                            autoResizeTextarea(event.currentTarget);
                            updateDraft("conclusion", event.target.value);
                          }}
                          rows={2}
                          placeholder="Resuma a verdade central, convoque a igreja a responder e encerre a mensagem."
                          className="mt-4 min-h-[56px] w-full overflow-hidden resize-none rounded-[24px] border border-white/10 bg-[#0b0d13] p-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/40"
                        />
                        </div>
                      </section>
                      ) : null}

                      {hasDevelopmentContent ? (
                      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                        <div className="border-b border-white/8 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                                Apoio e recortes
                              </p>
                              <h3 className="mt-1 text-base font-semibold text-white">
                                Cole aqui trechos, observacoes e ideias do estudo
                              </h3>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <select
                                value={notesPointInsertPosition}
                                onChange={(event) =>
                                  setNotesPointInsertPosition(
                                    event.target.value as SermonPointInsertPosition
                                  )
                                }
                                className="h-9 rounded-2xl border border-white/10 bg-[#0b0d13] px-3 text-[11px] font-medium text-zinc-200 outline-none transition focus:border-amber-300/40"
                              >
                                <option value="inicio">Entrar no inicio</option>
                                <option value="meio">Entrar no meio</option>
                                <option value="fim">Entrar no fim</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => void generateSermonWithAi("notes_to_point")}
                                disabled={isGeneratingOutline || !draft.notes.trim()}
                                className="rounded-2xl border border-emerald-300/18 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/16 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {generatingAiAction === "notes_to_point"
                                  ? "Gerando..."
                                  : "Notas -> ponto"}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                        <textarea
                          data-autogrow="true"
                          value={draft.notes}
                          onChange={(event) => {
                            autoResizeTextarea(event.currentTarget);
                            updateDraft("notes", event.target.value);
                          }}
                          rows={2}
                          placeholder="Use este espaco para colar trechos dos PDFs, referencias extras, frases, esboco de ilustracoes e observacoes pessoais."
                          className="mt-4 min-h-[56px] w-full overflow-hidden resize-none rounded-[24px] border border-white/10 bg-[#0b0d13] p-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/40"
                        />
                        </div>
                      </section>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : activeTab === "manuscript" ? (
                <div
                  ref={manuscriptContainerRef}
                  className={`min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#111319,#0a0c12)] px-5 py-6 ${
                    isManuscriptFullscreen ? "text-[1.05rem]" : ""
                  }`}
                >
                  {!selectedSermon ? (
                    <div className="text-sm leading-7 text-zinc-400">
                      Crie ou selecione um sermao para abrir o modo manuscrito.
                    </div>
                  ) : (
                    <article className="mx-auto max-w-[42rem] space-y-8 text-zinc-100">
                      <header className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300/80">
                              Modo manuscrito limpo
                            </p>
                            <h3 className="mt-3 text-2xl font-semibold leading-tight text-white">
                              {draft.title.trim() || "Novo sermao"}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void refreshManuscriptNow()}
                              disabled={isRefreshingManuscript}
                              className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-medium text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isRefreshingManuscript
                                ? "Atualizando..."
                                : "Atualizar agora"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void toggleManuscriptFullscreen()}
                              className="rounded-2xl border border-amber-300/18 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-100 transition hover:bg-amber-400/16"
                            >
                              {isManuscriptFullscreen
                                ? "Sair da tela cheia"
                                : "Tela cheia"}
                            </button>
                          </div>
                        </div>
                      </header>

                      {draft.referenceLabel.trim() || draft.referenceText.trim() ? (
                        <section className="space-y-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
                            Texto base
                          </p>
                          {draft.referenceLabel.trim() ? (
                            <p className="text-lg font-semibold text-white">
                              {draft.referenceLabel}
                            </p>
                          ) : null}
                          {previewVerses.length ? (
                            <div className="space-y-3 text-[1.02rem] leading-8 text-zinc-100">
                              {previewVerses.map((verse) => (
                                <p key={`manuscript-${verse.reference}`}>
                                  <span className="mr-2 font-semibold text-amber-300">
                                    {verse.verse}
                                  </span>
                                  <span>{verse.text}</span>
                                </p>
                              ))}
                            </div>
                          ) : draft.referenceText.trim() ? (
                            <p className="whitespace-pre-line text-[1.02rem] leading-8 text-zinc-100">
                              {draft.referenceText}
                            </p>
                          ) : null}
                        </section>
                      ) : null}

                      {visibleMainPoints.length ? (
                        <section className="space-y-5">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
                            Pontos
                          </p>
                          <div className="space-y-6">
                            {visibleMainPoints.map((point, index) => (
                              <div
                                key={`manuscript-point-${point.id}`}
                                className="space-y-2"
                              >
                                <h4 className="text-lg font-semibold leading-snug text-white">
                                  {index + 1}.{" "}
                                  {point.title.trim() || `Ponto ${index + 1}`}
                                </h4>
                                {point.content.trim() ? (
                                  <p className="whitespace-pre-line text-[1.01rem] leading-8 text-zinc-100">
                                    {point.content}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {draft.application.trim() ? (
                        <section className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/80">
                            Aplicacao
                          </p>
                          <p className="whitespace-pre-line text-[1.02rem] leading-8 text-zinc-100">
                            {draft.application}
                          </p>
                        </section>
                      ) : null}
                    </article>
                  )}
                </div>
              ) : (
                <div className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.06),transparent_24%)] px-4 py-4">
                  <div className="rounded-[30px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.16)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                          Biblioteca pastoral
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-white">
                          Sermoes salvos
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={requestCreateSermon}
                        disabled={isCreating}
                        className="rounded-2xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isCreating ? "Criando..." : "Novo sermao"}
                      </button>
                    </div>

                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Buscar por titulo, referencia ou conteudo..."
                      className="mt-4 h-11 w-full rounded-2xl border border-white/10 bg-[#0b0d13] px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                    />

                  </div>

                    <div className="mt-4 space-y-3">
                    {isLoading ? (
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-300">
                        Carregando sermoes...
                      </div>
                    ) : filteredSermons.length ? (
                      filteredSermons.map((sermon) => {
                        const isActive = sermon.id === selectedSermonId;

                        return (
                          <div
                            key={sermon.id}
                            className={`w-full rounded-[24px] border p-4 text-left transition ${
                              isActive
                                ? "border-amber-300/30 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_36%),linear-gradient(180deg,rgba(245,158,11,0.09),rgba(255,255,255,0.03))] shadow-[0_14px_30px_rgba(0,0,0,0.16)]"
                                : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-200/90">
                                    {getSermonStageLabel(sermon)}
                                  </span>
                                </div>

                                <p className="mt-3 truncate text-base font-semibold text-white">
                                  {sermon.title}
                                </p>
                                <p className="mt-1 text-xs text-amber-200/80">
                                  {sermon.reference_label || "Sem referencia definida"}
                                </p>
                              </div>
                              {isActive ? (
                                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-amber-100">
                                  Aberto
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">
                              {sermon.introduction?.trim() ||
                                sermon.application?.trim() ||
                                sermon.notes?.trim() ||
                                "Sem conteudo registrado ainda."}
                            </p>

                            <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
                              <span className="text-zinc-500">
                                Atualizado em {formatDate(sermon.updated_at)}
                              </span>
                              <span className="text-amber-200/75">
                                {getFilledSermonSections(sermon)} area{getFilledSermonSections(sermon) === 1 ? "" : "s"} preenchida{getFilledSermonSections(sermon) === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => applySermon(sermon)}
                                className="rounded-2xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-300"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteSermonById(sermon.id)}
                                className="rounded-2xl border border-red-400/16 bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-200 transition hover:bg-red-500/16"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-400">
                        Nenhum sermao encontrado. Crie o primeiro e comece a montar
                        sua mensagem.
                      </div>
                    )}
                  </div>

                  {selectedSermon ? (
                    <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-amber-300/80">
                        Exportacao
                      </p>
                      <h4 className="mt-1 text-sm font-semibold text-white">
                        Gerar esboço em PDF
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        O PDF vai sair organizado com o essencial do sermão:
                        referência, introdução, pontos principais, aplicação e
                        conclusão.
                      </p>
                      <button
                        type="button"
                        onClick={() => exportSermonToPdf(draft)}
                        className="mt-4 rounded-2xl bg-amber-400 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-amber-300"
                      >
                        Transformar em PDF
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
