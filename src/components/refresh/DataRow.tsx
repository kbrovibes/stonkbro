"use client";

import type { CSSProperties, ReactNode } from "react";

export type BadgeTone = "info" | "risk" | "fact";

export interface RowBadge {
  label: string;
  /**
   * `info` — amber. `HELD`, `CSP`, `PMCC`, `EARNINGS`, `BREAKOUT`.
   * `risk` — red. `ITM · ASSIGN RISK`, `POSITION AT RISK`.
   * `fact` — neutral. `SKIPPED 12 JUN`.
   */
  tone?: BadgeTone;
}

/** A standalone badge, for use outside a `DataRow` head. */
export function Badge({ label, tone = "info" }: RowBadge) {
  return <span className={`refresh-badge refresh-badge-${tone}`}>{label}</span>;
}

export interface DataRowProps {
  /** Mono 16/600. The thing the row is about. */
  ticker: string;
  badges?: readonly RowBadge[];
  /** Why it moved, what the structure is. Truncates — never wraps. */
  caption?: string;
  /** A `<Sparkline />`, between the head and the value stack. */
  sparkline?: ReactNode;
  /** Right-hand primary value. Usually a `<MonoNumber />`. */
  value?: ReactNode;
  /** Right-hand secondary value, under the primary. */
  subValue?: ReactNode;
  /** Red border. Border only — no icon, no fill. */
  risk?: boolean;
  onPress?: () => void;
  /** Stagger index for `refresh-enter`. Omit to skip the entry animation. */
  index?: number;
  className?: string;
  style?: CSSProperties;
  /** Expanded detail, rendered under the head row inside the same card. */
  children?: ReactNode;
}

/**
 * The list unit: ticker and reason on the left, an optional sparkline, a
 * right-aligned value stack.
 *
 * A row is a `<button>` when it is tappable and a `<div>` when it is not —
 * the pressed state and the 44pt target come from the element, not from a
 * handler bolted onto a div.
 */
export default function DataRow({
  ticker,
  badges,
  caption,
  sparkline,
  value,
  subValue,
  risk = false,
  onPress,
  index,
  className = "",
  style,
  children,
}: DataRowProps) {
  const classes = [
    "refresh-row",
    risk ? "refresh-row-risk" : "",
    onPress ? "refresh-pressable" : "",
    index === undefined ? "" : "refresh-enter",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const rowStyle: CSSProperties = {
    ...(index === undefined ? null : ({ ["--refresh-i" as string]: index } as CSSProperties)),
    ...(children ? { flexDirection: "column", alignItems: "stretch", gap: 13 } : null),
    ...style,
  };

  const head = (
    <>
      <div className="refresh-row-main">
        <div className="refresh-row-head">
          <span className="refresh-mono" style={{ fontSize: 16, fontWeight: 600, lineHeight: "21px" }}>
            {ticker}
          </span>
          {badges?.map((badge) => (
            <Badge key={badge.label} label={badge.label} tone={badge.tone} />
          ))}
        </div>
        {caption ? <span className="refresh-row-caption">{caption}</span> : null}
      </div>
      {sparkline}
      {value || subValue ? (
        <div className="refresh-row-value">
          {value}
          {subValue ? <div>{subValue}</div> : null}
        </div>
      ) : null}
    </>
  );

  const content = children ? (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{head}</div>
      {children}
    </>
  ) : (
    head
  );

  if (onPress) {
    return (
      <button type="button" className={classes} style={rowStyle} onClick={onPress}>
        {content}
      </button>
    );
  }
  return (
    <div className={classes} style={rowStyle}>
      {content}
    </div>
  );
}

export interface DataRowSkeletonProps {
  /** Reserve space for a sparkline, so the row does not narrow on load. */
  sparkline?: boolean;
  className?: string;
}

/**
 * The loading twin of `DataRow`.
 *
 * It reuses the real row's own line-box classes — `refresh-row-head` (21px)
 * and `refresh-row-caption` (16px) — so a skeleton and the row that replaces
 * it are the same height by construction. Nothing jumps when data lands.
 */
export function DataRowSkeleton({ sparkline = false, className = "" }: DataRowSkeletonProps) {
  return (
    <div className={`refresh-row refresh-skeleton ${className}`} aria-hidden="true">
      <div className="refresh-row-main">
        <div className="refresh-row-head">
          <div className="refresh-skel-block" style={{ width: 64, height: 13 }} />
        </div>
        <div className="refresh-row-caption">
          <div className="refresh-skel-sub" style={{ width: 150, height: 9, marginTop: 3.5 }} />
        </div>
      </div>
      {sparkline ? <div className="refresh-skel-sub" style={{ width: 60, height: 26 }} /> : null}
      <div className="refresh-skel-block" style={{ width: 70, height: 22 }} />
    </div>
  );
}
