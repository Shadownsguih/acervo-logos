"use client";

import Link from "next/link";
import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import ReaderDictionaryPanel from "@/app/components/reader-dictionary-panel";
import ReaderQuickSwitcher from "@/app/components/reader-quick-switcher";
import ReaderVolumeSwitcher from "@/app/components/reader-volume-switcher";
import StudyNotesPanel from "@/app/components/study-notes-panel";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const SMALL_MOBILE_BREAKPOINT = 390;
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1180;
const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_VERTICAL_DRIFT = 90;
const MIN_ZOOM = 1;
const MAX_ZOOM = 2.8;
const ZOOM_STEP = 0.15;
const DOUBLE_TAP_DELAY = 300;
const MOBILE_CONTROLS_HIDE_DELAY = 1800;
const DESKTOP_CONTROLS_HIDE_DELAY = 2200;

type FitMode = "width" | "page";
type DeviceKind =
  | "mobile-small"
  | "mobile-standard"
  | "tablet"
  | "desktop";

export type ReaderV2VolumeItem = {
  id: string;
  title: string;
  volume_number: number | null;
  href?: string;
};

export type ReaderV2ClientProps = {
  fileUrl: string;
  title: string;
  materialTitle?: string;
  currentReaderHref?: string;
  readingProgressKey: string;
  volumeItems?: ReaderV2VolumeItem[];
  environmentLabel?: string;
  quickSwitcherLabel?: string;
  backHref?: string;
  backLabel?: string;
  readerBasePath?: "/ler";
  readerQueryValue?: "v1" | "v2";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDistance(
  touchA: { clientX: number; clientY: number },
  touchB: { clientX: number; clientY: number }
) {
  const dx = touchA.clientX - touchB.clientX;
  const dy = touchA.clientY - touchB.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getMidpoint(
  touchA: { clientX: number; clientY: number },
  touchB: { clientX: number; clientY: number }
) {
  return {
    x: (touchA.clientX + touchB.clientX) / 2,
    y: (touchA.clientY + touchB.clientY) / 2,
  };
}

function resolveDeviceKind(width: number): DeviceKind {
  if (width < SMALL_MOBILE_BREAKPOINT) {
    return "mobile-small";
  }

  if (width < MOBILE_BREAKPOINT) {
    return "mobile-standard";
  }

  if (width < TABLET_BREAKPOINT) {
    return "tablet";
  }

  return "desktop";
}

export default function ReaderV2Client({
  fileUrl,
  title,
  materialTitle,
  currentReaderHref,
  readingProgressKey,
  volumeItems = [],
  environmentLabel = "Modo leitura",
  quickSwitcherLabel = "Trocar de livro",
  backHref,
  backLabel = "Voltar",
  readerBasePath = "/ler",
  readerQueryValue,
}: ReaderV2ClientProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const readingAreaRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const controlsHideTimerRef = useRef<number | null>(null);
  const pageFlipTimerRef = useRef<number | null>(null);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number | null>(null);
  const pinchStartScrollLeftRef = useRef<number>(0);
  const pinchStartScrollTopRef = useRef<number>(0);
  const pinchCenterXRef = useRef<number>(0);
  const pinchCenterYRef = useRef<number>(0);
  const pinchActiveRef = useRef(false);

  const previousDesktopZoomRef = useRef(1);
  const pendingMobilePinchAdjustmentRef = useRef<{
    startZoom: number;
    nextZoom: number;
    centerX: number;
    centerY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [pageOriginalWidth, setPageOriginalWidth] = useState<number | null>(
    null
  );
  const [pageOriginalHeight, setPageOriginalHeight] = useState<number | null>(
    null
  );
  const [fitMode, setFitMode] = useState<FitMode>("page");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [deviceKind, setDeviceKind] = useState<DeviceKind>("desktop");
  const [isDocumentLoading, setIsDocumentLoading] = useState(true);
  const [isPageFlipActive, setIsPageFlipActive] = useState(false);
  const [pageFlipDirection, setPageFlipDirection] = useState<"next" | "previous">(
    "next"
  );
  const [pageFlipSourcePage, setPageFlipSourcePage] = useState<number | null>(
    null
  );
  const [pageFlipTargetPage, setPageFlipTargetPage] = useState<number | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isVolumesOpen, setIsVolumesOpen] = useState(false);
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState(false);
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isStudyToolsOpen, setIsStudyToolsOpen] = useState(false);
  const [statusHint, setStatusHint] = useState(
    "Ambiente de leitura ativo. Toque no centro para recolher os controles."
  );

  const resolvedMaterialTitle = materialTitle ?? title;
  const resolvedCurrentReaderHref =
    currentReaderHref ?? volumeItems[0]?.href ?? `/ler`;
  const hasMultipleVolumes = volumeItems.length > 1;
  const isSmallMobile = deviceKind === "mobile-small";
  const isMobile =
    deviceKind === "mobile-small" || deviceKind === "mobile-standard";
  const isTablet = deviceKind === "tablet";
  const isLandscape =
    containerWidth > 0 && containerHeight > 0
      ? containerWidth > containerHeight
      : false;
  const isMobileLandscape = isMobile && isLandscape;
  const isTabletLandscape = isTablet && isLandscape;
  const isZoomed = zoomLevel > 1.01;
  const isMobileZoomed = isMobile && isZoomed;
  const isAuxiliaryPanelOpen =
    (hasMultipleVolumes && isVolumesOpen) ||
    isThumbnailsOpen ||
    isDictionaryOpen ||
    isNotesOpen ||
    (isMobile && isStudyToolsOpen);

  function closeStudyPanels() {
    setIsVolumesOpen(false);
    setIsDictionaryOpen(false);
    setIsNotesOpen(false);
  }

  function toggleVolumesPanel() {
    setIsStudyToolsOpen(true);
    setIsDictionaryOpen(false);
    setIsNotesOpen(false);
    setIsVolumesOpen((current) => !current);
  }

  const clearHideChromeTimer = useCallback(() => {
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  }, []);

  const clearPageFlipTimer = useCallback(() => {
    if (pageFlipTimerRef.current) {
      window.clearTimeout(pageFlipTimerRef.current);
      pageFlipTimerRef.current = null;
    }
  }, []);

  function focusShell() {
    window.requestAnimationFrame(() => {
      shellRef.current?.focus();
    });
  }

  const scheduleChromeAutoHide = useCallback(() => {
    clearHideChromeTimer();

    if (isAuxiliaryPanelOpen) {
      return;
    }

    if (isMobile) {
      controlsHideTimerRef.current = window.setTimeout(() => {
        setIsChromeVisible(false);
      }, MOBILE_CONTROLS_HIDE_DELAY);
      return;
    }

    if (isFullscreen) {
      controlsHideTimerRef.current = window.setTimeout(() => {
        setIsChromeVisible(false);
      }, DESKTOP_CONTROLS_HIDE_DELAY);
    }
  }, [clearHideChromeTimer, isAuxiliaryPanelOpen, isFullscreen, isMobile]);

  const revealChromeTemporarily = useCallback(
    (nextHint?: string) => {
      setIsChromeVisible(true);

      if (typeof nextHint === "string") {
        setStatusHint(nextHint);
      }

      scheduleChromeAutoHide();
    },
    [scheduleChromeAutoHide]
  );

  const saveProgress = useCallback(
    (nextPage: number) => {
      try {
        window.localStorage.setItem(readingProgressKey, String(nextPage));
      } catch {
        // evita quebra se o localStorage estiver indisponivel
      }
    },
    [readingProgressKey]
  );

  const triggerPageFlip = useCallback(
    (fromPage: number, toPage: number) => {
      if (isDocumentLoading || fromPage === toPage) {
        return;
      }

      clearPageFlipTimer();
      setPageFlipDirection(toPage > fromPage ? "next" : "previous");
      setPageFlipSourcePage(fromPage);
      setPageFlipTargetPage(toPage);
      setIsPageFlipActive(true);
      pageFlipTimerRef.current = window.setTimeout(() => {
        setIsPageFlipActive(false);
        setPageFlipSourcePage(null);
        setPageFlipTargetPage(null);
        pageFlipTimerRef.current = null;
      }, 420);
    },
    [clearPageFlipTimer, isDocumentLoading]
  );

  function goToPage(nextValue: number, shouldRevealChrome = true) {
    const safePage = clamp(nextValue, 1, numPages || 1);
    if (safePage !== pageNumber) {
      triggerPageFlip(pageNumber, safePage);
    }
    setPageNumber(safePage);
    setPageInput(String(safePage));
    setErrorMessage("");
    const nextHint = `Pagina ${safePage} de ${numPages || safePage}`;

    setStatusHint(nextHint);

    if (shouldRevealChrome) {
      revealChromeTemporarily(nextHint);
    }
  }

  function goToPreviousPage(shouldRevealChrome = true) {
    setPageNumber((current) => {
      const nextValue = Math.max(current - 1, 1);
      if (nextValue !== current) {
        triggerPageFlip(current, nextValue);
      }
      setPageInput(String(nextValue));
      setErrorMessage("");
      const nextHint = `Pagina ${nextValue} de ${numPages || nextValue}`;

      setStatusHint(nextHint);

      if (shouldRevealChrome) {
        revealChromeTemporarily(nextHint);
      }

      return nextValue;
    });
  }

  function goToNextPage(shouldRevealChrome = true) {
    setPageNumber((current) => {
      const nextValue = Math.min(current + 1, numPages || 1);
      if (nextValue !== current) {
        triggerPageFlip(current, nextValue);
      }
      setPageInput(String(nextValue));
      setErrorMessage("");
      const nextHint = `Pagina ${nextValue} de ${numPages || nextValue}`;

      setStatusHint(nextHint);

      if (shouldRevealChrome) {
        revealChromeTemporarily(nextHint);
      }

      return nextValue;
    });
  }

  function resetZoom() {
    setZoomLevel(1);
    setStatusHint("Zoom ajustado para 100%.");

    requestAnimationFrame(() => {
      const scrollArea = scrollAreaRef.current;
      if (!scrollArea) return;

      scrollArea.scrollTo({
        left: 0,
        top: 0,
        behavior: "auto",
      });
    });

    revealChromeTemporarily("Zoom ajustado para 100%.");
  }

  function zoomIn() {
    setZoomLevel((current) => {
      const nextZoom = clamp(
        Number((current + ZOOM_STEP).toFixed(2)),
        MIN_ZOOM,
        MAX_ZOOM
      );

      setStatusHint(`Zoom em ${Math.round(nextZoom * 100)}%.`);
      return nextZoom;
    });

    revealChromeTemporarily();
  }

  function zoomOut() {
    setZoomLevel((current) => {
      const nextZoom = clamp(
        Number((current - ZOOM_STEP).toFixed(2)),
        MIN_ZOOM,
        MAX_ZOOM
      );

      setStatusHint(`Zoom em ${Math.round(nextZoom * 100)}%.`);
      return nextZoom;
    });

    revealChromeTemporarily();
  }

  async function toggleFullscreen() {
    const shell = shellRef.current;

    if (!shell) {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignora bloqueios do navegador
    } finally {
      revealChromeTemporarily();
      focusShell();
    }
  }

  function handleDocumentLoadSuccess({
    numPages: loadedPages,
  }: {
    numPages: number;
  }) {
    setNumPages(loadedPages);
    setIsDocumentLoading(false);
    setErrorMessage("");

    let initialPage = 1;

    try {
      const stored = Number(window.localStorage.getItem(readingProgressKey));
      if (Number.isInteger(stored) && stored >= 1 && stored <= loadedPages) {
        initialPage = stored;
      }
    } catch {
      // segue com a pagina 1
    }

    setPageNumber(initialPage);
    setPageInput(String(initialPage));
    setStatusHint("Documento carregado.");
    revealChromeTemporarily("Documento carregado.");
  }

  function handleDocumentLoadError() {
    setErrorMessage("Nao foi possivel carregar este PDF.");
    setIsDocumentLoading(false);
    setStatusHint("Falha ao carregar o documento.");
    setIsChromeVisible(true);
    clearHideChromeTimer();
  }

  function handlePageLoadSuccess(page: {
    originalWidth: number;
    originalHeight: number;
  }) {
    setPageOriginalWidth(page.originalWidth);
    setPageOriginalHeight(page.originalHeight);
  }

  function handlePageInputSubmit() {
    const parsed = Number(pageInput);

    if (!Number.isInteger(parsed)) {
      setPageInput(String(pageNumber));
      return;
    }

    goToPage(parsed);
  }

  function handleShellKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase();
    const isEditableTarget =
      Boolean(target?.isContentEditable) ||
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select";

    if (isEditableTarget) {
      return;
    }

    if (event.key === "ArrowLeft" && !isZoomed) {
      event.preventDefault();
      goToPreviousPage();
      return;
    }

    if (event.key === "ArrowRight" && !isZoomed) {
      event.preventDefault();
      goToNextPage();
      return;
    }

    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void toggleFullscreen();
      return;
    }

    if (event.key.toLowerCase() === "w") {
      event.preventDefault();
      setFitMode("width");
      resetZoom();
      return;
    }

    if (event.key.toLowerCase() === "p") {
      event.preventDefault();
      setFitMode("page");
      resetZoom();
      return;
    }

    if (event.key.toLowerCase() === "h") {
      event.preventDefault();
      setIsChromeVisible((current) => {
        const nextValue = !current;

        if (nextValue) {
          revealChromeTemporarily("Controles visiveis.");
        } else {
          clearHideChromeTimer();
          setStatusHint("Controles ocultos.");
        }

        return nextValue;
      });
      return;
    }

    if (
      (event.key === "+" || event.key === "=") &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      zoomIn();
      return;
    }

    if (event.key === "-" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      zoomOut();
      return;
    }

    if (event.key === "Escape" && isFullscreen) {
      event.preventDefault();
      void toggleFullscreen();
    }
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (isChromeVisible) {
      revealChromeTemporarily();
    }

    if (event.touches.length === 1) {
      const now = Date.now();

      if (
        isMobile &&
        isZoomed &&
        now - lastTapRef.current > 0 &&
        now - lastTapRef.current < DOUBLE_TAP_DELAY
      ) {
        lastTapRef.current = 0;
        resetZoom();
        return;
      }

      lastTapRef.current = now;
    }

    if (event.touches.length === 2) {
      if (event.cancelable) {
        event.preventDefault();
      }

      const touchA = event.touches[0];
      const touchB = event.touches[1];
      const scrollArea = scrollAreaRef.current;

      if (!touchA || !touchB || !scrollArea) {
        return;
      }

      const distance = getDistance(touchA, touchB);
      const midpoint = getMidpoint(touchA, touchB);
      const rect = scrollArea.getBoundingClientRect();

      pinchStartDistanceRef.current = distance;
      pinchStartZoomRef.current = zoomLevel;
      pinchStartScrollLeftRef.current = scrollArea.scrollLeft;
      pinchStartScrollTopRef.current = scrollArea.scrollTop;
      pinchCenterXRef.current = midpoint.x - rect.left;
      pinchCenterYRef.current = midpoint.y - rect.top;
      pinchActiveRef.current = true;

      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    if (event.touches.length === 1) {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
    }
  }

  function handleTouchMove(event: ReactTouchEvent<HTMLDivElement>) {
    if (
      event.touches.length === 2 &&
      pinchStartDistanceRef.current &&
      pinchStartZoomRef.current
    ) {
      if (event.cancelable) {
        event.preventDefault();
      }

      const touchA = event.touches[0];
      const touchB = event.touches[1];

      if (!touchA || !touchB) {
        return;
      }

      const currentDistance = getDistance(touchA, touchB);
      const scaleFactor = currentDistance / pinchStartDistanceRef.current;
      const nextZoom = clamp(
        Number((pinchStartZoomRef.current * scaleFactor).toFixed(2)),
        MIN_ZOOM,
        MAX_ZOOM
      );

      pendingMobilePinchAdjustmentRef.current = {
        startZoom: pinchStartZoomRef.current,
        nextZoom,
        centerX: pinchCenterXRef.current,
        centerY: pinchCenterYRef.current,
        startScrollLeft: pinchStartScrollLeftRef.current,
        startScrollTop: pinchStartScrollTopRef.current,
      };

      setZoomLevel(nextZoom);
      setStatusHint(`Zoom em ${Math.round(nextZoom * 100)}%.`);
    }
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
    if (pinchActiveRef.current) {
      if (event.touches.length < 2) {
        pinchStartDistanceRef.current = null;
        pinchStartZoomRef.current = null;
        pinchActiveRef.current = false;

        if (isChromeVisible) {
          revealChromeTemporarily();
        }
      }
      return;
    }

    const touch = event.changedTouches[0];

    if (!touch) {
      return;
    }

    const startX = touchStartXRef.current;
    const startY = touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    if (startX === null || startY === null) {
      return;
    }

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    if (isZoomed) {
      return;
    }

    if (Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT) {
      return;
    }

    if (deltaX <= -SWIPE_THRESHOLD) {
      goToNextPage(false);
      return;
    }

    if (deltaX >= SWIPE_THRESHOLD) {
      goToPreviousPage(false);
    }
  }

  function handleZoneClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  useEffect(() => {
    const updateResponsiveState = () => {
      const nextDeviceKind = resolveDeviceKind(window.innerWidth);
      setDeviceKind(nextDeviceKind);

      if (
        nextDeviceKind === "mobile-small" ||
        nextDeviceKind === "mobile-standard"
      ) {
        setFitMode("width");
      }
    };

    updateResponsiveState();
    window.addEventListener("resize", updateResponsiveState);

    return () => {
      window.removeEventListener("resize", updateResponsiveState);
    };
  }, []);

  useEffect(() => {
    const readingArea = readingAreaRef.current;

    if (!readingArea) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setContainerWidth(readingArea.clientWidth);
      setContainerHeight(readingArea.clientHeight);
    });

    observer.observe(readingArea);
    setContainerWidth(readingArea.clientWidth);
    setContainerHeight(readingArea.clientHeight);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nextFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(nextFullscreen);
      setIsChromeVisible(true);
      focusShell();

      if (nextFullscreen) {
        scheduleChromeAutoHide();
      } else {
        clearHideChromeTimer();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [clearHideChromeTimer, scheduleChromeAutoHide]);

  useEffect(() => {
    focusShell();
    revealChromeTemporarily();

    return () => {
      clearHideChromeTimer();
      clearPageFlipTimer();
    };
  }, [clearHideChromeTimer, clearPageFlipTimer, revealChromeTemporarily]);

  useEffect(() => {
    if (numPages > 0 && pageNumber > numPages) {
      setPageNumber(numPages);
      setPageInput(String(numPages));
    }
  }, [numPages, pageNumber]);

  useEffect(() => {
    if (!numPages) {
      return;
    }

    saveProgress(pageNumber);
  }, [pageNumber, numPages, saveProgress]);

  useEffect(() => {
    if (isChromeVisible) {
      return;
    }

    closeStudyPanels();
    setIsThumbnailsOpen(false);
    setIsStudyToolsOpen(false);
  }, [isChromeVisible]);

  useEffect(() => {
    if (isAuxiliaryPanelOpen) {
      clearHideChromeTimer();
      setIsChromeVisible(true);
      return;
    }

    if (isChromeVisible) {
      scheduleChromeAutoHide();
    }
  }, [
    clearHideChromeTimer,
    isAuxiliaryPanelOpen,
    isChromeVisible,
    scheduleChromeAutoHide,
  ]);

  useEffect(() => {
    if (isDictionaryOpen || isNotesOpen) {
      setIsVolumesOpen(false);
      setIsStudyToolsOpen(true);
    }
  }, [isDictionaryOpen, isNotesOpen]);

  const availableWidth = useMemo(() => {
    if (!containerWidth) {
      return 0;
    }

    if (isMobile) {
      return Math.max(containerWidth - 2, 220);
    }

    if (isTablet) {
      return Math.max(containerWidth - 28, 320);
    }

    return Math.max(containerWidth - 40, 320);
  }, [containerWidth, isMobile, isTablet]);

  const availableHeight = useMemo(() => {
    if (!containerHeight) {
      return 0;
    }

    if (isMobile) {
      return Math.max(containerHeight - 4, 220);
    }

    if (isTablet) {
      return Math.max(containerHeight - 16, 280);
    }

    return Math.max(containerHeight - 20, 280);
  }, [containerHeight, isMobile, isTablet]);

  const desktopRenderedPageWidth = useMemo(() => {
    if (isMobile) {
      return undefined;
    }

    if (!availableWidth) {
      return undefined;
    }

    if (!pageOriginalWidth || !pageOriginalHeight || !availableHeight) {
      return Math.floor(availableWidth);
    }

    const pageRatio = pageOriginalWidth / pageOriginalHeight;
    const fitWidthWidth = availableWidth;
    const fitPageWidth = Math.min(availableWidth, availableHeight * pageRatio);
    const baseWidth = fitMode === "width" ? fitWidthWidth : fitPageWidth;

    return Math.floor(baseWidth * zoomLevel);
  }, [
    isMobile,
    availableWidth,
    availableHeight,
    pageOriginalWidth,
    pageOriginalHeight,
    fitMode,
    zoomLevel,
  ]);

  const mobileBasePageWidth = useMemo(() => {
    if (!isMobile) {
      return undefined;
    }

    if (!availableWidth) {
      return undefined;
    }

    return Math.floor(availableWidth);
  }, [isMobile, availableWidth]);

  const mobileBasePageHeight = useMemo(() => {
    if (
      !isMobile ||
      !mobileBasePageWidth ||
      !pageOriginalWidth ||
      !pageOriginalHeight
    ) {
      return undefined;
    }

    return Math.floor(
      mobileBasePageWidth * (pageOriginalHeight / pageOriginalWidth)
    );
  }, [isMobile, mobileBasePageWidth, pageOriginalWidth, pageOriginalHeight]);

  const mobileScaledWidth = useMemo(() => {
    if (!mobileBasePageWidth) {
      return undefined;
    }

    return Math.floor(mobileBasePageWidth * zoomLevel);
  }, [mobileBasePageWidth, zoomLevel]);

  const mobileScaledHeight = useMemo(() => {
    if (!mobileBasePageHeight) {
      return undefined;
    }

    return Math.floor(mobileBasePageHeight * zoomLevel);
  }, [mobileBasePageHeight, zoomLevel]);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    if (isMobile) {
      const pendingPinch = pendingMobilePinchAdjustmentRef.current;

      if (pendingPinch) {
        requestAnimationFrame(() => {
          const scale = pendingPinch.nextZoom / pendingPinch.startZoom;
          const nextLeft =
            (pendingPinch.startScrollLeft + pendingPinch.centerX) * scale -
            pendingPinch.centerX;
          const nextTop =
            (pendingPinch.startScrollTop + pendingPinch.centerY) * scale -
            pendingPinch.centerY;

          scrollArea.scrollTo({
            left: Math.max(nextLeft, 0),
            top: Math.max(nextTop, 0),
            behavior: "auto",
          });

          pendingMobilePinchAdjustmentRef.current = null;
        });

        return;
      }

      if (zoomLevel <= 1.01) {
        requestAnimationFrame(() => {
          scrollArea.scrollTo({
            left: 0,
            top: 0,
            behavior: "auto",
          });
        });
      }

      return;
    }

    const previousZoom = previousDesktopZoomRef.current;
    const nextZoom = zoomLevel;

    if (Math.abs(previousZoom - nextZoom) < 0.001) {
      return;
    }

    const viewportWidth = scrollArea.clientWidth;
    const viewportHeight = scrollArea.clientHeight;
    const maxLeftBefore = Math.max(scrollArea.scrollWidth - viewportWidth, 0);
    const maxTopBefore = Math.max(scrollArea.scrollHeight - viewportHeight, 0);

    const ratioX =
      maxLeftBefore > 0 ? scrollArea.scrollLeft / maxLeftBefore : 0.5;
    const ratioY =
      maxTopBefore > 0 ? scrollArea.scrollTop / maxTopBefore : 0.5;

    requestAnimationFrame(() => {
      const maxLeftAfter = Math.max(scrollArea.scrollWidth - viewportWidth, 0);
      const maxTopAfter = Math.max(scrollArea.scrollHeight - viewportHeight, 0);

      if (nextZoom <= 1.01) {
        scrollArea.scrollTo({
          left: maxLeftAfter / 2,
          top: 0,
          behavior: "auto",
        });
      } else {
        scrollArea.scrollTo({
          left: maxLeftAfter * ratioX,
          top: maxTopAfter * ratioY,
          behavior: "auto",
        });
      }

      previousDesktopZoomRef.current = nextZoom;
    });
  }, [
    isMobile,
    zoomLevel,
    desktopRenderedPageWidth,
    mobileScaledWidth,
    mobileScaledHeight,
    pageNumber,
  ]);

  const progressText =
    numPages > 0 ? `Pagina ${pageNumber} de ${numPages}` : "Preparando leitura";
  const zoomText = `${Math.round(zoomLevel * 100)}%`;
  const pageFlipPaperClass = isPageFlipActive
    ? pageFlipDirection === "next"
      ? "reader-page-flip-paper reader-page-flip-next"
      : "reader-page-flip-paper reader-page-flip-previous"
    : "";
  const chromeVisibilityClass = isChromeVisible
    ? "translate-y-0 opacity-100"
    : "pointer-events-none opacity-0";
  const topRevealAreaClass = isMobileLandscape
    ? "h-14"
    : isTabletLandscape
    ? "h-16"
    : isSmallMobile
    ? "h-24"
    : isMobile
    ? "h-20"
    : isTablet
    ? "h-[4.5rem]"
    : "h-14";
  const topBarClass = isMobileLandscape
    ? "gap-1.5 rounded-[22px] px-2.5 py-1.5"
    : isTabletLandscape
    ? "gap-2 rounded-[26px] px-3 py-2"
    : isSmallMobile
    ? "gap-2 rounded-[24px] px-2.5 py-2"
    : isMobile
    ? "gap-2 rounded-[26px] px-3 py-2.5"
    : isTablet
    ? "gap-3 rounded-[28px] px-3.5 py-2.5"
    : "gap-3 rounded-[30px] px-4 py-3";
  const titleClass = isMobileLandscape
    ? "mt-0 truncate font-serif text-sm text-white"
    : isSmallMobile
    ? "mt-0.5 truncate font-serif text-sm text-white"
    : "mt-1 truncate font-serif text-base text-white md:text-lg";
  const readingAreaTopClass = isMobileLandscape
    ? "pt-10"
    : isTabletLandscape
    ? "pt-14"
    : isSmallMobile
    ? "pt-12"
    : isMobile
    ? "pt-14"
    : isTablet
    ? "pt-16"
    : "pt-20";
  const stagePaddingClass = isMobileLandscape
    ? "px-0 py-[max(0.05rem,env(safe-area-inset-top))]"
    : isTabletLandscape
    ? "px-2 py-2"
    : isSmallMobile
    ? "px-0 py-[max(0.1rem,env(safe-area-inset-top))]"
    : isMobile
    ? "px-0 py-[max(0.15rem,env(safe-area-inset-top))]"
    : isTablet
    ? "px-2 py-3"
    : "px-4 py-5";
  const mobileReadingWrapClass = isMobileZoomed
    ? "flex items-start justify-start p-0"
    : isMobileLandscape
    ? "flex items-center justify-center px-2 py-1.5"
    : isSmallMobile
    ? "flex items-center justify-center px-2 py-3"
    : "flex items-center justify-center px-3 py-5";
  const desktopReadingWrapClass = isTabletLandscape
    ? "flex min-h-full min-w-full items-start justify-center px-6 py-4"
    : isTablet
    ? "flex min-h-full min-w-full items-start justify-center px-4 py-6"
    : "flex min-h-full min-w-full items-start justify-center px-8 py-10";
  const chromePaddingClass = isSmallMobile ? "md:px-3" : "md:px-4";
  const fullscreenLabel = isMobile
    ? isFullscreen
      ? "Sair"
      : "Tela"
    : isFullscreen
    ? "Sair"
    : "Tela cheia";
  const bottomBarClass = isMobileLandscape
    ? "gap-1 rounded-[22px] px-2.5 py-1.5"
    : isTabletLandscape
    ? "gap-1.5 rounded-[24px] px-3 py-2"
    : isSmallMobile
    ? "gap-1.5 rounded-[24px] px-2.5 py-2"
    : isMobile
    ? "gap-2 rounded-[26px] px-3 py-2.5"
    : "gap-2 rounded-[28px] px-3 py-2.5";
  const bottomPrimaryGroupClass = isMobileLandscape
    ? "flex items-center gap-1"
    : isSmallMobile
    ? "flex items-center gap-1"
    : "flex items-center gap-1.5";
  const navButtonClass = isMobileLandscape
    ? "inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    : isSmallMobile
    ? "inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";
  const nextButtonClass = isMobileLandscape
    ? "inline-flex rounded-full bg-amber-300 px-2 py-1.5 text-[10px] font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
    : isSmallMobile
    ? "inline-flex rounded-full bg-amber-300 px-2.5 py-2 text-[11px] font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
    : "inline-flex rounded-full bg-amber-300 px-3 py-2 text-xs font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40";
  const pageInputWrapClass = isMobileLandscape
    ? "flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1.5"
    : isSmallMobile
    ? "flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-2"
    : "flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2";
  const pageInputClass = isMobileLandscape
    ? "w-7 bg-transparent text-center text-[10px] text-white outline-none"
    : isSmallMobile
    ? "w-8 bg-transparent text-center text-xs text-white outline-none"
    : "w-10 bg-transparent text-center text-sm text-white outline-none";
  const thumbnailWidth = isSmallMobile ? 86 : isMobile ? 100 : 120;
  const mobileThumbnailSidebarClass = isMobileLandscape
    ? "inset-y-2 left-2 w-[8.25rem] rounded-[22px]"
    : isSmallMobile
    ? "inset-y-2 left-2 w-[8.75rem] rounded-[22px]"
    : "inset-y-3 left-3 w-[9.5rem] rounded-[24px]";
  const thumbnailSidebarClass = isMobile
    ? mobileThumbnailSidebarClass
    : "inset-y-3 left-3 w-[11rem] rounded-[26px]";
  const thumbnailHeaderClass = isMobile ? "px-2.5 py-2.5" : "px-3 py-3";
  const thumbnailListClass = isMobile
    ? "h-[calc(100%-3.75rem)] overflow-y-auto px-2.5 py-2.5"
    : "h-[calc(100%-4.25rem)] overflow-y-auto px-3 py-3";
  const thumbnailCardClass = isMobile
    ? "block w-full rounded-[16px] border p-1.5 text-center transition"
    : "block w-full rounded-[18px] border p-2 text-center transition";
  const allowsBaseVerticalScroll =
    isMobile &&
    !isZoomed &&
    typeof mobileScaledHeight === "number" &&
    mobileScaledHeight > availableHeight + 12;
  const shouldShowTapZones = isMobile ? !allowsBaseVerticalScroll : false;

  return (
    <div
      ref={shellRef}
      className="fixed inset-0 z-[999] overflow-hidden bg-[#0b0c10] text-white outline-none"
      tabIndex={0}
      onKeyDown={handleShellKeyDown}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.06),_transparent_28%),radial-gradient(circle_at_center,_rgba(255,255,255,0.03),_transparent_42%),linear-gradient(180deg,#16181d_0%,#0b0c10_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-4 pt-4">
        <div className="rounded-full border border-white/10 bg-black/35 px-4 py-1.5 text-[11px] tracking-[0.08em] text-zinc-200 backdrop-blur-xl">
          {statusHint}
        </div>
      </div>

      <div
        className={`absolute inset-x-0 top-0 z-30 transition-all duration-300 ${chromeVisibilityClass}`}
      >
        <div className="px-[max(0.5rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))]">
          <div
            className={`flex items-center justify-between border border-white/10 bg-black/22 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl ${topBarClass} ${chromePaddingClass}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsThumbnailsOpen((current) => !current)}
                className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-100 transition hover:bg-white/10 ${
                  isSmallMobile ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"
                }`}
                aria-label="Alternar miniaturas"
                title="Alternar miniaturas"
              >
                ≡
              </button>

              {backHref ? (
                <Link
                  href={backHref}
                  className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-zinc-100 transition hover:bg-white/10 ${
                    isSmallMobile ? "h-8 text-[11px]" : "h-9 text-xs"
                  }`}
                  aria-label={backLabel}
                  title={backLabel}
                >
                  {isMobile ? "←" : `← ${backLabel}`}
                </Link>
              ) : null}

              <div className="min-w-0">
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.3em] text-amber-200/80">
                {environmentLabel}
              </p>
              <p className={titleClass}>
                {title}
              </p>
              <p className="mt-1 hidden text-[10px] uppercase tracking-[0.18em] text-zinc-500 md:block">
                {deviceKind === "mobile-small"
                  ? "Mobile pequeno"
                  : deviceKind === "mobile-standard"
                  ? "Mobile padrao"
                  : deviceKind === "tablet"
                  ? "Tablet"
                  : "Desktop"}{" "}
                • leitura imersiva
              </p>
            </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!isMobile ? (
                <button
                  type="button"
                  onClick={resetZoom}
                  className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/10 md:inline-flex"
                >
                  Voltar para 100%
                </button>
              ) : null}

              <button
                type="button"
                onClick={zoomOut}
                className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-100 transition hover:bg-white/10 ${
                  isSmallMobile ? "h-8 min-w-8 text-xs" : "h-9 min-w-9 text-sm"
                }`}
                aria-label="Diminuir zoom"
              >
                -
              </button>

              <button
                type="button"
                onClick={resetZoom}
                className={`inline-flex rounded-full border border-white/10 bg-white/5 font-medium text-zinc-100 transition hover:bg-white/10 ${
                  isSmallMobile ? "px-2.5 py-2 text-[11px]" : "px-3 py-2 text-xs"
                }`}
              >
                {zoomText}
              </button>

              <button
                type="button"
                onClick={zoomIn}
                className={`inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-100 transition hover:bg-white/10 ${
                  isSmallMobile ? "h-8 min-w-8 text-xs" : "h-9 min-w-9 text-sm"
                }`}
                aria-label="Aumentar zoom"
              >
                +
              </button>

              <button
                type="button"
                onClick={() => void toggleFullscreen()}
                className={`inline-flex rounded-full border border-white/10 bg-white/5 font-medium text-zinc-100 transition hover:bg-white/10 ${
                  isSmallMobile ? "px-2.5 py-2 text-[11px]" : "px-3 py-2 text-xs"
                }`}
              >
                {fullscreenLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        ref={readingAreaRef}
        className={`relative z-10 h-full w-full overflow-hidden ${readingAreaTopClass}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          touchAction: isMobile
            ? isZoomed
              ? "pan-x pan-y"
              : allowsBaseVerticalScroll
              ? "pan-y"
              : "none"
            : "auto",
        }}
      >
        {!isChromeVisible ? (
          <button
            type="button"
            onClick={() => {
              revealChromeTemporarily("Controles visiveis.");
              focusShell();
            }}
            className={`absolute inset-x-0 top-0 z-30 bg-transparent ${topRevealAreaClass}`}
            aria-label="Mostrar controles"
          />
        ) : null}

        {isThumbnailsOpen ? (
          <>
            {isMobile ? (
              <button
                type="button"
                onClick={() => setIsThumbnailsOpen(false)}
                className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px]"
                aria-label="Fechar painel de miniaturas"
              />
            ) : null}

            <aside
              className={`absolute z-30 overflow-hidden border border-white/10 bg-[#11141b]/95 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl ${thumbnailSidebarClass}`}
            >
            <div className={`flex items-center justify-between border-b border-white/10 ${thumbnailHeaderClass}`}>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-amber-300/80">
                  Paginas
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {numPages || "-"} miniaturas
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsThumbnailsOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div className={thumbnailListClass}>
              <Document
                file={fileUrl}
                loading=""
                onLoadError={handleDocumentLoadError}
                className="space-y-3"
              >
                {Array.from({ length: numPages }, (_, index) => {
                  const thumbnailPageNumber = index + 1;
                  const isActive = thumbnailPageNumber === pageNumber;

                  return (
                    <button
                      key={`sidebar-thumbnail-${thumbnailPageNumber}`}
                      type="button"
                      onClick={() => {
                        goToPage(thumbnailPageNumber);
                        if (isMobile) {
                          setIsThumbnailsOpen(false);
                        }
                      }}
                      className={`${thumbnailCardClass} ${
                        isActive
                          ? "border-amber-300/40 bg-amber-300/10"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="mx-auto overflow-hidden rounded-[12px] bg-white shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
                        <Page
                          pageNumber={thumbnailPageNumber}
                          width={thumbnailWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          loading=""
                        />
                      </div>

                      <div className="mt-2 text-[11px] font-medium text-white">
                        {thumbnailPageNumber}
                      </div>
                    </button>
                  );
                })}
              </Document>
            </div>
            </aside>
          </>
        ) : null}

        {!isZoomed && shouldShowTapZones ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                handleZoneClick(event);
                goToPreviousPage();
              }}
              className="absolute inset-y-0 left-0 z-20 w-[20%] md:w-[16%]"
              aria-label="Pagina anterior"
            />

            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();

                setIsChromeVisible((current) => {
                  const nextValue = !current;

                  if (nextValue) {
                    revealChromeTemporarily("Controles visiveis.");
                  } else {
                    clearHideChromeTimer();
                    setStatusHint("Controles ocultos.");
                  }

                  return nextValue;
                });

                focusShell();
              }}
              className="absolute inset-y-0 left-[20%] z-20 w-[60%] md:left-[16%] md:w-[68%]"
              aria-label="Area central"
            />

            <button
              type="button"
              onClick={(event) => {
                handleZoneClick(event);
                goToNextPage();
              }}
              className="absolute inset-y-0 right-0 z-20 w-[20%] md:w-[16%]"
              aria-label="Proxima pagina"
            />
          </>
        ) : null}

        <div className={`flex h-full w-full items-center justify-center ${stagePaddingClass}`}>
          <div
            ref={scrollAreaRef}
            className={`relative h-full w-full overflow-auto ${
              isZoomed ? "cursor-grab" : ""
            }`}
            style={{
              touchAction: isMobile
                ? isZoomed
                  ? "pan-x pan-y"
                  : allowsBaseVerticalScroll
                  ? "pan-y"
                  : "none"
                : isZoomed
                ? "pan-x pan-y"
                : "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {errorMessage ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-center text-sm text-red-100">
                  {errorMessage}
                </div>
              </div>
            ) : isMobile ? (
              <div
                className={`min-h-full min-w-full ${mobileReadingWrapClass}`}
              >
                <div
                  style={{
                    width: mobileScaledWidth ? `${mobileScaledWidth}px` : "auto",
                    height: mobileScaledHeight
                      ? `${mobileScaledHeight}px`
                      : "auto",
                  }}
                >
                  <div
                    style={{
                      width: mobileBasePageWidth
                        ? `${mobileBasePageWidth}px`
                        : "auto",
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: "top left",
                    }}
                  >
                    {isPageFlipActive &&
                    pageFlipSourcePage &&
                    pageFlipTargetPage ? (
                      <Document
                        file={fileUrl}
                        loading=""
                        onLoadSuccess={handleDocumentLoadSuccess}
                        onLoadError={handleDocumentLoadError}
                        className="reader-page-flip-stage block"
                      >
                        <div className="reader-page-flip-stack">
                          <div className="reader-page-flip-underlay">
                            <Page
                              key={`mobile-flip-underlay-${pageFlipTargetPage}-${mobileBasePageWidth}-${zoomLevel}`}
                              pageNumber={pageFlipTargetPage}
                              width={mobileBasePageWidth}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              onLoadSuccess={handlePageLoadSuccess}
                              className="shadow-[0_32px_90px_rgba(0,0,0,0.34)]"
                            />
                          </div>

                          <div className={pageFlipPaperClass}>
                            <Page
                              key={`mobile-flip-paper-${pageFlipSourcePage}-${mobileBasePageWidth}-${zoomLevel}`}
                              pageNumber={pageFlipSourcePage}
                              width={mobileBasePageWidth}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              onLoadSuccess={handlePageLoadSuccess}
                              className="shadow-[0_32px_90px_rgba(0,0,0,0.42)]"
                            />
                          </div>
                        </div>
                      </Document>
                    ) : (
                      <Document
                        file={fileUrl}
                        loading=""
                        onLoadSuccess={handleDocumentLoadSuccess}
                        onLoadError={handleDocumentLoadError}
                        className="block"
                      >
                        <Page
                          key={`${pageNumber}-${mobileBasePageWidth}`}
                          pageNumber={pageNumber}
                          width={mobileBasePageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={handlePageLoadSuccess}
                          className="shadow-[0_32px_90px_rgba(0,0,0,0.42)]"
                        />
                      </Document>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={desktopReadingWrapClass}>
                {isPageFlipActive &&
                pageFlipSourcePage &&
                pageFlipTargetPage ? (
                  <Document
                    file={fileUrl}
                    loading=""
                    onLoadSuccess={handleDocumentLoadSuccess}
                    onLoadError={handleDocumentLoadError}
                    className="reader-page-flip-stage flex items-center justify-center"
                  >
                    <div className="reader-page-flip-stack">
                      <div className="reader-page-flip-underlay">
                        <Page
                          key={`flip-underlay-${pageFlipTargetPage}-${desktopRenderedPageWidth}-${zoomLevel}-${fitMode}`}
                          pageNumber={pageFlipTargetPage}
                          width={desktopRenderedPageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={handlePageLoadSuccess}
                          className="shadow-[0_36px_110px_rgba(0,0,0,0.34)]"
                        />
                      </div>

                      <div className={pageFlipPaperClass}>
                        <Page
                          key={`flip-paper-${pageFlipSourcePage}-${desktopRenderedPageWidth}-${zoomLevel}-${fitMode}`}
                          pageNumber={pageFlipSourcePage}
                          width={desktopRenderedPageWidth}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={handlePageLoadSuccess}
                          className="shadow-[0_36px_110px_rgba(0,0,0,0.42)]"
                        />
                      </div>
                    </div>
                  </Document>
                ) : (
                  <Document
                    file={fileUrl}
                    loading=""
                    onLoadSuccess={handleDocumentLoadSuccess}
                    onLoadError={handleDocumentLoadError}
                    className="flex items-center justify-center"
                  >
                    <Page
                      key={`${pageNumber}-${desktopRenderedPageWidth}-${zoomLevel}-${fitMode}`}
                      pageNumber={pageNumber}
                      width={desktopRenderedPageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadSuccess={handlePageLoadSuccess}
                      className="shadow-[0_36px_110px_rgba(0,0,0,0.42)]"
                    />
                  </Document>
                )}
              </div>
            )}

            {isDocumentLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-zinc-200 backdrop-blur-xl">
                  Preparando leitura...
                </div>
              </div>
            ) : null}

          </div>
        </div>
      </div>

      {isZoomed ? (
        <button
          type="button"
          onClick={resetZoom}
          className="fixed bottom-20 right-4 z-40 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 md:bottom-24 md:right-6"
          aria-label="Voltar para zoom 100 por cento"
        >
          100%
        </button>
      ) : null}

      {isChromeVisible ? (
      <div
        className={`absolute z-40 transition-all duration-300 ${
          isMobile
            ? "inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))]"
            : "right-4 bottom-20 md:right-6 md:bottom-24"
        }`}
      >
        {hasMultipleVolumes && isVolumesOpen ? (
          <div
            className={`mb-3 border border-white/10 bg-[#0f1117]/96 p-3 backdrop-blur-xl ${
              isMobile
                ? "w-full rounded-[24px] shadow-[0_18px_40px_rgba(0,0,0,0.32)]"
                : "w-[min(92vw,24rem)] rounded-[28px] shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300/80">
                  Estrutura da obra
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  Escolha um volume
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsVolumesOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <ReaderVolumeSwitcher
              materialTitle={resolvedMaterialTitle}
              currentReaderHref={resolvedCurrentReaderHref}
              items={volumeItems}
            />
          </div>
        ) : null}

        <div
          className={`${
            isMobile && !isStudyToolsOpen ? "hidden" : "flex"
          } border border-white/10 backdrop-blur-xl ${
            isMobile
              ? "flex-wrap items-center gap-2 rounded-[24px] bg-[#0f1117]/94 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.3)]"
              : "flex-col items-end gap-2 rounded-[24px] bg-[#0f1117]/72 p-2 shadow-[0_16px_38px_rgba(0,0,0,0.26)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
          }`}
        >
          {hasMultipleVolumes ? (
            <button
              type="button"
              onClick={toggleVolumesPanel}
              className={`inline-flex items-center justify-center gap-2 font-medium transition ${
                isMobile
                  ? isVolumesOpen
                    ? "rounded-xl border border-amber-300/40 bg-amber-300 px-3 py-2 text-xs text-black hover:bg-amber-200"
                    : "rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white hover:bg-white/5"
                  : isVolumesOpen
                  ? "rounded-full border border-amber-300/40 bg-amber-300 px-3.5 py-2.5 text-[12px] text-black shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm hover:bg-amber-200"
                  : "rounded-full border border-white/12 bg-[#10131a]/92 px-3.5 py-2.5 text-[12px] text-zinc-100 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm hover:border-white/20 hover:bg-[#151922]"
              }`}
              title="Abrir volumes"
            >
              <span>Volumes</span>
            </button>
          ) : null}

          <ReaderDictionaryPanel
            variant="embedded"
            embeddedLabel="Dicionário"
            onOpenChange={setIsDictionaryOpen}
          />

          <StudyNotesPanel
            currentDocumentTitle={title}
            variant="embedded"
            embeddedLabel="Notas"
            onOpenChange={setIsNotesOpen}
          />

          <ReaderQuickSwitcher
            currentDocumentTitle={title}
            variant="embedded"
            floatingLabel={quickSwitcherLabel}
            readerBasePath={readerBasePath}
            readerQueryValue={readerQueryValue}
          />
        </div>
      </div>
      ) : null}

      <div
        className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 ${chromeVisibilityClass}`}
      >
        <div className="px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pr-[max(0.5rem,env(safe-area-inset-right))]">
          <div
            className={`flex items-center justify-between border border-white/10 bg-black/22 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl ${bottomBarClass} ${chromePaddingClass}`}
          >
            <div className={bottomPrimaryGroupClass}>
              <button
                type="button"
                onClick={() => goToPreviousPage()}
                disabled={isZoomed}
                className={navButtonClass}
              >
                Anterior
              </button>

              <div className={pageInputWrapClass}>
                <input
                  value={pageInput}
                  onChange={(event) =>
                    setPageInput(event.target.value.replace(/[^\d]/g, ""))
                  }
                  onBlur={handlePageInputSubmit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handlePageInputSubmit();
                    }
                  }}
                  inputMode="numeric"
                  className={pageInputClass}
                  aria-label="Pagina atual"
                />
                <span className={`${isSmallMobile ? "text-[11px]" : "text-xs"} text-zinc-400`}>
                  / {numPages || "-"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => goToNextPage()}
                disabled={isZoomed}
                className={nextButtonClass}
              >
                Proxima
              </button>

              {isMobile ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsStudyToolsOpen((current) => {
                      const nextValue = !current;

                      if (!nextValue) {
                        closeStudyPanels();
                      }

                      return nextValue;
                    });
                  }}
                  className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold transition ${
                    isStudyToolsOpen
                      ? "border border-amber-300/40 bg-amber-300 text-black hover:bg-amber-200"
                      : "border border-amber-300/20 bg-amber-300/10 text-amber-100 hover:bg-amber-300/20"
                  }`}
                >
                  Estudo
                </button>
              ) : null}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs tracking-[0.08em] text-zinc-300">
                {progressText}
              </span>
              {isZoomed ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                  Zoom ativo: arraste para explorar
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                  Centro da tela recolhe os controles
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
