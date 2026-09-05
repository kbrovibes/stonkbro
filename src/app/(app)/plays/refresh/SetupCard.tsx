"use client";

/**
 * One ranked setup.
 *
 * Rank 1 is the only card on the screen with the amber border, and the only
 * one that carries its detail open — it is the answer to the question the
 * screen asks. Ranks 2+ are the same head row over the same bar, and open the
 * identical detail block on tap.
 */

import Link from "next/link";
import { MetricBar, MonoNumber } from "@/components/refresh";
import type { Setup } from "./scanner-data";

interface SetupCardProps {
  setup: Setup;
  rank: number;
  /** List index, for the entry stagger. */
  index: number;
  fill: number;
  expanded: boolean;
  onToggle: () => void;
  registerRef: (el: HTMLElement | null) => void;
}

const CARD: React.CSSProperties = {
  borderRadius: 20,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 13,
  width: "100%",
  textAlign: "left",
};

const ACTION: React.CSSProperties = {
  textAlign: "center",
  // 12px + a 20px line box clears the 44pt touch minimum; the reference's
  // 11px does not.
  padding: "12px 0",
  lineHeight: "20px",
  borderRadius: 12,
  fontSize: 14,
};

function Head({ setup, rank, lead }: { setup: Setup; rank: number; lead: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        className="refresh-mono"
        style={{
          width: 30,
          height: 30,
          flex: "none",
          borderRadius: 9,
          background: lead ? "var(--accent)" : "var(--surface-3)",
          color: lead ? "var(--surface-0)" : "var(--text-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {rank}
      </span>

      <span style={{ flex: 1, minWidth: 0, display: "block" }}>
        <span
          className="refresh-mono"
          style={{ display: "block", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}
        >
          {setup.symbol}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 12,
            lineHeight: "16px",
            color: "var(--text-dim)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {setup.structure}
        </span>
      </span>

      <span style={{ flex: "none", textAlign: "right" }}>
        <MonoNumber
          value={setup.metric}
          size={24}
          weight={600}
          decimals={setup.metricDecimals}
          suffix={setup.metricSuffix}
          color={setup.metricColor}
          letterSpacing="-0.02em"
        />
        <span
          className="refresh-mono"
          style={{ display: "block", fontSize: 10, letterSpacing: "0.1em", color: "var(--text-dim)" }}
        >
          {setup.metricLabel}
        </span>
      </span>
    </div>
  );
}

function Detail({ setup }: { setup: Setup }) {
  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        {setup.tiles.map((tile) => (
          <div
            key={tile.label}
            style={{ flex: 1, minWidth: 0, background: "var(--inset)", borderRadius: 10, padding: "8px 10px" }}
          >
            <span className="refresh-eyebrow" style={{ display: "block" }}>
              {tile.label}
            </span>
            <span
              className="refresh-mono"
              style={{ display: "block", marginTop: 3, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}
            >
              {tile.value}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {setup.addHref && (
          <Link
            href={setup.addHref}
            style={{
              ...ACTION,
              flex: 1,
              background: "var(--accent)",
              color: "var(--surface-0)",
              fontWeight: 600,
            }}
          >
            Add to portfolio
          </Link>
        )}
        <Link
          href={`/ticker/${setup.symbol}`}
          style={{
            ...ACTION,
            flex: setup.addHref ? "none" : 1,
            width: setup.addHref ? 110 : undefined,
            background: setup.addHref ? "var(--control)" : "var(--accent)",
            color: setup.addHref ? "var(--text-primary)" : "var(--surface-0)",
            fontWeight: setup.addHref ? 500 : 600,
          }}
        >
          Research
        </Link>
      </div>
    </>
  );
}

export default function SetupCard({
  setup,
  rank,
  index,
  fill,
  expanded,
  onToggle,
  registerRef,
}: SetupCardProps) {
  const lead = rank === 1;
  const bar = (
    <MetricBar
      value={fill}
      variant="roc"
      fill="gradient"
      aria-label={`${setup.symbol} ${setup.metricLabel.toLowerCase()}`}
    />
  );

  return (
    <div
      ref={registerRef}
      className="refresh-enter"
      style={{
        ...CARD,
        background: lead ? "var(--gradient-emphasis)" : "var(--surface-1)",
        border: `1px solid ${lead ? "var(--accent-border)" : "var(--hairline)"}`,
        ["--refresh-i" as string]: index,
      }}
    >
      {lead ? (
        <>
          <Head setup={setup} rank={rank} lead />
          {bar}
        </>
      ) : (
        // The head is the toggle; the detail block sits outside it so its
        // links are never nested inside a button.
        <button
          type="button"
          className="refresh-pressable"
          aria-expanded={expanded}
          aria-label={`${setup.symbol} — ${expanded ? "hide" : "show"} detail`}
          onClick={onToggle}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 13,
            width: "100%",
            textAlign: "left",
            background: "none",
            border: "none",
            padding: 0,
            borderRadius: 12,
            color: "inherit",
            font: "inherit",
          }}
        >
          <Head setup={setup} rank={rank} lead={false} />
          {bar}
        </button>
      )}

      {(lead || expanded) && <Detail setup={setup} />}
    </div>
  );
}

/**
 * The one skeleton that sits at the bottom of the list while a scan runs.
 * Same card geometry as a real result, at the reference's 0.45 opacity.
 */
export function SetupCardSkeleton() {
  return (
    <div
      className="refresh-skeleton"
      aria-hidden="true"
      style={{
        ...CARD,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        background: "var(--surface-1)",
        border: "1px solid var(--hairline)",
      }}
    >
      <div className="refresh-skel-block" style={{ width: 30, height: 30, borderRadius: 9, flex: "none" }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="refresh-skel-block" style={{ width: 64, height: 12 }} />
        <div className="refresh-skel-sub" style={{ width: 150, height: 9 }} />
      </div>
      <div className="refresh-skel-block" style={{ width: 70, height: 22, borderRadius: 6, flex: "none" }} />
    </div>
  );
}
