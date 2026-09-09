"use client";

import Link from "next/link";
import BriefingArt from "@/components/briefing/BriefingArt";
import type { PulseBriefing } from "./pulse-types";

/** The Daily Briefing entry point on the Pulse home, in refresh styling. */
export default function PulseBriefingCard({ briefing }: { briefing: PulseBriefing }) {
  const running = briefing.status === "running";

  return (
    <Link
      href="/briefing"
      className="refresh-pressable"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "0 var(--gutter)",
        padding: 12,
        background: "var(--surface-1)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-card)",
        minHeight: 44,
      }}
    >
      <div style={{ width: 56, height: 56, flex: "none", borderRadius: 10, overflow: "hidden" }}>
        <BriefingArt seed={briefing.art_seed} mood={briefing.mood} className="w-full h-full" />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span className="refresh-eyebrow">Today&apos;s briefing</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: "18px",
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {running ? "Preparing today's briefing…" : briefing.title ?? "Daily briefing"}
        </span>
        {!running && briefing.summary ? (
          <span
            style={{
              fontSize: 12,
              lineHeight: "16px",
              color: "var(--text-secondary)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {briefing.summary}
            {briefing.minutes ? (
              <span className="refresh-mono" style={{ color: "var(--text-dim)" }}>
                {` · ${briefing.minutes} min`}
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      <span
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          flex: "none",
          borderRadius: "50%",
          background: "var(--accent)",
          color: "var(--surface-0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <polygon points="8,6.2 18,12 8,17.8" />
        </svg>
      </span>
    </Link>
  );
}
