"use client";

import {
  KeyboardEvent,
  ReactNode,
  TouchEvent,
  WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfReaderProps = {
  fileUrl: string;
  readingProgressKey?: string;
  fullscreenTargetId?: string;
  fullscreenToolbarSlot?: ReactNode;
};

type PinchState = {
  startDistance: number;
  startZoom: number;
  startScrollLeft: number;
  startScrollTop: number;
  centerX: number;
  centerY: number;
};

type SwipeState = {
  startX: number;
  startY: number;
};

type TouchLike = {
  clientX: number;
  clientY: number;
};

type MobilePageLoadSuccess = {
  getViewport: (params: { scale: number }) => {
    width: number;
    height: number;
  };
};

const DEFAULT_ZOOM = 1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const WHEEL_ZOOM_STEP = 0.12;
const DESKTOP_BASE_SCALE = 1.2;
const MOBILE_BREAKPOINT = 768;
const SWIPE_THRESHOLD = 70;
const SWIPE_MAX_VERTICAL_DRIFT = 60;
const MOBILE_UI_AUTO_HIDE_DELAY = 1800;
const DESKTOP_UI_AUTO_HIDE_DELAY = 1400;
const MOBILE_PINCH_SENSITIVITY = 0.9;
const MOBILE_PINCH_DEADZONE = 0.02;
const MOBILE_ZOOM_SNAP_BACK_THRESHOLD = 1.06;
const MOBILE_ZOOM_GESTURE_THRESHOLD = 1.08;
const FALLBACK_PAGE_RATIO = 1.4142;

function clampZoom(value: number) {
  return Math.min(Math.max(Number(value.toFixed(2)), MIN_ZOOM), MAX_ZOOM);
}

function normalizeCommittedZoom(value: number) {
  const safeZoom = clampZoom(value);

  if (safeZoom < MOBILE_ZOOM_SNAP_BACK_THRESHOLD) {
    return DEFAULT_ZOOM;
  }

  return safeZoom;
}

function normalizeLiveMobileZoom(value: number, startZoom: number) {
  const safeZoom = clampZoom(value);

  if (
    startZoom === DEFAULT_ZOOM &&
    Math.abs(safeZoom - DEFAULT_ZOOM) <= MOBILE_PINCH_DEADZONE
  ) {
    return DEFAULT_ZOOM;
  }

  return safeZoom;
}

function isRealMobileZoom(value: number) {
  return value >= MOBILE_ZOOM_GESTURE_THRESHOLD;
}

function getDistanceBetweenTouches(touchA: TouchLike, touchB: TouchLike) {
  const deltaX = touchA.clientX - touchB.clientX;
  const deltaY = touchA.clientY - touchB.clientY;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function getTouchCenter(touchA: TouchLike, touchB: TouchLike) {
  return {
    x: (touchA.clientX + touchB.clientX) / 2,
    y: (touchA.clientY + touchB.clientY) / 2,
  };
}

export default function PdfReader({
  fileUrl,
  readingProgressKey,
  fullscreenTargetId,
  fullscreenToolbarSlot,
}: PdfReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const normalPageShellRef = useRef<HTMLDivElement | null>(null);
  const mobileFullscreenShellRef = useRef<HTMLDivElement | null>(null);
  const pinchStateRef = useRef<PinchState | null>(null);
  const swipeStateRef = useRef<SwipeState | null>(null);
  const gestureHandledRef = useRef(false);
  const gestureHintTimerRef = useRef<number | null>(null);
  const mobileUiHideTimerRef = useRef<number | null>(null);
  const desktopUiHideTimerRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);
  const mobileScrollRestoreRef = useRef(0);
  const mobileViewportRef = useRef<{ width: number; height: number } | null>(
    null
  );
  const committedZoomRef = useRef<number>(DEFAULT_ZOOM);
  const liveZoomRef = useRef<number>(DEFAULT_ZOOM);

  const [isMounted, setIsMounted] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_ZOOM);
  const [committedZoomLevel, setCommittedZoomLevel] =
    useState<number>(DEFAULT_ZOOM);
  const [pageError, setPageError] = useState<string>("");
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);
  const [isMobileReaderFullscreen, setIsMobileReaderFullscreen] =
    useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [gestureHint, setGestureHint] = useState<string>("");
  const [pageShellWidth, setPageShellWidth] = useState<number>(0);
  const [devicePixelRatio, setDevicePixelRatio] = useState<number>(1);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [isMobileUiVisible, setIsMobileUiVisible] = useState<boolean>(true);
  const [isDesktopUiVisible, setIsDesktopUiVisible] = useState<boolean>(true);
  const [mobileBaseWidth, setMobileBaseWidth] = useState<number>(0);
  const [mobileBaseHeight, setMobileBaseHeight] = useState<number>(0);

  const isImmersive = isMobile ? isMobileReaderFullscreen : isNativeFullscreen;
  const isDesktopFullscreen = !isMobile && isNativeFullscreen;
  const shouldShowDesktopOverlayUi = !isDesktopFullscreen || isDesktopUiVisible;
  const showMobileOverlayUi =
    !isMobile || !isMobileReaderFullscreen || isMobileUiVisible;
  const showTopToolbar = isMobile
    ? showMobileOverlayUi
    : shouldShowDesktopOverlayUi;
  const shouldShowImmersiveMessage = Boolean(pageError || gestureHint);

  function getActiveShell() {
    if (isMobile && isMobileReaderFullscreen) {
      return mobileFullscreenShellRef.current;
    }

    return normalPageShellRef.current;
  }

  function getSavedPage(): number | null {
    if (!readingProgressKey || typeof window === "undefined") {
      return null;
    }

    try {
      const rawValue = window.localStorage.getItem(readingProgressKey);

      if (!rawValue) {
        return null;
      }

      const parsedValue = Number(rawValue);

      if (!Number.isInteger(parsedValue) || parsedValue < 1) {
        return null;
      }

      return parsedValue;
    } catch {
      return null;
    }
  }

  function savePage(page: number) {
    if (!readingProgressKey || typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(readingProgressKey, String(page));
    } catch {
      // evita quebrar se o localStorage falhar
    }
  }

  function clearGestureHintWithDelay() {
    if (gestureHintTimerRef.current) {
      window.clearTimeout(gestureHintTimerRef.current);
    }

    gestureHintTimerRef.current = window.setTimeout(() => {
      setGestureHint("");
    }, 700);
  }

  function clearMobileUiHideTimer() {
    if (mobileUiHideTimerRef.current) {
      window.clearTimeout(mobileUiHideTimerRef.current);
      mobileUiHideTimerRef.current = null;
    }
  }

  function clearDesktopUiHideTimer() {
    if (desktopUiHideTimerRef.current) {
      window.clearTimeout(desktopUiHideTimerRef.current);
      desktopUiHideTimerRef.current = null;
    }
  }

  function showMobileUiTemporarily() {
    if (!isMobile || !isMobileReaderFullscreen) {
      return;
    }

    setIsMobileUiVisible(true);
    clearMobileUiHideTimer();

    mobileUiHideTimerRef.current = window.setTimeout(() => {
      setIsMobileUiVisible(false);
    }, MOBILE_UI_AUTO_HIDE_DELAY);
  }

  function showDesktopUiTemporarily() {
    if (!isDesktopFullscreen) {
      return;
    }

    setIsDesktopUiVisible(true);
    clearDesktopUiHideTimer();

    desktopUiHideTimerRef.current = window.setTimeout(() => {
      setIsDesktopUiVisible(false);
    }, DESKTOP_UI_AUTO_HIDE_DELAY);
  }

  function showReaderUiTemporarily() {
    showMobileUiTemporarily();
    showDesktopUiTemporarily();
  }

  function toggleMobileUiVisibility() {
    if (!isMobile || !isMobileReaderFullscreen) {
      return;
    }

    if (isMobileUiVisible) {
      clearMobileUiHideTimer();
      setIsMobileUiVisible(false);
      return;
    }

    showMobileUiTemporarily();
  }

  function recomputeMobileBaseSize() {
    if (!isMobile) {
      return;
    }

    const shell = getActiveShell();

    if (!shell) {
      return;
    }

    const viewport = mobileViewportRef.current;
    const shellWidth = shell.clientWidth;

    if (!shellWidth) {
      return;
    }

    const horizontalPadding = isMobileReaderFullscreen ? 0 : 16;
    const availableWidth = Math.max(240, shellWidth - horizontalPadding);

    if (!viewport) {
      setMobileBaseWidth(availableWidth);
      setMobileBaseHeight(Math.floor(availableWidth * FALLBACK_PAGE_RATIO));
      return;
    }

    const fitScale = availableWidth / viewport.width;

    setMobileBaseWidth(Math.floor(viewport.width * fitScale));
    setMobileBaseHeight(Math.floor(viewport.height * fitScale));
  }

  function resetActiveShellPosition() {
    const shell = getActiveShell();

    if (!shell) {
      return;
    }

    shell.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }

  function applyZoom(nextZoom: number, hint?: string) {
    const safeZoom = isMobile
      ? normalizeCommittedZoom(nextZoom)
      : clampZoom(nextZoom);
    const shell = getActiveShell();

    if (isMobile && shell && mobileBaseWidth > 0 && mobileBaseHeight > 0) {
      const oldZoom = committedZoomRef.current || DEFAULT_ZOOM;
      const ratio = safeZoom / Math.max(oldZoom, DEFAULT_ZOOM);
      const viewportCenterX = shell.scrollLeft + shell.clientWidth / 2;
      const viewportCenterY = shell.scrollTop + shell.clientHeight / 2;

      liveZoomRef.current = safeZoom;
      committedZoomRef.current = safeZoom;
      setZoomLevel(safeZoom);
      setCommittedZoomLevel(safeZoom);

      requestAnimationFrame(() => {
        if (safeZoom === DEFAULT_ZOOM) {
          shell.scrollLeft = 0;
          shell.scrollTop = 0;
          return;
        }

        shell.scrollLeft = Math.max(
          0,
          viewportCenterX * ratio - shell.clientWidth / 2
        );
        shell.scrollTop = Math.max(
          0,
          viewportCenterY * ratio - shell.clientHeight / 2
        );
      });
    } else {
      liveZoomRef.current = safeZoom;
      committedZoomRef.current = safeZoom;
      setZoomLevel(safeZoom);
      setCommittedZoomLevel(safeZoom);
    }

    setPageError("");
    setGestureHint(hint ?? `Zoom: ${Math.round(safeZoom * 100)}%`);
    clearGestureHintWithDelay();
    showReaderUiTemporarily();
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageError("");

    const savedPage = getSavedPage();
    const initialPage =
      savedPage && savedPage >= 1 && savedPage <= numPages ? savedPage : 1;

    setPageNumber(initialPage);
    setPageInput(String(initialPage));
  }

  function onPageLoadSuccess(page: MobilePageLoadSuccess) {
    if (!isMobile) {
      return;
    }

    const viewport = page.getViewport({ scale: 1 });

    mobileViewportRef.current = {
      width: viewport.width,
      height: viewport.height,
    };

    recomputeMobileBaseSize();
  }

  function goToPage(targetPage: number) {
    if (!numPages) return;

    if (Number.isNaN(targetPage) || targetPage < 1 || targetPage > numPages) {
      setPageError(`Digite uma página entre 1 e ${numPages}.`);
      return;
    }

    setPageNumber(targetPage);
    setPageInput(String(targetPage));
    setPageError("");

    if (isMobile) {
      requestAnimationFrame(() => {
        resetActiveShellPosition();
      });
    }

    showReaderUiTemporarily();
  }

  function handlePreviousPage() {
    if (pageNumber <= 1) return;

    const nextPage = pageNumber - 1;
    setPageNumber(nextPage);
    setPageInput(String(nextPage));
    setPageError("");

    if (isMobile) {
      requestAnimationFrame(() => {
        resetActiveShellPosition();
      });
    }

    showReaderUiTemporarily();
  }

  function handleNextPage() {
    if (pageNumber >= numPages) return;

    const nextPage = pageNumber + 1;
    setPageNumber(nextPage);
    setPageInput(String(nextPage));
    setPageError("");

    if (isMobile) {
      requestAnimationFrame(() => {
        resetActiveShellPosition();
      });
    }

    showReaderUiTemporarily();
  }

  function handleSubmitPage() {
    goToPage(Number(pageInput));
  }

  function handlePageInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSubmitPage();
    }
  }

  function handleZoomOut() {
    applyZoom(zoomLevel - ZOOM_STEP);
  }

  function handleZoomIn() {
    applyZoom(zoomLevel + ZOOM_STEP);
  }

  function handleResetZoom() {
    applyZoom(DEFAULT_ZOOM, "Zoom ajustado");
  }

  function handleWheelZoom(event: WheelEvent<HTMLDivElement>) {
    if (isMobile) {
      return;
    }

    if (event.deltaY === 0) {
      return;
    }

    event.preventDefault();

    if (wheelLockRef.current) {
      return;
    }

    wheelLockRef.current = true;

    window.requestAnimationFrame(() => {
      const direction = event.deltaY < 0 ? 1 : -1;
      const nextZoom = zoomLevel + direction * WHEEL_ZOOM_STEP;

      applyZoom(nextZoom);

      wheelLockRef.current = false;
    });
  }

  async function handleToggleFullscreen() {
    if (isMobile) {
      setIsMobileReaderFullscreen((prev) => !prev);
      return;
    }

    const fullscreenTarget =
      (fullscreenTargetId
        ? document.getElementById(fullscreenTargetId)
        : null) || containerRef.current;

    if (!fullscreenTarget) return;

    try {
      if (!document.fullscreenElement) {
        await fullscreenTarget.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // evita quebrar a interface se fullscreen falhar
    }
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (!isMobile) {
      return;
    }

    showReaderUiTemporarily();

    if (event.touches.length === 2) {
      const shell = getActiveShell();
      const distance = getDistanceBetweenTouches(
        event.touches[0],
        event.touches[1]
      );
      const center = getTouchCenter(event.touches[0], event.touches[1]);

      pinchStateRef.current = {
        startDistance: distance,
        startZoom: committedZoomRef.current,
        startScrollLeft: shell?.scrollLeft ?? 0,
        startScrollTop: shell?.scrollTop ?? 0,
        centerX: center.x,
        centerY: center.y,
      };

      swipeStateRef.current = null;
      gestureHandledRef.current = true;
      setIsPinching(true);
      setGestureHint("Zoom por gesto ativo");
      return;
    }

    if (event.touches.length === 1) {
      pinchStateRef.current = null;
      gestureHandledRef.current = false;
      swipeStateRef.current = {
        startX: event.touches[0].clientX,
        startY: event.touches[0].clientY,
      };
    }
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!isMobile) {
      return;
    }

    showReaderUiTemporarily();

    if (event.touches.length === 2 && pinchStateRef.current) {
      event.preventDefault();

      const shell = getActiveShell();
      const currentDistance = getDistanceBetweenTouches(
        event.touches[0],
        event.touches[1]
      );

      if (!pinchStateRef.current.startDistance || !shell) {
        return;
      }

      const distanceRatio = currentDistance / pinchStateRef.current.startDistance;
      const linearRatio =
        1 + (distanceRatio - 1) * (1 + MOBILE_PINCH_SENSITIVITY);
      const rawNextZoom = pinchStateRef.current.startZoom * linearRatio;
      const nextZoom = normalizeLiveMobileZoom(
        rawNextZoom,
        pinchStateRef.current.startZoom
      );

      liveZoomRef.current = nextZoom;
      setZoomLevel(nextZoom);
      setGestureHint(`Zoom: ${Math.round(nextZoom * 100)}%`);

      const currentCenter = getTouchCenter(event.touches[0], event.touches[1]);
      const relativeX =
        pinchStateRef.current.centerX / Math.max(shell.clientWidth, 1);
      const relativeY =
        pinchStateRef.current.centerY / Math.max(shell.clientHeight, 1);

      const baseZoom = Math.max(pinchStateRef.current.startZoom, DEFAULT_ZOOM);
      const zoomRatio = nextZoom / baseZoom;

      requestAnimationFrame(() => {
        if (nextZoom <= DEFAULT_ZOOM) {
          shell.scrollLeft = 0;
          shell.scrollTop = 0;
          return;
        }

        const baseCenterX =
          pinchStateRef.current!.startScrollLeft +
          shell.clientWidth * relativeX;
        const baseCenterY =
          pinchStateRef.current!.startScrollTop +
          shell.clientHeight * relativeY;

        const dragX = pinchStateRef.current!.centerX - currentCenter.x;
        const dragY = pinchStateRef.current!.centerY - currentCenter.y;

        shell.scrollLeft = Math.max(
          0,
          baseCenterX * zoomRatio - shell.clientWidth * relativeX + dragX
        );
        shell.scrollTop = Math.max(
          0,
          baseCenterY * zoomRatio - shell.clientHeight * relativeY + dragY
        );
      });

      gestureHandledRef.current = true;
      return;
    }

    if (
      event.touches.length === 1 &&
      swipeStateRef.current &&
      !isRealMobileZoom(committedZoomRef.current)
    ) {
      const currentTouch = event.touches[0];
      const deltaX = currentTouch.clientX - swipeStateRef.current.startX;
      const deltaY = currentTouch.clientY - swipeStateRef.current.startY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 12) {
        event.preventDefault();
      }
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!isMobile) {
      return;
    }

    if (pinchStateRef.current && event.touches.length < 2) {
      const finalizedZoom = normalizeCommittedZoom(liveZoomRef.current);
      const shell = getActiveShell();

      pinchStateRef.current = null;
      swipeStateRef.current = null;
      gestureHandledRef.current = false;
      setIsPinching(false);

      liveZoomRef.current = finalizedZoom;
      committedZoomRef.current = finalizedZoom;
      setZoomLevel(finalizedZoom);
      setCommittedZoomLevel(finalizedZoom);

      requestAnimationFrame(() => {
        if (!shell) {
          return;
        }

        if (finalizedZoom === DEFAULT_ZOOM) {
          shell.scrollLeft = 0;
          shell.scrollTop = 0;
          return;
        }

        const maxScrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth);
        const maxScrollTop = Math.max(0, shell.scrollHeight - shell.clientHeight);

        shell.scrollLeft = Math.min(Math.max(shell.scrollLeft, 0), maxScrollLeft);
        shell.scrollTop = Math.min(Math.max(shell.scrollTop, 0), maxScrollTop);
      });

      setGestureHint(`Zoom: ${Math.round(finalizedZoom * 100)}%`);
      clearGestureHintWithDelay();
      showReaderUiTemporarily();
      return;
    }

    if (event.touches.length > 0) {
      return;
    }

    if (isRealMobileZoom(committedZoomRef.current)) {
      swipeStateRef.current = null;
      gestureHandledRef.current = false;
      return;
    }

    if (!swipeStateRef.current || gestureHandledRef.current) {
      swipeStateRef.current = null;
      gestureHandledRef.current = false;
      return;
    }

    const changedTouch = event.changedTouches[0];

    if (!changedTouch) {
      swipeStateRef.current = null;
      gestureHandledRef.current = false;
      return;
    }

    const deltaX = changedTouch.clientX - swipeStateRef.current.startX;
    const deltaY = changedTouch.clientY - swipeStateRef.current.startY;

    if (
      Math.abs(deltaX) >= SWIPE_THRESHOLD &&
      Math.abs(deltaY) <= SWIPE_MAX_VERTICAL_DRIFT
    ) {
      if (deltaX < 0) {
        handleNextPage();
        setGestureHint("Próxima página");
      } else {
        handlePreviousPage();
        setGestureHint("Página anterior");
      }

      clearGestureHintWithDelay();
    }

    swipeStateRef.current = null;
    gestureHandledRef.current = false;
  }

  function handleTouchCancel() {
    const finalizedZoom = isMobile
      ? normalizeCommittedZoom(liveZoomRef.current)
      : clampZoom(zoomLevel);

    pinchStateRef.current = null;
    swipeStateRef.current = null;
    gestureHandledRef.current = false;
    setIsPinching(false);
    liveZoomRef.current = finalizedZoom;
    committedZoomRef.current = finalizedZoom;
    setZoomLevel(finalizedZoom);
    setCommittedZoomLevel(finalizedZoom);

    const shell = getActiveShell();

    if (shell && finalizedZoom === DEFAULT_ZOOM) {
      requestAnimationFrame(() => {
        shell.scrollLeft = 0;
        shell.scrollTop = 0;
      });
    }

    clearGestureHintWithDelay();
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    function syncFullscreenState() {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    function syncViewport() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      setDevicePixelRatio(window.devicePixelRatio || 1);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);

    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsMobileReaderFullscreen(false);
      setIsMobileUiVisible(true);
      clearMobileUiHideTimer();
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobileReaderFullscreen) {
      setIsMobileUiVisible(true);
      showMobileUiTemporarily();

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          recomputeMobileBaseSize();
          resetActiveShellPosition();
        });
      });

      return;
    }

    setIsMobileUiVisible(true);
    clearMobileUiHideTimer();
  }, [isMobileReaderFullscreen]);

  useEffect(() => {
    if (isDesktopFullscreen) {
      setIsDesktopUiVisible(true);
      showDesktopUiTemporarily();
      return;
    }

    setIsDesktopUiVisible(true);
    clearDesktopUiHideTimer();
  }, [isDesktopFullscreen]);

  useEffect(() => {
    const fullscreenRoot = fullscreenTargetId
      ? document.getElementById(fullscreenTargetId)
      : null;

    if (!fullscreenRoot) {
      return;
    }

    const chromeElements = Array.from(
      fullscreenRoot.querySelectorAll<HTMLElement>(
        "[data-reader-desktop-chrome='true']"
      )
    );

    if (isDesktopFullscreen) {
      chromeElements.forEach((element) => {
        element.style.display = "none";
      });

      fullscreenRoot.style.background = "#000000";
      fullscreenRoot.style.padding = "0";
      return;
    }

    chromeElements.forEach((element) => {
      element.style.display = "";
    });

    fullscreenRoot.style.background = "";
    fullscreenRoot.style.padding = "";

    return () => {
      chromeElements.forEach((element) => {
        element.style.display = "";
      });

      fullscreenRoot.style.background = "";
      fullscreenRoot.style.padding = "";
    };
  }, [fullscreenTargetId, isDesktopFullscreen]);

  useEffect(() => {
    const element = getActiveShell();

    if (!element) {
      return;
    }

    function updateWidth() {
      const shell = getActiveShell();

      if (!shell) {
        return;
      }

      setPageShellWidth(shell.clientWidth);
    }

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateWidth();
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [isImmersive, isMobileUiVisible, isDesktopUiVisible, isMobileReaderFullscreen]);

  useEffect(() => {
    if (!isMobile || pageShellWidth <= 0) {
      return;
    }

    recomputeMobileBaseSize();
  }, [isMobile, pageShellWidth, isMobileReaderFullscreen]);

  useEffect(() => {
    function handleKeyNavigation(
      event: KeyboardEvent | globalThis.KeyboardEvent
    ) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input" || tagName === "textarea") return;

      if (event.key === "ArrowLeft") {
        handlePreviousPage();
      }

      if (event.key === "ArrowRight") {
        handleNextPage();
      }

      if (event.key === "Escape") {
        if (isMobile && isMobileReaderFullscreen) {
          setIsMobileReaderFullscreen(false);
        }
      }
    }

    window.addEventListener("keydown", handleKeyNavigation);

    return () => {
      window.removeEventListener("keydown", handleKeyNavigation);
    };
  }, [pageNumber, numPages, isMobile, isMobileReaderFullscreen]);

  useEffect(() => {
    if (!readingProgressKey) return;

    setNumPages(0);
    setPageNumber(1);
    setPageInput("1");
    setPageError("");
    setGestureHint("");
    setZoomLevel(DEFAULT_ZOOM);
    setCommittedZoomLevel(DEFAULT_ZOOM);
    liveZoomRef.current = DEFAULT_ZOOM;
    committedZoomRef.current = DEFAULT_ZOOM;
    setIsPinching(false);
    setMobileBaseWidth(0);
    setMobileBaseHeight(0);
    mobileViewportRef.current = null;
  }, [readingProgressKey, fileUrl]);

  useEffect(() => {
    if (!numPages) return;
    savePage(pageNumber);
  }, [pageNumber, numPages, readingProgressKey]);

  useEffect(() => {
    return () => {
      if (gestureHintTimerRef.current) {
        window.clearTimeout(gestureHintTimerRef.current);
      }

      clearMobileUiHideTimer();
      clearDesktopUiHideTimer();
    };
  }, []);

  useEffect(() => {
    if (
      !isMobile ||
      !isMobileReaderFullscreen ||
      typeof document === "undefined"
    ) {
      return;
    }

    mobileScrollRestoreRef.current = window.scrollY;

    const html = document.documentElement;
    const body = document.body;

    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscrollBehavior = html.style.overscrollBehavior;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscrollBehavior = body.style.overscrollBehavior;
    const previousBodyTouchAction = body.style.touchAction;

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "contain";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "contain";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      body.style.touchAction = previousBodyTouchAction;

      window.scrollTo({
        top: mobileScrollRestoreRef.current,
        behavior: "auto",
      });
    };
  }, [isMobile, isMobileReaderFullscreen]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    requestAnimationFrame(() => {
      recomputeMobileBaseSize();
    });
  }, [pageNumber, isMobileReaderFullscreen, isMobile]);

  const visibleZoomPercent = useMemo(
    () => Math.round(zoomLevel * 100),
    [zoomLevel]
  );

  const effectiveZoom = isPinching
    ? zoomLevel
    : isMobile
    ? normalizeCommittedZoom(committedZoomLevel)
    : committedZoomLevel;

  const desktopScale = useMemo(() => {
    return Number((DESKTOP_BASE_SCALE * effectiveZoom).toFixed(2));
  }, [effectiveZoom]);

  const renderDevicePixelRatio = useMemo(() => {
    const qualityFactor =
      effectiveZoom <= 1
        ? 1.8
        : effectiveZoom <= 1.5
        ? 2.2
        : effectiveZoom <= 2
        ? 2.8
        : 3.2;

    return Math.min(Math.max(devicePixelRatio * qualityFactor, 1.5), 5);
  }, [devicePixelRatio, effectiveZoom]);

  const pageKey = `${pageNumber}-${isMobile ? "mobile" : "desktop"}-${Math.round(
    renderDevicePixelRatio * 100
  )}-${mobileBaseWidth}-${mobileBaseHeight}-${isMobileReaderFullscreen ? "fullscreen" : "normal"}`;

  const mobileScaledWidth =
    mobileBaseWidth > 0 ? Math.round(mobileBaseWidth * effectiveZoom) : 0;
  const mobileScaledHeight =
    mobileBaseHeight > 0 ? Math.round(mobileBaseHeight * effectiveZoom) : 0;

  const canRenderMobilePage =
    isMobile && mobileBaseWidth > 0 && mobileBaseHeight > 0;

  const mobilePageElement = canRenderMobilePage ? (
    <div
      className={isMobileReaderFullscreen ? "bg-white" : "rounded-xl bg-white shadow-2xl"}
      style={{
        width: `${mobileScaledWidth}px`,
        height: `${mobileScaledHeight}px`,
        position: "relative",
        transformOrigin: "top left",
        display: "block",
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          width: `${mobileBaseWidth}px`,
          height: `${mobileBaseHeight}px`,
          transform: `scale(${effectiveZoom})`,
          transformOrigin: "top left",
        }}
      >
        <Page
          key={pageKey}
          pageNumber={pageNumber}
          width={mobileBaseWidth}
          scale={1}
          devicePixelRatio={renderDevicePixelRatio}
          renderAnnotationLayer
          renderTextLayer
          onLoadSuccess={onPageLoadSuccess}
        />
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-zinc-300">
      Ajustando leitura para o celular...
    </div>
  );

  const readerContent = (
    <div
      ref={containerRef}
      className={`relative flex flex-col ${
        isNativeFullscreen ? "h-screen w-screen bg-black p-0" : "gap-3 md:gap-4"
      } ${isDesktopFullscreen && !isDesktopUiVisible ? "cursor-none" : ""}`}
      onMouseMove={() => {
        if (isDesktopFullscreen) {
          showDesktopUiTemporarily();
        }
      }}
      onClick={() => {
        if (isDesktopFullscreen) {
          showDesktopUiTemporarily();
        }
      }}
    >
      <div className={`${isDesktopFullscreen ? "flex h-full min-h-0 flex-col" : "contents"}`}>
        <div
          className={`${
            isDesktopFullscreen
              ? "pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center px-2 pt-2 sm:px-4"
              : ""
          }`}
        >
          <div
            className={`w-full transition-all duration-300 ${
              isDesktopFullscreen
                ? shouldShowDesktopOverlayUi
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-4 opacity-0"
                : ""
            } ${isDesktopFullscreen ? "max-w-3xl" : ""}`}
          >
            <div
              className={`${
                isDesktopFullscreen ? "" : "sticky top-0"
              } z-20 rounded-2xl border border-white/10 bg-[#11131a]/88 backdrop-blur-xl ${
                isDesktopFullscreen ? "px-3 py-2" : "p-2.5 sm:p-3"
              }`}
            >
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div
                  className={`${
                    isMobile
                      ? "grid grid-cols-1 gap-2"
                      : isDesktopFullscreen
                      ? "flex flex-wrap items-center gap-2"
                      : "flex flex-wrap items-center gap-3"
                  }`}
                >
                  <div className="flex items-center rounded-xl border border-white/10 bg-black/20">
                    <button
                      type="button"
                      onClick={handlePreviousPage}
                      disabled={pageNumber <= 1}
                      className={`rounded-l-xl font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
                        isMobile
                          ? "px-3 py-2.5 text-sm"
                          : isDesktopFullscreen
                          ? "px-3 py-2 text-xs"
                          : "px-3 py-2 text-sm"
                      }`}
                      aria-label="Página anterior"
                      title="Página anterior"
                    >
                      ←
                    </button>

                    <div className="h-8 w-px bg-white/10" />

                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        max={numPages || 1}
                        value={pageInput}
                        onChange={(e) => {
                          setPageInput(e.target.value);
                          if (pageError) setPageError("");
                        }}
                        onKeyDown={handlePageInputKeyDown}
                        className={`border-none bg-transparent text-center font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                          isDesktopFullscreen ? "w-12 text-xs" : "w-14 text-sm"
                        }`}
                        aria-label="Página atual"
                        title="Digite a página"
                      />

                      <span
                        className={`${
                          isDesktopFullscreen ? "text-xs" : "text-sm"
                        } text-zinc-400`}
                      >
                        /
                      </span>

                      <span
                        className={`min-w-[2rem] text-zinc-300 ${
                          isDesktopFullscreen ? "text-xs" : "text-sm"
                        }`}
                      >
                        {numPages || "-"}
                      </span>
                    </div>

                    <div className="h-8 w-px bg-white/10" />

                    <button
                      type="button"
                      onClick={handleNextPage}
                      disabled={pageNumber >= numPages}
                      className={`rounded-r-xl font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${
                        isMobile
                          ? "px-3 py-2.5 text-sm"
                          : isDesktopFullscreen
                          ? "px-3 py-2 text-xs"
                          : "px-3 py-2 text-sm"
                      }`}
                      aria-label="Próxima página"
                      title="Próxima página"
                    >
                      →
                    </button>
                  </div>

                  <div className="flex items-center rounded-xl border border-white/10 bg-black/20">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      className={`rounded-l-xl font-semibold text-white transition hover:bg-white/5 ${
                        isMobile
                          ? "px-3 py-2.5 text-sm"
                          : isDesktopFullscreen
                          ? "px-3 py-2 text-xs"
                          : "px-3 py-2 text-sm"
                      }`}
                      aria-label="Diminuir zoom"
                      title="Diminuir zoom"
                    >
                      −
                    </button>

                    <div className="h-8 w-px bg-white/10" />

                    <div
                      className={`px-3 py-2 font-semibold text-white ${
                        isDesktopFullscreen ? "text-xs" : "text-sm"
                      }`}
                    >
                      {visibleZoomPercent}%
                    </div>

                    <div className="h-8 w-px bg-white/10" />

                    <button
                      type="button"
                      onClick={handleZoomIn}
                      className={`font-semibold text-white transition hover:bg-white/5 ${
                        isMobile
                          ? "px-3 py-2.5 text-sm"
                          : isDesktopFullscreen
                          ? "px-3 py-2 text-xs"
                          : "px-3 py-2 text-sm"
                      }`}
                      aria-label="Aumentar zoom"
                      title="Aumentar zoom"
                    >
                      +
                    </button>

                    <div className="h-8 w-px bg-white/10" />

                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className={`rounded-r-xl font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white ${
                        isMobile
                          ? "px-3 py-2.5 text-xs"
                          : isDesktopFullscreen
                          ? "px-3 py-2 text-[11px]"
                          : "px-3 py-2 text-sm"
                      }`}
                      aria-label="Ajustar zoom"
                      title="Ajustar zoom"
                    >
                      Ajustar
                    </button>
                  </div>
                </div>

                <div
                  className={`flex ${
                    isMobile
                      ? "justify-end gap-2"
                      : "flex-wrap items-center gap-2"
                  }`}
                >
                  {isImmersive && fullscreenToolbarSlot ? (
                    <div className="shrink-0">{fullscreenToolbarSlot}</div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 font-medium text-white transition hover:bg-white/5 ${
                      isMobile
                        ? "px-3 py-2 text-xs"
                        : isDesktopFullscreen
                        ? "px-3 py-2 text-xs"
                        : "px-3 py-2 text-sm"
                    }`}
                    title={
                      isImmersive ? "Sair do modo imersivo" : "Abrir em tela cheia"
                    }
                  >
                    <span aria-hidden="true">{isImmersive ? "🗗" : "⛶"}</span>
                    <span>
                      {isMobile
                        ? isImmersive
                          ? "Sair"
                          : "Tela cheia"
                        : isNativeFullscreen
                        ? "Sair"
                        : "Tela cheia"}
                    </span>
                  </button>
                </div>
              </div>

              {!isImmersive ? (
                pageError ? (
                  <p className="mt-2 text-xs text-red-400">{pageError}</p>
                ) : gestureHint ? (
                  <p className="mt-2 text-xs text-amber-400">{gestureHint}</p>
                ) : isMobile ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Use dois dedos para ampliar. Com zoom acima de 100%, arraste a página livremente com o dedo.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-zinc-500">
                    Role o scroll do mouse para dar zoom, use ← → para trocar de página ou digite a página e pressione Enter.
                  </p>
                )
              ) : null}
            </div>
          </div>
        </div>

        <div
          ref={normalPageShellRef}
          className={`relative overflow-auto ${
            isDesktopFullscreen
              ? "flex-1 min-h-0 border-0 bg-black p-0"
              : "rounded-2xl border border-white/10 bg-zinc-900 p-2 sm:rounded-3xl sm:p-4"
          } ${!isDesktopFullscreen ? "mt-3" : "mt-0"}`}
          onClick={() => {
            if (isDesktopFullscreen) {
              showDesktopUiTemporarily();
            }
          }}
          onWheel={handleWheelZoom}
          style={{
            touchAction: isMobile ? "pan-x pan-y" : "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {!isDesktopFullscreen ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handlePreviousPage();
                }}
                disabled={pageNumber <= 1}
                className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#11131a]/85 p-3 text-white shadow-lg backdrop-blur transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                aria-label="Página anterior"
                title="Página anterior"
              >
                ←
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleNextPage();
                }}
                disabled={pageNumber >= numPages}
                className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-white/10 bg-[#11131a]/85 p-3 text-white shadow-lg backdrop-blur transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30 md:flex"
                aria-label="Próxima página"
                title="Próxima página"
              >
                →
              </button>
            </>
          ) : null}

          {isImmersive && shouldShowImmersiveMessage ? (
            <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
              <div
                className={`rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
                  pageError
                    ? "border-red-500/25 bg-red-500/10 text-red-300"
                    : "border-white/10 bg-[#11131a]/70 text-amber-300"
                }`}
              >
                {pageError || gestureHint}
              </div>
            </div>
          ) : null}

          <div
            className={`flex min-h-full ${
              isMobile ? "items-start justify-start" : "justify-center"
            } ${isDesktopFullscreen ? "items-center" : ""}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
          >
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-zinc-300">
                  Carregando PDF...
                </div>
              }
              error={
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-red-400">
                  Erro ao carregar o PDF.
                </div>
              }
            >
              {isMobile ? (
                mobilePageElement
              ) : (
                <div
                  className={`mx-auto ${
                    isDesktopFullscreen
                      ? "bg-white shadow-none"
                      : "rounded-xl bg-white shadow-2xl"
                  }`}
                >
                  <Page
                    key={pageKey}
                    pageNumber={pageNumber}
                    scale={desktopScale}
                    devicePixelRatio={renderDevicePixelRatio}
                    renderAnnotationLayer
                    renderTextLayer
                  />
                </div>
              )}
            </Document>
          </div>
        </div>
      </div>
    </div>
  );

  const mobileFullscreenOverlay =
    isMounted && isMobile && isMobileReaderFullscreen
      ? createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black"
            style={{
              width: "100vw",
              height: "100dvh",
              maxWidth: "100vw",
              maxHeight: "100dvh",
            }}
          >
            <div className="relative flex h-full min-h-0 flex-col bg-black">
              <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex justify-center px-2 pt-2">
                <div
                  className={`w-full transition-all duration-300 ${
                    showTopToolbar
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-4 opacity-0"
                  }`}
                >
                  <div className="rounded-2xl border border-white/10 bg-[#11131a]/88 px-3 py-2 backdrop-blur-xl">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center rounded-xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={handlePreviousPage}
                          disabled={pageNumber <= 1}
                          className="rounded-l-xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Página anterior"
                          title="Página anterior"
                        >
                          ←
                        </button>

                        <div className="h-8 w-px bg-white/10" />

                        <div className="flex items-center gap-2 px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            max={numPages || 1}
                            value={pageInput}
                            onChange={(e) => {
                              setPageInput(e.target.value);
                              if (pageError) setPageError("");
                            }}
                            onKeyDown={handlePageInputKeyDown}
                            className="w-14 border-none bg-transparent text-center text-sm font-semibold text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            aria-label="Página atual"
                            title="Digite a página"
                          />

                          <span className="text-sm text-zinc-400">/</span>

                          <span className="min-w-[2rem] text-sm text-zinc-300">
                            {numPages || "-"}
                          </span>
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        <button
                          type="button"
                          onClick={handleNextPage}
                          disabled={pageNumber >= numPages}
                          className="rounded-r-xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Próxima página"
                          title="Próxima página"
                        >
                          →
                        </button>
                      </div>

                      <div className="flex items-center rounded-xl border border-white/10 bg-black/20">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="rounded-l-xl px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
                          aria-label="Diminuir zoom"
                          title="Diminuir zoom"
                        >
                          −
                        </button>

                        <div className="h-8 w-px bg-white/10" />

                        <div className="px-3 py-2 text-sm font-semibold text-white">
                          {visibleZoomPercent}%
                        </div>

                        <div className="h-8 w-px bg-white/10" />

                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
                          aria-label="Aumentar zoom"
                          title="Aumentar zoom"
                        >
                          +
                        </button>

                        <div className="h-8 w-px bg-white/10" />

                        <button
                          type="button"
                          onClick={handleResetZoom}
                          className="rounded-r-xl px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
                          aria-label="Ajustar zoom"
                          title="Ajustar zoom"
                        >
                          Ajustar
                        </button>
                      </div>

                      <div className="flex justify-end gap-2">
                        {fullscreenToolbarSlot ? (
                          <div className="shrink-0">{fullscreenToolbarSlot}</div>
                        ) : null}

                        <button
                          type="button"
                          onClick={handleToggleFullscreen}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/5"
                          title="Sair do modo imersivo"
                        >
                          <span aria-hidden="true">🗗</span>
                          <span>Sair</span>
                        </button>
                      </div>
                    </div>

                    {pageError ? (
                      <p className="mt-2 text-xs text-red-400">{pageError}</p>
                    ) : gestureHint ? (
                      <p className="mt-2 text-xs text-amber-400">{gestureHint}</p>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-500">
                        Toque na tela para mostrar ou ocultar os controles. Use dois dedos para ampliar.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {shouldShowImmersiveMessage ? (
                <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center px-4">
                  <div
                    className={`rounded-full border px-3 py-1.5 text-xs shadow-lg backdrop-blur ${
                      pageError
                        ? "border-red-500/25 bg-red-500/10 text-red-300"
                        : "border-white/10 bg-[#11131a]/70 text-amber-300"
                    }`}
                  >
                    {pageError || gestureHint}
                  </div>
                </div>
              ) : null}

              <div
                ref={mobileFullscreenShellRef}
                className="relative flex-1 min-h-0 overflow-auto bg-black"
                onClick={toggleMobileUiVisibility}
                style={{
                  touchAction: "pan-x pan-y",
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                }}
              >
                <div
                  className="min-h-full min-w-full"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                >
                  <Document
                    file={fileUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div className="px-4 py-6 text-zinc-300">
                        Carregando PDF...
                      </div>
                    }
                    error={
                      <div className="px-4 py-6 text-red-400">
                        Erro ao carregar o PDF.
                      </div>
                    }
                  >
                    <div
                      className="block"
                      style={{
                        width: `${mobileScaledWidth || 0}px`,
                        minHeight: `${mobileScaledHeight || 0}px`,
                      }}
                    >
                      {mobilePageElement}
                    </div>
                  </Document>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {readerContent}
      {mobileFullscreenOverlay}
    </>
  );
}