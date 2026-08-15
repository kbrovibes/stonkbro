"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * Compact header indicator for background jobs. Polls the jobs API for the
 * global running count and links to /jobs. Renders nothing for guests (401).
 */
export default function JobsIndicator() {
  const [running, setRunning] = useState(0);
  const [unauthorized, setUnauthorized] = useState(false);

  const fetchCount = useCallback(() => {
    fetch("/api/jobs?limit=1")
      .then((r) => {
        if (r.status === 401) {
          setUnauthorized(true);
          return null;
        }
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json();
      })
      .then((d) => {
        if (d) setRunning(typeof d.running === "number" ? d.running : 0);
      })
      .catch(() => {
        // Network/server error → fall back to idle icon
        setRunning(0);
      });
  }, []);

  useEffect(() => {
    fetchCount();

    const interval = setInterval(() => {
      if (!document.hidden) fetchCount();
    }, 20_000);

    const onFocus = () => fetchCount();
    const onVisibility = () => {
      if (!document.hidden) fetchCount();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchCount]);

  if (unauthorized) return null;

  return (
    <Link
      href="/jobs"
      aria-label={running > 0 ? `Jobs — ${running} running` : "Jobs"}
      className="relative w-10 h-10 flex items-center justify-center rounded-full text-text-faint hover:text-text hover:bg-surface-muted active:bg-accent-bg transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
      >
        <polyline points="2 12 6.5 12 9.5 5 14.5 19 17.5 12 22 12" />
      </svg>
      {running > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-sky-500 text-white text-[10px] font-bold leading-4 text-center animate-pulse">
          {running}
        </span>
      )}
    </Link>
  );
}
