"use client";

import { useEffect, useRef, useState } from "react";

type ProfileSectionAnchorProps = {
  id: string;
  children: React.ReactNode;
  className?: string;
  openDetailsSelector?: string;
};

export default function ProfileSectionAnchor({
  id,
  children,
  className = "",
  openDetailsSelector,
}: ProfileSectionAnchorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    function clearExistingTimeout() {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function triggerHighlightIfMatched() {
      const currentHash = window.location.hash.replace(/^#/, "");

      if (currentHash !== id) {
        return;
      }

      if (openDetailsSelector && containerRef.current) {
        const details = containerRef.current.querySelector(
          openDetailsSelector
        ) as HTMLDetailsElement | null;

        if (details && !details.open) {
          details.open = true;
        }
      }

      setIsHighlighted(false);

      window.requestAnimationFrame(() => {
        setAnimationKey((prev) => prev + 1);
        setIsHighlighted(true);

        clearExistingTimeout();
        timeoutRef.current = setTimeout(() => {
          setIsHighlighted(false);
        }, 1800);
      });
    }

    triggerHighlightIfMatched();

    window.addEventListener("hashchange", triggerHighlightIfMatched);

    return () => {
      clearExistingTimeout();
      window.removeEventListener("hashchange", triggerHighlightIfMatched);
    };
  }, [id, openDetailsSelector]);

  return (
    <div
      id={id}
      ref={containerRef}
      className={`relative isolate scroll-mt-28 overflow-hidden rounded-[32px] transition-all duration-500 ${
        isHighlighted
          ? "bg-amber-400/[0.045] shadow-[0_0_0_1px_rgba(251,191,36,0.16),0_0_32px_rgba(251,191,36,0.14)]"
          : ""
      } ${className}`}
    >
      {isHighlighted ? (
        <>
          <div
            key={`glow-${animationKey}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[32px] border border-amber-300/30 profile-section-anchor-glow"
          />

          <div
            key={`flash-${animationKey}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[32px] profile-section-anchor-flash"
          />

          <div
            key={`sheen-${animationKey}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]"
          >
            <div className="profile-section-anchor-sheen" />
          </div>
        </>
      ) : null}

      <div
        className={`relative z-[1] transition-transform duration-500 ${
          isHighlighted ? "-translate-y-[1px]" : ""
        }`}
      >
        {children}
      </div>

      <style jsx>{`
        .profile-section-anchor-glow {
          box-shadow:
            inset 0 0 0 1px rgba(251, 191, 36, 0.08),
            0 0 0 1px rgba(251, 191, 36, 0.1),
            0 0 28px rgba(251, 191, 36, 0.12);
          animation: profileAnchorGlow 1.8s ease-out forwards;
        }

        .profile-section-anchor-flash {
          background:
            radial-gradient(
              circle at center,
              rgba(251, 191, 36, 0.12) 0%,
              rgba(251, 191, 36, 0.06) 35%,
              rgba(251, 191, 36, 0.02) 60%,
              rgba(251, 191, 36, 0) 100%
            );
          animation: profileAnchorFlash 1.8s ease-out forwards;
        }

        .profile-section-anchor-sheen {
          position: absolute;
          top: -30%;
          bottom: -30%;
          left: -40%;
          width: 32%;
          transform: rotate(12deg);
          background: linear-gradient(
            90deg,
            rgba(251, 191, 36, 0) 0%,
            rgba(251, 191, 36, 0.05) 35%,
            rgba(255, 255, 255, 0.18) 50%,
            rgba(251, 191, 36, 0.05) 65%,
            rgba(251, 191, 36, 0) 100%
          );
          filter: blur(8px);
          animation: profileAnchorSheen 1.1s ease-out forwards;
        }

        @keyframes profileAnchorGlow {
          0% {
            opacity: 0;
            transform: scale(0.992);
          }
          16% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(1);
          }
        }

        @keyframes profileAnchorFlash {
          0% {
            opacity: 0;
          }
          14% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes profileAnchorSheen {
          0% {
            opacity: 0;
            transform: translateX(-10%) rotate(12deg);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateX(430%) rotate(12deg);
          }
        }
      `}</style>
    </div>
  );
}