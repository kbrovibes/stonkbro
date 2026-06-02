"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const THRESHOLD = 72; // px pull before triggering refresh

export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync refs so event handlers always see current value
  useEffect(() => { pullYRef.current = pullY; }, [pullY]);
  useEffect(() => { refreshingRef.current = refreshing; }, [refreshing]);

  // Reset pull state on navigation
  useEffect(() => {
    setRefreshing(false);
    setPullY(0);
    pullYRef.current = 0;
  }, [pathname]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && !refreshingRef.current) {
        startYRef.current = e.touches[0].clientY;
        startXRef.current = e.touches[0].clientX;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshingRef.current) return;

      // If page has scrolled away from top, abort
      if (window.scrollY > 0) {
        startYRef.current = null;
        startXRef.current = null;
        setPullY(0);
        pullYRef.current = 0;
        return;
      }

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;
      const deltaX = Math.abs(touch.clientX - (startXRef.current ?? touch.clientX));

      // If horizontal movement dominates, don't interfere (table scroll etc.)
      if (deltaX > Math.abs(deltaY)) {
        startYRef.current = null;
        return;
      }

      if (deltaY > 0) {
        // Dampen with sqrt curve for a natural feel
        const dampened = Math.min(THRESHOLD * 1.5, Math.sqrt(deltaY) * 6);
        pullYRef.current = dampened;
        setPullY(dampened);
        if (deltaY > 8) e.preventDefault(); // prevent body scroll bounce
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
    };

    const onTouchEnd = () => {
      if (pullYRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullY(0);
        pullYRef.current = 0;
        // Notify client components to re-fetch
        window.dispatchEvent(new Event("pwa:refresh"));
        // Refresh RSC server data
        router.refresh();
        setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        }, 1600);
      } else {
        setPullY(0);
        pullYRef.current = 0;
      }
      startYRef.current = null;
      startXRef.current = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router]);

  const progressPct = Math.min(1, pullY / THRESHOLD);
  const showIndicator = pullY > 8 || refreshing;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Floating pull indicator */}
      <div
        className="pointer-events-none fixed top-16 inset-x-0 flex justify-center z-50"
        style={{
          opacity: showIndicator ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      >
        <div
          className="w-9 h-9 rounded-full bg-white dark:bg-surface-elevated shadow-md border border-stone-100 dark:border-border-subtle flex items-center justify-center"
          style={{
            transform: `translateY(${refreshing ? 8 : Math.min(pullY * 0.35, 22)}px)`,
            transition: refreshing ? "transform 0.2s ease" : undefined,
          }}
        >
          {refreshing ? (
            <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-4 h-4 text-sky-600 dark:text-accent"
              style={{
                transform: `rotate(${progressPct * 180}deg)`,
                transition: "transform 0.1s ease",
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>

      {/* Content — translates down during pull */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: pullY === 0 ? "transform 0.25s cubic-bezier(0.33,1,0.68,1)" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
