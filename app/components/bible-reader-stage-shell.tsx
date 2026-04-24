"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReaderDictionaryPanel from "@/app/components/reader-dictionary-panel";
import StudyNotesPanel from "@/app/components/study-notes-panel";

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

type SearchResultItem = {
  version: string;
  book: string;
  bookSlug: string;
  abbrev: string | null;
  chapter: number;
  verse: number;
  reference: string;
  text: string;
};

type HebrewVerseItem = {
  bookNumber: number;
  bookId: string;
  bookCode: string;
  book: string;
  chapter: number;
  verse: number;
  reference: string;
  hebrew: string;
  transliteration: string;
  vid: string;
  source: {
    hebrew: string;
    transliteration: string;
  };
};

type HebrewPassageResponse = {
  bookId: string;
  chapter: number;
  verses: HebrewVerseItem[];
  license: {
    hebrew: string;
    transliteration: string;
  };
  generatedAt: string;
};

type DictionaryContextMenuState = {
  term: string;
  reference: string;
  verseText: string;
  x: number;
  y: number;
};

const BIBLE_READER_STATE_STORAGE_KEY = "acervo-logos:bible-reader-state";
const BIBLE_READER_HEBREW_LAYER_STORAGE_KEY =
  "acervo-logos:bible-reader-hebrew-layer";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-medium tracking-[0.12em] text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  disabled = false,
  children,
}: {
  value: string | number;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-11 rounded-xl border border-white/10 bg-[#12151d] px-3 text-sm text-zinc-100 outline-none transition focus:border-amber-300/40 disabled:cursor-not-allowed disabled:bg-[#0f1218] disabled:text-zinc-500"
    >
      {children}
    </select>
  );
}

async function readJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getOffsetWithinContainer(
  element: HTMLElement,
  container: HTMLElement
): number {
  let offset = 0;
  let current: HTMLElement | null = element;

  while (current && current !== container) {
    offset += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return offset;
}

export default function BibleReaderStageShell() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialVersion = searchParams.get("version")?.trim().toLowerCase() ?? "";
  const initialBook = searchParams.get("book")?.trim().toLowerCase() ?? "";
  const initialChapterValue = Number(searchParams.get("chapter") ?? "");
  const initialVerseValue = Number(searchParams.get("verse") ?? "");
  const hasInitialReaderQuery =
    !!initialVersion ||
    !!initialBook ||
    (Number.isInteger(initialChapterValue) && initialChapterValue > 0) ||
    (Number.isInteger(initialVerseValue) && initialVerseValue > 0);

  const [selectedTranslation, setSelectedTranslation] = useState(initialVersion);
  const [selectedBook, setSelectedBook] = useState(initialBook);
  const [selectedChapter, setSelectedChapter] = useState(
    Number.isInteger(initialChapterValue) && initialChapterValue > 0
      ? initialChapterValue
      : 1
  );
  const [selectedVerse, setSelectedVerse] = useState<number | null>(
    Number.isInteger(initialVerseValue) && initialVerseValue > 0
      ? initialVerseValue
      : null
  );
  const [hasRestoredInitialState, setHasRestoredInitialState] = useState(false);

  const [translations, setTranslations] = useState<TranslationOption[]>([]);
  const [books, setBooks] = useState<BookOption[]>([]);
  const [passage, setPassage] = useState<PassageResponse | null>(null);
  const [hebrewPassage, setHebrewPassage] = useState<HebrewPassageResponse | null>(
    null
  );
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(false);
  const [passageLoading, setPassageLoading] = useState(false);
  const [hebrewPassageLoading, setHebrewPassageLoading] = useState(false);
  const [versionsError, setVersionsError] = useState("");
  const [booksError, setBooksError] = useState("");
  const [passageError, setPassageError] = useState("");
  const [hebrewPassageError, setHebrewPassageError] = useState("");
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);
  const [isMobileHeaderCollapsed, setIsMobileHeaderCollapsed] = useState(false);
  const [showHebrewLayer, setShowHebrewLayer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearchTerm, setSubmittedSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [pendingSearchNavigation, setPendingSearchNavigation] = useState<{
    translationId: string | null;
    bookSlug: string;
    chapter: number;
    verse: number;
    nonce: number;
  } | null>(null);
  const [scrollTargetVerse, setScrollTargetVerse] = useState<{
    verse: number;
    nonce: number;
  } | null>(null);
  const [searchHighlightVerse, setSearchHighlightVerse] = useState<{
    verse: number;
    nonce: number;
  } | null>(null);
  const [dictionaryLookup, setDictionaryLookup] = useState<{
    term: string;
    nonce: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<DictionaryContextMenuState | null>(
    null
  );
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verseRefs = useRef(new Map<number, HTMLDivElement | null>());
  const passageContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hasInitialReaderQuery) {
      setHasRestoredInitialState(true);
      return;
    }

    try {
      const rawValue = window.localStorage.getItem(
        BIBLE_READER_STATE_STORAGE_KEY
      );

      if (!rawValue) {
        setHasRestoredInitialState(true);
        return;
      }

      const parsed = JSON.parse(rawValue) as {
        translation?: string;
        book?: string;
        chapter?: number;
        verse?: number | null;
      };

      if (typeof parsed.translation === "string" && parsed.translation.trim()) {
        setSelectedTranslation(parsed.translation.trim().toLowerCase());
      }

      if (typeof parsed.book === "string" && parsed.book.trim()) {
        setSelectedBook(parsed.book.trim().toLowerCase());
      }

      if (Number.isInteger(parsed.chapter) && Number(parsed.chapter) > 0) {
        setSelectedChapter(Number(parsed.chapter));
      }

      if (Number.isInteger(parsed.verse) && Number(parsed.verse) > 0) {
        setSelectedVerse(Number(parsed.verse));
      }
    } catch {
      window.localStorage.removeItem(BIBLE_READER_STATE_STORAGE_KEY);
    } finally {
      setHasRestoredInitialState(true);
    }
  }, [hasInitialReaderQuery]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(
        BIBLE_READER_HEBREW_LAYER_STORAGE_KEY
      );

      if (rawValue === "1") {
        setShowHebrewLayer(true);
      }
    } catch {
      window.localStorage.removeItem(BIBLE_READER_HEBREW_LAYER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadVersions() {
      setVersionsLoading(true);
      setVersionsError("");

      try {
        const response = await fetch("/api/bible/versions");
        const result = await readJsonSafely<{
          ok: boolean;
          error?: string;
          versions?: TranslationOption[];
        }>(response);

        if (!active) {
          return;
        }

        if (!response.ok || !result?.ok || !result.versions?.length) {
          setTranslations([]);
          setVersionsError(
            result?.error || "Nao foi possivel carregar as traducoes."
          );
          return;
        }

        const nextVersions = result.versions;

        setTranslations(nextVersions);
        setSelectedTranslation((current) => {
          if (current && nextVersions.some((translation) => translation.id === current)) {
            return current;
          }

          return nextVersions[0].id;
        });
      } catch {
        if (!active) {
          return;
        }

        setTranslations([]);
        setVersionsError("Nao foi possivel carregar as traducoes.");
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
  }, []);

  const selectedTranslationOption =
    translations.find((item) => item.id === selectedTranslation) ?? null;
  const selectedTranslationValue = selectedTranslationOption?.value ?? "";
  const selectedTranslationLabel = selectedTranslationOption?.label ?? "Carregando";

  useEffect(() => {
    if (!selectedTranslationValue) {
      setBooks([]);
      return;
    }

    let active = true;

    async function loadBooks() {
      setBooksLoading(true);
      setBooksError("");

      try {
        const response = await fetch(
          `/api/bible/books?version=${encodeURIComponent(
            selectedTranslationValue
          )}`
        );
        const result = await readJsonSafely<{
          ok: boolean;
          error?: string;
          books?: BookOption[];
        }>(response);

        if (!active) {
          return;
        }

        if (!response.ok || !result?.ok || !result.books?.length) {
          setBooks([]);
          setBooksError(result?.error || "Nao foi possivel carregar os livros.");
          return;
        }

        const nextBooks = result.books;

        setBooks(nextBooks);
        setSelectedBook((current) => {
          if (current && nextBooks.some((book) => book.id === current)) {
            return current;
          }

          return nextBooks[0].id;
        });
      } catch {
        if (!active) {
          return;
        }

        setBooks([]);
        setBooksError("Nao foi possivel carregar os livros.");
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
  }, [selectedTranslationValue]);

  const selectedBookOption =
    books.find((item) => item.id === selectedBook) ?? null;
  const selectedBookLabel = selectedBookOption?.label ?? "Selecione";
  const maxChapter = selectedBookOption?.chapters ?? 1;
  const isOldTestamentBook = selectedBookOption?.testament === "AT";

  useEffect(() => {
    setSelectedChapter((current) => Math.min(Math.max(current, 1), maxChapter));
  }, [maxChapter]);

  useEffect(() => {
    if (pendingSearchNavigation) {
      return;
    }

    setSelectedVerse(null);
  }, [
    pendingSearchNavigation,
    selectedTranslationValue,
    selectedBook,
    selectedChapter,
  ]);

  useEffect(() => {
    setIsMobileControlsOpen(false);
  }, [selectedTranslation, selectedBook, selectedChapter]);

  useEffect(() => {
    function handleScroll() {
      const nextCollapsed = window.scrollY > 72;
      setIsMobileHeaderCollapsed((current) =>
        current === nextCollapsed ? current : nextCollapsed
      );
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    function closeContextMenu() {
      setContextMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("scroll", closeContextMenu, { passive: true });
    window.addEventListener("resize", closeContextMenu);
    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", closeContextMenu);
      window.removeEventListener("resize", closeContextMenu);
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!submittedSearchTerm || !selectedTranslationValue) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    let active = true;

    async function loadSearchResults() {
      setSearchLoading(true);
      setSearchError("");

      try {
        const response = await fetch(
          `/api/bible/search?q=${encodeURIComponent(
            submittedSearchTerm
          )}&version=${encodeURIComponent(selectedTranslationValue)}`,
          { cache: "no-store" }
        );

        const result = await readJsonSafely<{
          ok: boolean;
          error?: string;
          results?: SearchResultItem[];
        }>(response);

        if (!active) {
          return;
        }

        if (!response.ok || !result?.ok) {
          setSearchResults([]);
          setSearchError(result?.error || "Nao foi possivel buscar na Biblia.");
          return;
        }

        setSearchResults(result.results ?? []);
      } catch {
        if (!active) {
          return;
        }

        setSearchResults([]);
        setSearchError("Nao foi possivel buscar na Biblia.");
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    }

    void loadSearchResults();

    return () => {
      active = false;
    };
  }, [submittedSearchTerm, selectedTranslationValue]);

  useEffect(() => {
    if (!pendingSearchNavigation) {
      return;
    }

    if (
      pendingSearchNavigation.translationId &&
      pendingSearchNavigation.translationId !== selectedTranslation
    ) {
      return;
    }

    if (!books.length) {
      return;
    }

    const matchingBook = books.find(
      (book) => book.id === pendingSearchNavigation.bookSlug
    );

    if (!matchingBook) {
      setPendingSearchNavigation(null);
      return;
    }

    setSelectedBook(pendingSearchNavigation.bookSlug);
    setSelectedChapter(pendingSearchNavigation.chapter);
  }, [books, pendingSearchNavigation, selectedTranslation]);

  useEffect(() => {
    if (!pendingSearchNavigation || !passage) {
      return;
    }

    if (
      passage.bookSlug !== pendingSearchNavigation.bookSlug ||
      passage.chapter !== pendingSearchNavigation.chapter
    ) {
      return;
    }

    setSelectedVerse(pendingSearchNavigation.verse);
    setScrollTargetVerse({
      verse: pendingSearchNavigation.verse,
      nonce: pendingSearchNavigation.nonce,
    });
    setSearchHighlightVerse({
      verse: pendingSearchNavigation.verse,
      nonce: pendingSearchNavigation.nonce,
    });
    setSubmittedSearchTerm("");
    setSearchResults([]);
    setSearchError("");
    setSearchTerm("");
    setPendingSearchNavigation(null);
    setIsMobileControlsOpen(false);
  }, [passage, pendingSearchNavigation]);

  useEffect(() => {
    if (
      !selectedVerse ||
      !scrollTargetVerse ||
      scrollTargetVerse.verse !== selectedVerse ||
      submittedSearchTerm ||
      passageLoading
    ) {
      return;
    }

    const activeVerseElement = verseRefs.current.get(selectedVerse) ?? null;

    if (!activeVerseElement) {
      return;
    }

    const verseElement: HTMLDivElement = activeVerseElement;

    function centerVerse() {
      const passageContainer = passageContainerRef.current;

      if (
        passageContainer &&
        passageContainer.scrollHeight > passageContainer.clientHeight
      ) {
        const relativeTop = getOffsetWithinContainer(
          verseElement,
          passageContainer
        );
        const nextTop =
          relativeTop - (passageContainer.clientHeight - verseElement.offsetHeight) / 2;

        passageContainer.scrollTo({
          top: Math.max(nextTop, 0),
          behavior: "smooth",
        });
      } else {
        verseElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }

    let retryShort = 0;
    let retryLong = 0;
    let retryLate = 0;
    let clearTargetTimeout = 0;

    const frame = window.requestAnimationFrame(() => {
      centerVerse();

      retryShort = window.setTimeout(centerVerse, 120);
      retryLong = window.setTimeout(centerVerse, 320);
      retryLate = window.setTimeout(centerVerse, 700);

      clearTargetTimeout = window.setTimeout(() => {
        setScrollTargetVerse((current) =>
          current?.nonce === scrollTargetVerse.nonce ? null : current
        );
      }, 1100);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retryShort);
      window.clearTimeout(retryLong);
      window.clearTimeout(retryLate);
      window.clearTimeout(clearTargetTimeout);
    };
  }, [
    passageLoading,
    scrollTargetVerse,
    selectedVerse,
    submittedSearchTerm,
    passage?.bookSlug,
    passage?.chapter,
  ]);

  useEffect(() => {
    if (!searchHighlightVerse) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setSearchHighlightVerse((current) =>
        current?.nonce === searchHighlightVerse.nonce ? null : current
      );
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchHighlightVerse]);

  useEffect(() => {
    if (!selectedTranslationValue || !selectedBook || !selectedChapter) {
      setPassage(null);
      return;
    }

    let active = true;

    async function loadPassage() {
      setPassageLoading(true);
      setPassageError("");

      try {
        const response = await fetch(
          `/api/bible/passage?version=${encodeURIComponent(
            selectedTranslationValue
          )}&book=${encodeURIComponent(selectedBook)}&chapter=${selectedChapter}`
        );
        const result = await readJsonSafely<{
          ok: boolean;
          error?: string;
          passage?: PassageResponse;
        }>(response);

        if (!active) {
          return;
        }

        if (!response.ok || !result?.ok || !result.passage) {
          setPassage(null);
          setPassageError(
            result?.error || "Nao foi possivel carregar este capitulo."
          );
          return;
        }

        const nextPassage = result.passage;

        setPassage(nextPassage);
        setSelectedVerse((current) => {
          if (current && nextPassage.verses.some((verse) => verse.verse === current)) {
            return current;
          }

          return nextPassage.verses[0]?.verse ?? null;
        });
      } catch {
        if (!active) {
          return;
        }

        setPassage(null);
        setPassageError("Nao foi possivel carregar este capitulo.");
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
  }, [selectedBook, selectedChapter, selectedTranslationValue]);

  useEffect(() => {
    if (!showHebrewLayer || !selectedBook || !selectedChapter || !isOldTestamentBook) {
      setHebrewPassage(null);
      setHebrewPassageError("");
      setHebrewPassageLoading(false);
      return;
    }

    let active = true;

    async function loadHebrewPassage() {
      setHebrewPassageLoading(true);
      setHebrewPassageError("");

      try {
        const response = await fetch(
          `/api/bible/hebrew-passage?book=${encodeURIComponent(
            selectedBook
          )}&chapter=${selectedChapter}`
        );
        const result = await readJsonSafely<{
          ok: boolean;
          error?: string;
          passage?: HebrewPassageResponse;
        }>(response);

        if (!active) {
          return;
        }

        if (!response.ok || !result?.ok || !result.passage) {
          setHebrewPassage(null);
          setHebrewPassageError(
            result?.error || "Nao foi possivel carregar a camada hebraica."
          );
          return;
        }

        setHebrewPassage(result.passage);
      } catch {
        if (!active) {
          return;
        }

        setHebrewPassage(null);
        setHebrewPassageError("Nao foi possivel carregar a camada hebraica.");
      } finally {
        if (active) {
          setHebrewPassageLoading(false);
        }
      }
    }

    void loadHebrewPassage();

    return () => {
      active = false;
    };
  }, [isOldTestamentBook, selectedBook, selectedChapter, showHebrewLayer]);

  useEffect(() => {
    if (!hasRestoredInitialState) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (selectedTranslation) {
      params.set("version", selectedTranslation);
    } else {
      params.delete("version");
    }

    if (selectedBook) {
      params.set("book", selectedBook);
    } else {
      params.delete("book");
    }

    if (selectedChapter > 0) {
      params.set("chapter", String(selectedChapter));
    } else {
      params.delete("chapter");
    }

    if (selectedVerse) {
      params.set("verse", String(selectedVerse));
    } else {
      params.delete("verse");
    }

    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [
    hasRestoredInitialState,
    pathname,
    router,
    searchParams,
    selectedBook,
    selectedChapter,
    selectedTranslation,
    selectedVerse,
  ]);

  useEffect(() => {
    if (!hasRestoredInitialState || !selectedTranslation || !selectedBook) {
      return;
    }

    const nextState = {
      translation: selectedTranslation,
      book: selectedBook,
      chapter: selectedChapter,
      verse: selectedVerse,
    };

    window.localStorage.setItem(
      BIBLE_READER_STATE_STORAGE_KEY,
      JSON.stringify(nextState)
    );
  }, [
    hasRestoredInitialState,
    selectedBook,
    selectedChapter,
    selectedTranslation,
    selectedVerse,
  ]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        BIBLE_READER_HEBREW_LAYER_STORAGE_KEY,
        showHebrewLayer ? "1" : "0"
      );
    } catch {
      // ignore
    }
  }, [showHebrewLayer]);

  const chapterOptions = useMemo(
    () => Array.from({ length: maxChapter }, (_, index) => index + 1),
    [maxChapter]
  );
  const hebrewVersesByNumber = useMemo(() => {
    return new Map((hebrewPassage?.verses ?? []).map((item) => [item.verse, item]));
  }, [hebrewPassage]);

  const referenceLabel = useMemo(() => {
    return `${selectedBookLabel} ${selectedChapter}${
      selectedVerse ? `:${selectedVerse}` : ""
    }`;
  }, [selectedBookLabel, selectedChapter, selectedVerse]);

  const noteContext = useMemo(() => {
    if (!passage) {
      return null;
    }

    return {
      type: "bible-reference",
      key: `${passage.version}:${passage.bookSlug}:${passage.chapter}${
        selectedVerse ? `:${selectedVerse}` : ""
      }`,
      label: referenceLabel,
    };
  }, [passage, referenceLabel, selectedVerse]);

  const canGoToPreviousChapter = selectedChapter > 1;
  const canGoToNextChapter = selectedChapter < maxChapter;

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchTerm.trim();

    if (!nextQuery) {
      setSubmittedSearchTerm("");
      setSearchResults([]);
      setSearchError("");
      return;
    }

    setSubmittedSearchTerm(nextQuery);
  }

  function handleOpenSearchResult(result: SearchResultItem) {
    const matchingTranslation = translations.find(
      (item) => item.value === result.version
    );

    const nextTranslationId = matchingTranslation?.id ?? null;

    setPendingSearchNavigation({
      translationId: nextTranslationId,
      bookSlug: result.bookSlug,
      chapter: result.chapter,
      verse: result.verse,
      nonce: Date.now(),
    });

    setSubmittedSearchTerm("");
    setSearchResults([]);
    setSearchError("");
    setSearchTerm("");
    setIsMobileControlsOpen(false);

    if (nextTranslationId && nextTranslationId !== selectedTranslation) {
      setSelectedTranslation(nextTranslationId);
    }
  }

  function extractDictionaryTerm(value: string) {
    return value
      .trim()
      .replace(/^[^0-9A-Za-zÀ-ÿ]+|[^0-9A-Za-zÀ-ÿ]+$/g, "");
  }

  function handleDictionaryLookup(term: string) {
    const nextTerm = extractDictionaryTerm(term);

    if (!nextTerm) {
      return;
    }

    setDictionaryLookup({
      term: nextTerm,
      nonce: Date.now(),
    });
  }

  function openContextMenu(
    term: string,
    reference: string,
    verseText: string,
    x: number,
    y: number
  ) {
    const nextTerm = extractDictionaryTerm(term);

    if (!nextTerm) {
      return;
    }

    setContextMenu({
      term: nextTerm,
      reference,
      verseText,
      x: Math.min(window.innerWidth - 180, Math.max(16, x)),
      y: Math.min(window.innerHeight - 120, Math.max(16, y)),
    });
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  async function handleShareReference(reference: string, verseText: string) {
    const params = new URLSearchParams();

    if (selectedTranslation) {
      params.set("version", selectedTranslation);
    }

    if (selectedBook) {
      params.set("book", selectedBook);
    }

    if (selectedChapter > 0) {
      params.set("chapter", String(selectedChapter));
    }

    if (selectedVerse) {
      params.set("verse", String(selectedVerse));
    }

    const query = params.toString();
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${pathname}${query ? `?${query}` : ""}`
        : `${pathname}${query ? `?${query}` : ""}`;

    try {
      const shareText = `${reference}\n\n${verseText}`;

      if (navigator.share) {
        await navigator.share({
          title: reference,
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      }
    } catch {
      // silencio proposital
    } finally {
      setContextMenu(null);
    }
  }

  function renderVerseText(text: string, reference: string) {
    return text.split(/(\s+)/).map((part, index) => {
      if (!part) {
        return null;
      }

      if (/^\s+$/.test(part)) {
        return <span key={`space-${index}`}>{part}</span>;
      }

      const lookupTerm = extractDictionaryTerm(part);

      if (!lookupTerm) {
        return <span key={`plain-${index}`}>{part}</span>;
      }

      return (
        <button
          key={`word-${index}-${lookupTerm}`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openContextMenu(part, reference, text, event.clientX, event.clientY);
          }}
          onTouchStart={(event) => {
            const touch = event.touches[0];

            clearLongPressTimer();
            longPressTimerRef.current = setTimeout(() => {
              openContextMenu(part, reference, text, touch.clientX, touch.clientY);
            }, 450);
          }}
          onTouchEnd={() => {
            clearLongPressTimer();
          }}
          onTouchCancel={() => {
            clearLongPressTimer();
          }}
          className="inline rounded-md px-0.5 text-left transition hover:bg-sky-300/10 hover:text-sky-200"
        >
          {part}
        </button>
      );
    });
  }

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0f] px-3 py-3 pb-24 text-white md:h-[100dvh] md:overflow-hidden md:px-6 md:py-5 md:pb-6">
      <div className="mx-auto flex max-w-7xl flex-col md:h-full">
        <div
          className={`mb-3 rounded-2xl border border-white/10 bg-white/[0.025] px-3 py-3 transition-all duration-300 md:mb-4 md:px-5 md:py-4 ${
            isMobileHeaderCollapsed
              ? "sticky top-2 z-20 py-2 backdrop-blur-xl"
              : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/categoria/biblia"
              className="inline-flex items-center gap-2 text-sm font-medium text-amber-400 transition hover:text-amber-300"
            >
              <span aria-hidden="true">←</span>
              <span>Voltar</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200">
                Biblia
              </span>
              <span className="text-sm text-zinc-400">{selectedTranslationLabel}</span>
            </div>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              isMobileHeaderCollapsed
                ? "mt-0 max-h-0 opacity-0 md:mt-4 md:max-h-32 md:opacity-100"
                : "mt-3 max-h-32 opacity-100 md:mt-4"
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.26em] text-amber-400 md:text-[11px] md:tracking-[0.3em]">
              Leitura biblica
            </p>
            <h1 className="mt-1.5 text-[1.45rem] font-bold leading-tight md:mt-2 md:text-3xl">
              {passage?.book ?? selectedBookLabel} {selectedChapter}
            </h1>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col rounded-[34px] border border-white/10 bg-[#07090e] shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:min-h-0 md:overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.06),transparent_22%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.06),transparent_18%),linear-gradient(180deg,rgba(10,12,18,0.88),rgba(6,8,14,0.94))]" />

          <div className="relative z-10 grid w-full gap-0 md:h-full xl:grid-cols-[minmax(0,1fr)_340px]">
            <section className="border-b border-white/10 md:flex md:min-h-0 md:flex-col xl:border-b-0 xl:border-r">
              <div className="border-b border-white/10 bg-black/20 px-3 py-3 backdrop-blur-xl md:px-6 md:py-4">
                <form
                  onSubmit={handleSearchSubmit}
                  className="mb-3 flex flex-col gap-2 md:mb-4 md:flex-row"
                >
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar palavra ou frase na Biblia"
                    className="h-11 flex-1 rounded-xl border border-white/10 bg-[#12151d] px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-amber-300/40"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-200"
                    >
                      Buscar
                    </button>
                    {submittedSearchTerm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setSubmittedSearchTerm("");
                          setSearchResults([]);
                          setSearchError("");
                        }}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-white/10"
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="hidden items-center justify-between gap-3 xl:hidden">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      Navegacao
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-100">
                      {selectedBookLabel} {selectedChapter} •{" "}
                      {selectedTranslationLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsMobileControlsOpen((current) => !current)
                    }
                    className="inline-flex shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/10"
                  >
                    Alterar
                  </button>
                </div>

                <div className="xl:hidden">
                  <button
                    type="button"
                    onClick={() => setIsMobileControlsOpen(true)}
                    className="w-full rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300/75">
                          Leitura atual
                        </p>
                        <p className="mt-1 truncate text-sm text-zinc-400">
                          Toque para trocar livro, capítulo ou tradução
                        </p>
                        <p className="mt-1 text-lg font-semibold leading-tight text-zinc-50">
                          {selectedBookLabel} {selectedChapter}
                        </p>
                        <p className="hidden mt-1 truncate text-sm text-zinc-400">
                          {selectedBookLabel} {selectedChapter} •{" "}
                          Toque para trocar livro, capítulo ou tradução
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/12 px-3 py-1.5 text-[11px] font-medium text-amber-100">
                        Alterar
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-zinc-300">
                        {selectedTranslationLabel}
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-zinc-300">
                        Capítulo {selectedChapter} de {maxChapter}
                      </span>
                    </div>
                  </button>
                </div>

                <div className="hidden gap-3 md:grid-cols-3 xl:grid">
                  <Field label="Traducao">
                    <Select
                      value={selectedTranslation}
                      onChange={setSelectedTranslation}
                      disabled={versionsLoading}
                    >
                      {translations.map((translation) => (
                        <option key={translation.id} value={translation.id}>
                          {translation.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Livro">
                    <Select
                      value={selectedBook}
                      onChange={setSelectedBook}
                      disabled={booksLoading || !books.length}
                    >
                      {books.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Capitulo">
                    <Select
                      value={selectedChapter}
                      onChange={(value) => setSelectedChapter(Number(value))}
                      disabled={booksLoading || !chapterOptions.length}
                    >
                      {chapterOptions.map((chapter) => (
                        <option key={chapter} value={chapter}>
                          {chapter}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 md:mt-4 md:gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-zinc-400">
                      {referenceLabel} <span className="text-zinc-600">•</span>{" "}
                      {selectedTranslationLabel}
                    </span>
                    {isOldTestamentBook ? (
                      <button
                        type="button"
                        onClick={() => setShowHebrewLayer((current) => !current)}
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-medium tracking-[0.12em] transition ${
                          showHebrewLayer
                            ? "border-amber-300/30 bg-amber-300/12 text-amber-200"
                            : "border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
                        }`}
                      >
                        Hebraico + Transl.
                      </button>
                    ) : null}
                  </div>

                  <div className="hidden items-center gap-2 text-sm sm:flex">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedChapter((current) => Math.max(current - 1, 1))
                      }
                      disabled={!canGoToPreviousChapter}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedChapter((current) =>
                          Math.min(current + 1, maxChapter)
                        )
                      }
                      disabled={!canGoToNextChapter}
                      className="rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Proximo
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={passageContainerRef}
                className="px-3 py-4 md:flex-1 md:min-h-0 md:overflow-y-auto md:px-6 md:py-6"
              >
                <article className="mx-auto max-w-4xl">
                  {submittedSearchTerm ? (
                    <div className="mb-4 rounded-[24px] border border-white/10 bg-[#0d1016]/80 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] backdrop-blur-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                            Busca biblica
                          </p>
                          <h2 className="mt-1 text-sm font-semibold text-white">
                            Resultados para &quot;{submittedSearchTerm}&quot;
                          </h2>
                        </div>

                        {searchLoading ? (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-300">
                            Buscando...
                          </span>
                        ) : (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-zinc-300">
                            {searchResults.length} resultado(s)
                          </span>
                        )}
                      </div>

                      {searchError ? (
                        <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                          {searchError}
                        </div>
                      ) : searchLoading ? null : searchResults.length === 0 ? (
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                          Nenhum versiculo encontrado.
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-2">
                          {searchResults.map((result) => (
                            <button
                              key={`${result.version}-${result.bookSlug}-${result.chapter}-${result.verse}`}
                              type="button"
                              onClick={() => handleOpenSearchResult(result)}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                                  {result.reference}
                                </span>
                                <span className="text-[11px] text-zinc-500">
                                  {result.version}
                                </span>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-200">
                                {result.text}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {(versionsError || booksError) && (
                    <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {versionsError || booksError}
                    </div>
                  )}

                  {passageLoading ? (
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-zinc-300">
                      Carregando capitulo...
                    </div>
                  ) : passageError ? (
                    <div className="rounded-[28px] border border-red-500/20 bg-red-500/10 px-5 py-10 text-center text-sm text-red-200">
                      {passageError}
                    </div>
                  ) : passage?.verses?.length ? (
                    <div className="rounded-[30px] border border-white/10 bg-[#0d1016]/80 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-sm md:p-4">
                      {showHebrewLayer && isOldTestamentBook ? (
                        <div className="mb-4 rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-200/70">
                            Camada Hebraica
                          </p>
                          <p className="mt-1 text-sm text-zinc-400">
                            Hebraico original e transliteracao acima do texto em portugues.
                          </p>
                          {hebrewPassageLoading ? (
                            <p className="mt-2 text-sm text-zinc-400">
                              Carregando hebraico e transliteracao...
                            </p>
                          ) : hebrewPassageError ? (
                            <p className="mt-2 text-sm text-red-200">
                              {hebrewPassageError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        {passage.verses.map((item) => {
                          const active = item.verse === selectedVerse;
                          const highlightedFromSearch =
                            searchHighlightVerse?.verse === item.verse;
                          const hebrewVerse =
                            hebrewVersesByNumber.get(item.verse) ?? null;

                          return (
                            <div
                              key={`${item.chapter}-${item.verse}`}
                              ref={(node) => {
                                verseRefs.current.set(item.verse, node);
                              }}
                              onClick={() => setSelectedVerse(item.verse)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setSelectedVerse(item.verse);
                                }
                              }}
                              role="button"
                              tabIndex={0}
                              className={`block w-full rounded-[22px] px-3 py-2 text-left transition ${
                                highlightedFromSearch
                                  ? "bg-amber-300/16 ring-1 ring-amber-300/45 shadow-[0_0_0_1px_rgba(252,211,77,0.18),0_18px_44px_rgba(245,158,11,0.18)]"
                                  : active
                                  ? "bg-amber-300/10 shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                                  : "hover:bg-white/[0.04]"
                              }`}
                            >
                              {showHebrewLayer && hebrewVerse ? (
                                <div className="mb-3 rounded-[16px] border border-white/6 bg-white/[0.025] px-3 py-2.5">
                                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                                    Hebraico
                                  </p>
                                  <p
                                    dir="rtl"
                                    className="mt-1.5 text-right font-serif text-[1.08rem] leading-8 text-zinc-100 md:text-[1.16rem]"
                                  >
                                    {hebrewVerse.hebrew}
                                  </p>
                                  <p className="mt-2 border-t border-white/6 pt-2 text-[0.92rem] italic leading-6 text-zinc-400">
                                    {hebrewVerse.transliteration}
                                  </p>
                                </div>
                              ) : null}
                              <p className="text-[1.07rem] leading-9 text-zinc-100 md:text-[1.12rem] md:leading-10">
                                <span
                                  className={`mr-2 text-sm font-semibold ${
                                    highlightedFromSearch || active
                                      ? "text-amber-300"
                                      : "text-zinc-500"
                                  }`}
                                >
                                  {item.verse}
                                </span>
                                <span>{renderVerseText(item.text, item.reference)}</span>
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-zinc-300">
                      Nenhum versiculo carregado.
                    </div>
                  )}
                </article>
              </div>
            </section>

            <aside className="hidden min-h-0 flex-col bg-[#0f1117]/92 p-4 backdrop-blur-xl xl:flex">
              <div className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  Referencia ativa
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  {referenceLabel}
                </h2>
                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  Ambiente integrado ao reader do Acervo, com foco na leitura e
                  apoio lateral para estudo.
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                <StudyNotesPanel
                  currentDocumentTitle={referenceLabel}
                  variant="embedded"
                  embeddedLabel="Notas"
                  noteContext={noteContext}
                />
              </div>
            </aside>
          </div>
        </div>

        <ReaderDictionaryPanel
          variant="floating"
          requestedQuery={dictionaryLookup}
        />

        <div className="xl:hidden">
          <StudyNotesPanel
            currentDocumentTitle={referenceLabel}
            variant="floating"
            noteContext={noteContext}
          />
        </div>

        {contextMenu ? (
          <div className="fixed inset-0 z-[60]">
            <div
              className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
              onClick={() => setContextMenu(null)}
            />

            <div className="hidden xl:block">
              <div
                className="absolute min-w-[11rem] rounded-[20px] border border-white/10 bg-[#0f1117]/96 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl"
                style={{
                  left: contextMenu.x,
                  top: contextMenu.y,
                }}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <p className="px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  {contextMenu.term}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    handleDictionaryLookup(contextMenu.term);
                    setContextMenu(null);
                  }}
                  className="mt-1 flex w-full items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <span>Pesquisar</span>
                  <span className="text-zinc-500">⌕</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleShareReference(
                      contextMenu.reference,
                      contextMenu.verseText
                    )
                  }
                  className="mt-2 flex w-full items-center justify-between rounded-[14px] border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <span>Compartilhar</span>
                  <span className="text-zinc-500">↗</span>
                </button>
              </div>
            </div>

            <div className="absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] rounded-[26px] border border-white/10 bg-[#0f1117]/96 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl xl:hidden">
              <div className="mb-3 flex justify-center">
                <span className="h-1.5 w-12 rounded-full bg-white/15" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                    Palavra selecionada
                  </p>
                  <h3 className="mt-1 truncate text-base font-semibold text-white">
                    {contextMenu.term}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    {contextMenu.reference}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setContextMenu(null)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleDictionaryLookup(contextMenu.term);
                    setContextMenu(null);
                  }}
                  className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <span>Pesquisar no dicionario</span>
                  <span className="text-zinc-500">⌕</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleShareReference(
                      contextMenu.reference,
                      contextMenu.verseText
                    )
                  }
                  className="flex w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-sm font-medium text-zinc-100 transition hover:bg-white/[0.07]"
                >
                  <span>Compartilhar versiculo</span>
                  <span className="text-zinc-500">↗</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isMobileControlsOpen ? (
          <div className="fixed inset-0 z-40 xl:hidden">
            <button
              type="button"
              aria-label="Fechar navegacao"
              onClick={() => setIsMobileControlsOpen(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-[6px]"
            />

            <div className="absolute inset-x-0 bottom-0 rounded-t-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,19,26,0.98),rgba(10,12,18,0.98))] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="mb-3 flex justify-center">
                <span className="h-1.5 w-14 rounded-full bg-white/15" />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300/75">
                    Ir para
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {selectedBookLabel} {selectedChapter}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Escolha a tradução, o livro e o capítulo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileControlsOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
                >
                  X
                </button>
              </div>

              <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Referência atual
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-zinc-300">
                    {selectedTranslationLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-zinc-300">
                    {selectedBookLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-zinc-300">
                    Capítulo {selectedChapter}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedChapter((current) => Math.max(current - 1, 1))
                    }
                    disabled={!canGoToPreviousChapter}
                    className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedChapter((current) =>
                        Math.min(current + 1, maxChapter)
                      )
                    }
                    disabled={!canGoToNextChapter}
                    className="rounded-[20px] border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm font-medium text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Próximo
                  </button>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
                  <Field label="Traducao">
                    <Select
                      value={selectedTranslation}
                      onChange={setSelectedTranslation}
                      disabled={versionsLoading}
                    >
                      {translations.map((translation) => (
                        <option key={translation.id} value={translation.id}>
                          {translation.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Livro">
                    <Select
                      value={selectedBook}
                      onChange={setSelectedBook}
                      disabled={booksLoading || !books.length}
                    >
                      {books.map((book) => (
                        <option key={book.id} value={book.id}>
                          {book.label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Capitulo">
                    <Select
                      value={selectedChapter}
                      onChange={(value) => setSelectedChapter(Number(value))}
                      disabled={booksLoading || !chapterOptions.length}
                    >
                      {chapterOptions.map((chapter) => (
                        <option key={chapter} value={chapter}>
                          {chapter}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {isOldTestamentBook ? (
                  <button
                    type="button"
                    onClick={() => setShowHebrewLayer((current) => !current)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      showHebrewLayer
                        ? "border-amber-300/30 bg-amber-300/12 text-amber-200"
                        : "border-white/10 bg-white/[0.04] text-zinc-200"
                    }`}
                  >
                    {showHebrewLayer
                      ? "Ocultar hebraico + transliteracao"
                      : "Mostrar hebraico + transliteracao"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-[max(0.75rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[max(0.75rem,env(safe-area-inset-right))] xl:hidden">
            <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,21,29,0.92),rgba(10,12,18,0.96))] px-3 py-2 shadow-[0_-16px_46px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <button
                type="button"
                onClick={() =>
                  setSelectedChapter((current) => Math.max(current - 1, 1))
              }
              disabled={!canGoToPreviousChapter}
              className="inline-flex min-w-[84px] justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>

            <button
              type="button"
              onClick={() => setIsMobileControlsOpen(true)}
              className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2.5 transition hover:bg-white/10"
            >
              <div className="min-w-0 text-center">
                <p className="truncate text-xs font-semibold text-zinc-100">
                  {selectedBookLabel} {selectedChapter}
                </p>
                <p className="text-[10px] text-zinc-500">
                  Toque para alterar
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedChapter((current) =>
                  Math.min(current + 1, maxChapter)
                )
              }
              disabled={!canGoToNextChapter}
              className="inline-flex min-w-[84px] justify-center rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
