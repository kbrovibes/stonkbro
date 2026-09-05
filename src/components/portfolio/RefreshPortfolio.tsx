"use client";

/**
 * Portfolio, in the refresh design.
 *
 * Presentation only — every figure arrives as a prop from
 * `src/app/(app)/portfolio/page.tsx`, which owns the chain math. Rendered
 * instead of the classic screen when `data-theme-style="refresh"` is on
 * <html>; the classic and HOOD markup is untouched.
 *
 * Styling is the refresh primitives plus token-valued inline layout. Nothing
 * here defines a colour, radius, or duration of its own.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createClient } from "@/lib/supabase-browser";
import { usePrivacy } from "@/components/PrivacyProvider";
import {
  BarSeries,
  ChipRow,
  DataRow,
  DataRowSkeleton,
  MonoNumber,
  StatTile,
} from "@/components/refresh";
import type { Chip, RowBadge, SeriesBar } from "@/components/refresh";

/** Screen gutter. 24px in the reference; 22px on a real 440pt viewport. */
const GUTTER = 22;

/** Browser-local, per-device. Never synced — see the PIN lock for the real thing. */
const MASK_KEY = "stonkbro-portfolio-masked";

/* The mask flag lives in localStorage, which is an external store, so it is
   read through `useSyncExternalStore` rather than an effect that sets state
   on mount. React renders the server snapshot (unmasked) during hydration
   and swaps to the stored value straight after, with no mismatch. */

const maskListeners = new Set<() => void>();

function readMask(): boolean {
  try {
    return localStorage.getItem(MASK_KEY) === "1";
  } catch {
    return false; // private mode
  }
}

function subscribeMask(onChange: () => void): () => void {
  maskListeners.add(onChange);
  return () => {
    maskListeners.delete(onChange);
  };
}

function writeMask(next: boolean): void {
  try {
    localStorage.setItem(MASK_KEY, next ? "1" : "0");
  } catch {
    /* ignore — the toggle still applies for this session */
  }
  for (const listener of maskListeners) listener();
}

export type PortfolioFilter =
  | "Monthly"
  | "Open"
  | "Closed"
  | "Assigned"
  | "LEAPS"
  | "Archive";

const FILTERS: readonly Chip<PortfolioFilter>[] = [
  { key: "Monthly", label: "Monthly" },
  { key: "Open", label: "Open" },
  { key: "Closed", label: "Closed" },
  { key: "Assigned", label: "Assigned" },
  { key: "LEAPS", label: "LEAPS" },
  { key: "Archive", label: "Archive" },
];

export interface MonthModel {
  /** `2026-08`. */
  key: string;
  /** `AUG 2026`. */
  label: string;
  /** Realized premium closed in the month. */
  premium: number;
  /** Premium as a percentage of that month's peak PUT collateral. */
  onCollateralPct: number | null;
  peak: number;
  /** `AUG 14`, the date the peak was struck. */
  peakDateLabel: string | null;
  peakPositions: readonly { key: string; label: string; collateral: number }[];
  /** The month's closed chains, revealed on tap. */
  closed: readonly { key: string; label: string; pnl: number }[];
  /** Trailing premium, oldest first, for the 8-bar series. */
  bars: readonly number[];
}

export interface ChainRowModel {
  key: string;
  ticker: string;
  badges: readonly RowBadge[];
  caption: string;
  pnl: number | null;
  /** Collateral, shown under the P&L. Puts only. */
  collateral: number | null;
  risk: boolean;
}

export interface RefreshPortfolioProps {
  /** Broker name for the header eyebrow, or a count when there are several. */
  broker?: string | null;
  /** `2m ago`. */
  syncAge?: string | null;
  syncing?: boolean;
  syncError?: string | null;
  onSync?: () => void;
  premiumYtd?: number;
  /** This month's realized premium, for the delta pill. */
  monthDelta?: number | null;
  /** `Aug`. */
  monthDeltaLabel?: string | null;
  returnOnPeakPct?: number | null;
  openCount?: number;
  assignedCount?: number;
  collateralLocked?: number;
  /** Current year, newest first. */
  months?: readonly MonthModel[];
  /** Every year, newest first. */
  archiveMonths?: readonly MonthModel[];
  openRows?: readonly ChainRowModel[];
  closedRows?: readonly ChainRowModel[];
  assignedRows?: readonly ChainRowModel[];
  leapsRows?: readonly ChainRowModel[];
  /**
   * First load with nothing cached. The frame still renders — only the list
   * becomes skeletons, so nothing jumps when the data lands.
   */
  loading?: boolean;
}

/* ---------------------------------------------------------------------------
   Number helpers
   --------------------------------------------------------------------------- */

interface MoneyProps {
  value: number;
  size?: number;
  weight?: 400 | 500 | 600 | 700;
  color?: string;
  mask?: boolean;
  /** Render a leading `+` on positive values. */
  signed?: boolean;
  letterSpacing?: string;
  style?: CSSProperties;
}

/** A dollar figure. The sign lives in the prefix so the digits stay tabular. */
function Money({
  value,
  size = 15,
  weight = 600,
  color = "var(--text)",
  mask = false,
  signed = false,
  letterSpacing,
  style,
}: MoneyProps) {
  const prefix = value < 0 ? "-$" : signed && value > 0 ? "+$" : "$";
  return (
    <MonoNumber
      value={Math.abs(value)}
      prefix={prefix}
      decimals={0}
      size={size}
      weight={weight}
      color={color}
      mask={mask}
      letterSpacing={letterSpacing}
      style={style}
    />
  );
}

/** A signed percentage. Never masked — a rate reveals no magnitude. */
function Percent({
  value,
  size = 20,
  color = "var(--text)",
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  return (
    <MonoNumber
      value={Math.abs(value)}
      prefix={value < 0 ? "-" : "+"}
      suffix="%"
      decimals={1}
      size={size}
      color={color}
    />
  );
}

function toneColor(n: number): string {
  return n < 0 ? "var(--down)" : "var(--up)";
}

/* ---------------------------------------------------------------------------
   Header chrome
   --------------------------------------------------------------------------- */

const CIRCLE: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "var(--surface-2)",
  border: "1px solid rgba(255,255,255,0.1)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/** 44pt hit area around a 32px circle. */
const CIRCLE_HIT: CSSProperties = {
  width: 44,
  height: 44,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  border: 0,
  background: "none",
  cursor: "pointer",
  WebkitTapHighlightColor: "transparent",
};

/**
 * The privacy glyph: an eye, closed when masking is on.
 *
 * Drawn as a bordered half-round rather than an icon import — the refresh
 * adds no icon library.
 */
function MaskGlyph({ on }: { on: boolean }) {
  return (
    <span
      style={{
        width: 15,
        height: 9,
        borderRadius: on ? "0 0 9px 9px" : "9px 9px 0 0",
        border: `1.5px solid ${on ? "var(--accent)" : "var(--text-subtle)"}`,
        borderTop: on ? "none" : undefined,
        borderBottom: on ? undefined : "none",
        transition: "border-color var(--dur-chip) var(--refresh-ease)",
      }}
    />
  );
}

/* ---------------------------------------------------------------------------
   Month card
   --------------------------------------------------------------------------- */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="refresh-mono"
      style={{
        display: "block",
        fontSize: 11,
        lineHeight: 1.2,
        letterSpacing: "0.14em",
        color: "var(--text-dim)",
      }}
    >
      {children}
    </span>
  );
}

function LineItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span
        className="refresh-mono"
        style={{
          fontSize: 12,
          lineHeight: 1.35,
          color: "var(--text-subtle)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function MonthCard({
  month,
  emphasis,
  expanded,
  onToggle,
  hideMoney,
  index,
}: {
  month: MonthModel;
  emphasis: boolean;
  expanded: boolean;
  onToggle: () => void;
  hideMoney: boolean;
  index: number;
}) {
  // The month's own bar is the highlighted one; everything before it is
  // context. A negative month floors at zero height rather than inverting.
  const bars: SeriesBar[] = month.bars.map((v, i) => ({
    value: Math.max(0, v),
    tone: i < month.bars.length - 1 ? "neutral" : v < 0 ? "down" : "up",
  }));

  const divider: CSSProperties = {
    borderTop: "1px solid var(--hairline)",
    paddingTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 9,
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      className="refresh-pressable refresh-enter"
      style={
        {
          display: "flex",
          flexDirection: "column",
          gap: 14,
          width: "100%",
          textAlign: "left",
          padding: 16,
          borderRadius: "var(--radius-card)",
          background: emphasis ? "var(--gradient-emphasis)" : "var(--surface-1)",
          border: `1px solid ${emphasis ? "var(--hairline-strong)" : "var(--hairline)"}`,
          "--refresh-i": index,
        } as CSSProperties
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Eyebrow>{month.label}</Eyebrow>
          <div style={{ marginTop: 5 }}>
            <Money
              value={month.premium}
              size={emphasis ? 30 : 24}
              letterSpacing="-0.03em"
              color={toneColor(month.premium)}
              mask={hideMoney}
            />
          </div>
        </div>
        <div style={{ textAlign: "right", flex: "none" }}>
          <Eyebrow>On collateral</Eyebrow>
          <div style={{ marginTop: 6 }}>
            {month.onCollateralPct === null ? (
              <span
                className="refresh-mono"
                style={{ fontSize: emphasis ? 20 : 18, fontWeight: 600, color: "var(--text-dim)" }}
              >
                —
              </span>
            ) : (
              <Percent value={month.onCollateralPct} size={emphasis ? 20 : 18} />
            )}
          </div>
        </div>
      </div>

      {emphasis && bars.length > 0 && (
        <BarSeries
          bars={bars}
          height={44}
          gap={4}
          aria-label={`Premium over the last ${bars.length} months`}
        />
      )}

      {emphasis && month.peak > 0 && (
        <div style={divider}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span className="refresh-mono" style={{ fontSize: 11, color: "var(--accent)" }}>
              PEAK PUT COLLATERAL{month.peakDateLabel ? ` · ${month.peakDateLabel}` : ""}
            </span>
            <Money value={month.peak} size={12} color="var(--accent)" mask={hideMoney} />
          </div>
          {month.peakPositions.map((p) => (
            <LineItem key={p.key} label={p.label}>
              <Money
                value={p.collateral}
                size={12}
                weight={400}
                color="var(--accent)"
                mask={hideMoney}
              />
            </LineItem>
          ))}
        </div>
      )}

      {expanded && (
        <div style={divider}>
          {month.closed.length === 0 ? (
            <span className="refresh-mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>
              NOTHING CLOSED THIS MONTH
            </span>
          ) : (
            month.closed.map((c) => (
              <LineItem key={c.key} label={c.label}>
                <Money
                  value={c.pnl}
                  size={12}
                  weight={400}
                  signed
                  color={toneColor(c.pnl)}
                  mask={hideMoney}
                />
              </LineItem>
            ))
          )}
        </div>
      )}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   Screen
   --------------------------------------------------------------------------- */

export default function RefreshPortfolio({
  broker = null,
  syncAge = null,
  syncing = false,
  syncError = null,
  onSync,
  premiumYtd = 0,
  monthDelta = null,
  monthDeltaLabel = null,
  returnOnPeakPct = null,
  openCount = 0,
  assignedCount = 0,
  collateralLocked = 0,
  months = [],
  archiveMonths = [],
  openRows = [],
  closedRows = [],
  assignedRows = [],
  leapsRows = [],
  loading = false,
}: RefreshPortfolioProps) {
  const [filter, setFilter] = useState<PortfolioFilter>("Monthly");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [initials, setInitials] = useState("");
  const { locked } = usePrivacy();
  const masked = useSyncExternalStore(subscribeMask, readMask, () => false);

  // `getSession()` reads the local session, no network round trip.
  useEffect(() => {
    let live = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        const user = data.session?.user;
        if (!live || !user) return;
        const name = (user.user_metadata?.full_name as string | undefined) || user.email || "";
        setInitials(
          name
            .split(/[\s@]/)
            .filter(Boolean)
            .slice(0, 2)
            .map((s: string) => s[0].toUpperCase())
            .join("")
        );
      })
      .catch(() => {
        /* signed out or offline — the circle stays blank */
      });
    return () => {
      live = false;
    };
  }, []);

  const toggleMask = useCallback(() => writeMask(!readMask()), []);

  // The PIN lock outranks the header toggle: unmasking here must never
  // reveal what the lock is hiding.
  const hideMoney = masked || locked;

  const eyebrow = syncing
    ? "SYNCING…"
    : syncError
      ? "SYNC FAILED · TAP TO RETRY"
      : [broker, syncAge ? `SYNCED ${syncAge}` : null]
          .filter(Boolean)
          .join(" · ")
          .toUpperCase() || "TAP TO SYNC";

  const rows =
    filter === "Open"
      ? openRows
      : filter === "Closed"
        ? closedRows
        : filter === "Assigned"
          ? assignedRows
          : filter === "LEAPS"
            ? leapsRows
            : [];

  const monthList = filter === "Archive" ? archiveMonths : months;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          padding: `12px ${GUTTER}px 0`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1 className="refresh-title">Portfolio</h1>
          <button
            type="button"
            onClick={onSync}
            disabled={syncing}
            className="refresh-mono"
            aria-label="Re-sync the broker"
            style={{
              display: "block",
              // Negative margins keep the eyebrow 3px under the title while
              // the hit box stays a legal 44pt.
              margin: "-12px 0 -15px",
              padding: "15px 12px 15px 0",
              border: 0,
              background: "none",
              textAlign: "left",
              cursor: syncing ? "default" : "pointer",
              fontSize: 11,
              lineHeight: "14px",
              letterSpacing: "0.14em",
              color: syncError ? "var(--down)" : "var(--text-dim)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {eyebrow}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", flex: "none", marginRight: -6 }}>
          <button
            type="button"
            onClick={toggleMask}
            aria-pressed={masked}
            aria-label={masked ? "Show amounts" : "Hide amounts"}
            style={CIRCLE_HIT}
          >
            <span style={CIRCLE}>
              <MaskGlyph on={masked} />
            </span>
          </button>
          {/* The real profile control lives in the app header; this is the
              design's second circle, and it is decorative. */}
          <span style={CIRCLE_HIT} aria-hidden="true">
            <span style={{ ...CIRCLE, fontSize: 13, color: "var(--text-muted)" }} className="refresh-mono">
              {initials}
            </span>
          </span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: `20px ${GUTTER}px 14px` }}>
        <span
          className="refresh-mono"
          style={{
            display: "block",
            fontSize: 11,
            lineHeight: 1.2,
            letterSpacing: "0.16em",
            color: "var(--text-dim)",
            marginBottom: 8,
          }}
        >
          PREMIUM REALIZED · YTD
        </span>
        <Money
          value={premiumYtd}
          size={50}
          letterSpacing="-0.04em"
          color={toneColor(premiumYtd)}
          mask={hideMoney}
          style={{ lineHeight: 0.9 }}
        />
        {(monthDelta !== null || returnOnPeakPct !== null) && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {monthDelta !== null && monthDeltaLabel && (
              <span
                style={{
                  padding: "4px 9px",
                  borderRadius: 8,
                  background: monthDelta < 0 ? "var(--down-bg)" : "var(--up-bg)",
                }}
              >
                <MonoNumber
                  value={Math.abs(monthDelta)}
                  prefix={monthDelta < 0 ? "-$" : "+$"}
                  suffix={` in ${monthDeltaLabel}`}
                  decimals={0}
                  size={13}
                  color={toneColor(monthDelta)}
                  mask={hideMoney}
                />
              </span>
            )}
            {returnOnPeakPct !== null && (
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {returnOnPeakPct.toFixed(1)}% on peak collateral
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats — collateral takes the widest tile because it constrains
          every decision after it. */}
      <div style={{ display: "flex", gap: 8, padding: `0 ${GUTTER}px 16px` }}>
        <StatTile
          label="Open"
          value={<MonoNumber value={openCount} size={17} mask={locked} />}
        />
        <StatTile
          label="Assigned"
          value={
            <MonoNumber value={assignedCount} size={17} color="var(--assigned)" mask={locked} />
          }
        />
        <StatTile
          label="Put collateral locked"
          accent
          flex={1.5}
          value={<Money value={collateralLocked} size={17} color="var(--accent)" mask={hideMoney} />}
        />
      </div>

      {/* Filters */}
      <div style={{ paddingBottom: 16 }}>
        <ChipRow
          chips={FILTERS}
          active={filter}
          onChange={setFilter}
          gutter={GUTTER}
          aria-label="Portfolio view"
        />
      </div>

      {/* Content. `key` remounts the panel so the entry stagger replays. */}
      <div
        key={filter}
        style={{
          padding: `0 ${GUTTER}px 24px`,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {loading ? (
          [0, 1, 2, 3].map((i) => <DataRowSkeleton key={i} />)
        ) : filter === "Monthly" || filter === "Archive" ? (
          monthList.length === 0 ? (
            <Empty label="No premium realized yet" />
          ) : (
            monthList.map((m, i) => (
              <MonthCard
                key={m.key}
                month={m}
                emphasis={i === 0}
                expanded={expanded === m.key}
                onToggle={() => setExpanded((prev) => (prev === m.key ? null : m.key))}
                hideMoney={hideMoney}
                index={i}
              />
            ))
          )
        ) : rows.length === 0 ? (
          <Empty label={`No ${filter.toLowerCase()} positions`} />
        ) : (
          rows.map((row, i) => (
            <DataRow
              key={row.key}
              index={i}
              ticker={row.ticker}
              badges={row.badges}
              caption={row.caption}
              risk={row.risk}
              value={
                row.pnl === null ? undefined : (
                  <Money
                    value={row.pnl}
                    size={15}
                    signed
                    color={toneColor(row.pnl)}
                    mask={hideMoney}
                  />
                )
              }
              subValue={
                row.collateral === null ? undefined : (
                  <Money
                    value={row.collateral}
                    size={12}
                    weight={400}
                    color="var(--text-dim)"
                    mask={hideMoney}
                  />
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: "36px 0" }}>
      {label}
    </p>
  );
}
