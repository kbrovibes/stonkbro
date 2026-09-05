"use client";

/**
 * Hindsight — the refresh presentation of the Time Machine.
 *
 * Presentation only. The replay, the assignment cascade, and the treatment of
 * deposits and withdrawals are all specified in `specs/53-time-machine.md` and
 * implemented in `src/lib/time-machine/**`; nothing here changes any of it.
 * Every figure on screen is read out of the API payload.
 *
 * The delta leads because it is the entire feature, and the prose sentence
 * sits directly under it because a number this counterintuitive needs one line
 * of causation before any table.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MetricBar, MonoNumber } from "@/components/refresh";
import { usePrivacy } from "@/components/PrivacyProvider";
import { privateCount } from "@/lib/privacy";
import type { SnapshotMeta, TimeMachineResult } from "@/app/(app)/time-machine/types";

/* ── dates ─────────────────────────────────────────────────────────────── */

function isoNDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** `4 Mar 2026`, the stop-date field's format. */
function fmtStopDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtMonthShort(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short" });
}

/** `March` inside the current year, `Mar 2025` before it. */
function sinceLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.getFullYear() === new Date().getFullYear()
    ? d.toLocaleDateString("en-US", { month: "long" })
    : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const numWord = (n: number) => (n >= 0 && n <= 10 ? WORDS[n] : String(n));
const plural = (n: number, word: string) => `${word}${n === 1 ? "" : "s"}`;

/* ── derivation ────────────────────────────────────────────────────────── */

interface HoldingRow {
  key: string;
  label: string;
  /** Inline accent label — `ASSIGNED IN SIM`, `LIVE IN SIM`. */
  tag?: string;
  /** Absolute unit count; masked before display. */
  units?: number;
  unitSuffix?: string;
  price?: number;
  value: number;
  /** The CASH row, which carries no units or price. */
  cash?: boolean;
}

interface HindsightView {
  rows: HoldingRow[];
  sentence: string;
  assumptionLine: string;
  depositCaption: string | null;
  deposits: number;
  withdrawals: number;
}

/**
 * The one prose sentence under the delta: which way it went, and the single
 * largest identifiable reason. Ranked by what the payload can actually
 * evidence — a dominated exit first, then the replay's assignments, then
 * deposits — and left off entirely when nothing dominates.
 */
function dominantCause(d: TimeMachineResult, favorable: boolean): string | null {
  const magnitude = Math.abs(d.delta.absolute);
  if (magnitude === 0) return null;

  const exits = (d.exitAnalysis ?? []).filter((e) =>
    favorable ? e.totalDiff > 0 : e.totalDiff < 0,
  );
  const topExit = exits.slice().sort((a, b) => Math.abs(b.totalDiff) - Math.abs(a.totalDiff))[0];
  if (topExit && Math.abs(topExit.totalDiff) >= magnitude * 0.15) {
    return favorable ? `selling ${topExit.symbol}` : `getting out of ${topExit.symbol}`;
  }

  const typeByTicker = new Map(d.snapshot.options.map((o) => [o.ticker, o.type]));
  const assigned = d.simulation.optionValues.filter((o) => o.status === "assigned");
  if (assigned.length > 0) {
    const types = new Set(assigned.map((o) => typeByTicker.get(o.ticker)).filter(Boolean));
    const noun =
      types.size === 1
        ? plural(assigned.length, [...types][0]!.toLowerCase())
        : plural(assigned.length, "contract");
    return favorable
      ? `${numWord(assigned.length)} assigned ${noun}`
      : `the ${numWord(assigned.length)} ${noun} you'd have been assigned`;
  }

  if (d.simulation.totalDepositsAdded >= magnitude * 0.5) return "deposits kept as cash";
  return null;
}

function causeSentence(d: TimeMachineResult): string {
  const since = sinceLabel(d.snapshotDate);
  if (Math.abs(d.delta.absolute) < 1) {
    return `Within a dollar of what you have now — trading since ${since} has been a wash.`;
  }
  const favorable = d.delta.favorableToHold;
  const lead = favorable ? "More than you have now." : "Less than you have now.";
  const verb = favorable ? "has cost you" : "has paid off";
  const cause = dominantCause(d, favorable);
  return cause
    ? `${lead} Trading since ${since} ${verb}, mostly on ${cause}.`
    : `${lead} Trading since ${since} ${verb}.`;
}

/** One quiet line: replayed contracts · assignment cascades · splits · history start. */
function assumptionLine(d: TimeMachineResult): string {
  const snapByTicker = new Map(d.snapshot.options.map((o) => [o.ticker, o]));
  const resolved = d.simulation.optionValues.filter((o) => o.status !== "live");

  let replayed: string;
  if (resolved.length === 0) {
    replayed = "no contracts to replay";
  } else {
    const shapes = new Set(
      resolved.map((o) => {
        const snap = snapByTicker.get(o.ticker);
        if (!snap) return "?";
        return `${snap.units < 0 ? "short" : "long"} ${snap.type.toLowerCase()}`;
      }),
    );
    const noun =
      shapes.size === 1 && !shapes.has("?")
        ? plural(resolved.length, [...shapes][0])
        : plural(resolved.length, "contract");
    replayed = `${resolved.length} ${noun} replayed to expiry`;
  }

  const cascades = d.simulation.optionValues.filter((o) => o.status === "assigned").length;
  const parts = [
    replayed,
    cascades === 0 ? "no assignment cascades" : `${cascades} ${plural(cascades, "assignment cascade")}`,
    "splits approximated",
  ];
  if (d.earliestAvailable) parts.push(`history back to ${fmtStopDate(d.earliestAvailable)}`);
  return parts.join(" · ");
}

function buildView(d: TimeMachineResult): HindsightView {
  const snapByTicker = new Map(d.snapshot.options.map((o) => [o.ticker, o]));

  // A stock row carries `ASSIGNED IN SIM` when the replay put those shares
  // there — an assignment or an exercise on that underlying.
  const resolvedUnderlyings = new Set(
    d.simulation.optionValues
      .filter((o) => o.status === "assigned" || o.status === "exercised")
      .map((o) => snapByTicker.get(o.ticker)?.underlying)
      .filter((s): s is string => !!s),
  );

  const rows: HoldingRow[] = d.simulation.stockValues
    .filter((s) => s.units !== 0)
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((s) => ({
      key: `stock-${s.symbol}`,
      label: s.symbol,
      tag: resolvedUnderlyings.has(s.symbol) ? "ASSIGNED IN SIM" : undefined,
      units: Math.round(s.units),
      unitSuffix: "sh",
      price: s.todayPrice,
      value: s.value,
    }));

  // Contracts the replay left still open are part of the frozen portfolio, so
  // they sit in the same four columns rather than being dropped from a list
  // whose values would then not add up.
  for (const o of d.simulation.optionValues) {
    if (o.status !== "live") continue;
    const snap = snapByTicker.get(o.ticker);
    if (!snap) continue;
    const contracts = Math.abs(snap.units);
    rows.push({
      key: `opt-${o.ticker}`,
      label: `${snap.underlying} ${snap.strike}${snap.type === "CALL" ? "C" : "P"}`,
      tag: "LIVE IN SIM",
      units: contracts,
      unitSuffix: "ct",
      price: contracts > 0 ? Math.abs(o.value) / (contracts * 100) : undefined,
      value: o.value,
    });
  }

  const stockSum = d.simulation.stockValues.reduce((a, s) => a + s.value, 0);
  const optionSum = d.simulation.optionValues.reduce((a, o) => a + o.value, 0);
  const cash = d.simulation.cashFinal ?? d.simulation.total - stockSum - optionSum;
  rows.push({ key: "cash", label: "CASH", value: cash, cash: true });

  const deposits = d.simulation.deposits;
  let depositCaption: string | null = null;
  if (deposits.length > 0) {
    const dates = deposits.map((x) => x.date).sort();
    const first = fmtMonthShort(dates[0]);
    const last = fmtMonthShort(dates[dates.length - 1]);
    const span = first === last ? first : `${first}–${last}`;
    depositCaption = `${deposits.length} ${plural(deposits.length, "deposit")}, ${span}`;
  }

  return {
    rows,
    sentence: causeSentence(d),
    assumptionLine: assumptionLine(d),
    depositCaption,
    deposits: d.simulation.totalDepositsAdded,
    withdrawals: d.simulation.totalWithdrawalsFunded,
  };
}

/* ── screen ────────────────────────────────────────────────────────────── */

/** Only used to draw the determinate bar; the API reports no real progress. */
const REPLAY_ESTIMATE_MS = 20_000;
const PROGRESS_AFTER_MS = 300;

export default function HindsightRefresh() {
  const { locked } = usePrivacy();

  const [stopDate, setStopDate] = useState<string>(isoNDaysAgo(180));
  const [result, setResult] = useState<TimeMachineResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [earliest, setEarliest] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const startedAt = useRef(0);

  const maxDate = useMemo(() => isoNDaysAgo(7), []);

  const runSimulation = useCallback(async (date: string) => {
    setIsSimulating(true);
    setError(null);
    startedAt.current = performance.now();
    setElapsed(0);
    try {
      // Monthly snapshots are precomputed and land instantly; any other date
      // falls through to the live replay behind the same button.
      const cached = await fetch(`/api/portfolio/time-machine/cached?date=${date}`);
      if (cached.ok) {
        setResult((await cached.json()) as TimeMachineResult);
        return;
      }
      const live = await fetch(`/api/portfolio/time-machine?date=${date}`);
      const body = await live.json().catch(() => null);
      if (!live.ok) throw new Error(body?.error || `Simulation failed (${live.status})`);
      setResult(body as TimeMachineResult);
    } catch (e) {
      // The previous result stays on screen — a failed re-run must not blank it.
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  }, []);

  // Land on the most recent precomputed snapshot so the screen opens with an
  // answer rather than an empty frame.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portfolio/time-machine/cached");
        if (!res.ok) return;
        const json = (await res.json()) as {
          earliestAvailable: string | null;
          snapshots: SnapshotMeta[];
        };
        if (cancelled) return;
        if (json.earliestAvailable) setEarliest(json.earliestAvailable);
        const newest = json.snapshots?.[0];
        if (newest) {
          setStopDate(newest.snapshotDate);
          runSimulation(newest.snapshotDate);
        }
      } catch {
        /* silent — the Simulate button still works */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [runSimulation]);

  // Elapsed clock for the determinate bar. Only ticks while a replay is in
  // flight, and the bar itself only appears once the replay is slow enough
  // to be worth reporting.
  useEffect(() => {
    if (!isSimulating) return;
    const id = setInterval(() => setElapsed(performance.now() - startedAt.current), 100);
    return () => clearInterval(id);
  }, [isSimulating]);

  const view = useMemo(() => (result ? buildView(result) : null), [result]);
  const showProgress = isSimulating && elapsed > PROGRESS_AFTER_MS;
  // The payload knows the broker's real activity floor; the list endpoint only
  // knows it once a snapshot exists. Whichever we have bounds the picker.
  const minDate = result?.earliestAvailable ?? earliest ?? undefined;

  const favorable = result?.delta.favorableToHold ?? true;
  const deltaColor = favorable ? "var(--up)" : "var(--down)";
  const clock = `${String(Math.floor(elapsed / 60000)).padStart(2, "0")}:${String(
    Math.floor((elapsed % 60000) / 1000),
  ).padStart(2, "0")}`;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "12px var(--gutter) 24px",
        background: "var(--surface-0)",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div style={{ paddingBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
          Hindsight
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 3 }}>
          What you&apos;d be worth if you&apos;d stopped trading.
        </p>
      </div>

      {/* Control row */}
      <div style={{ display: "flex", gap: 8, alignItems: "stretch", paddingBottom: 16 }}>
        <label
          style={{
            position: "relative",
            flex: 1,
            background: "var(--surface-1)",
            border: "1px solid var(--hairline-strong)",
            borderRadius: 14,
            padding: "11px 14px",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer",
          }}
        >
          <span className="refresh-eyebrow">Stop date</span>
          <span className="refresh-mono" style={{ fontSize: 15, fontWeight: 600, marginTop: 3 }}>
            {fmtStopDate(stopDate)}
          </span>
          <input
            type="date"
            aria-label="Stop date"
            value={stopDate}
            min={minDate}
            max={maxDate}
            onChange={(e) => e.target.value && setStopDate(e.target.value)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              border: 0,
              background: "transparent",
              cursor: "pointer",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => runSimulation(stopDate)}
          disabled={isSimulating}
          className="refresh-pressable"
          style={{
            width: 118,
            flex: "none",
            minHeight: 44,
            borderRadius: 14,
            background: "var(--accent)",
            color: "var(--surface-0)",
            fontSize: 15,
            fontWeight: 600,
            opacity: isSimulating ? 0.55 : 1,
          }}
        >
          {isSimulating ? "Replaying" : "Simulate"}
        </button>
      </div>

      {showProgress && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="refresh-eyebrow" style={{ color: "var(--accent)", letterSpacing: "0.1em" }}>
              Replaying · estimated
            </span>
            <span className="refresh-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {clock}
            </span>
          </div>
          <MetricBar
            value={Math.min(0.95, elapsed / REPLAY_ESTIMATE_MS)}
            aria-label="Replay progress, estimated"
          />
        </div>
      )}

      {error && (
        <div
          style={{
            border: "1px solid var(--loss-border)",
            background: "var(--down-bg)",
            borderRadius: 16,
            padding: "13px 15px",
            marginBottom: 16,
            fontSize: 13,
            color: "var(--down)",
          }}
        >
          {error}
        </div>
      )}

      {!result && !isSimulating && !error && (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--hairline)",
            borderRadius: 20,
            padding: 18,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
          }}
        >
          Pick a stop date and tap Simulate to replay everything you held on that day
          through to today.
        </div>
      )}

      {result && view && (
        <>
          {/* Delta hero */}
          <div
            key={`hero-${result.snapshotDate}`}
            style={{
              background: "var(--gradient-emphasis)",
              border: `1px solid ${favorable ? "var(--gain-border)" : "var(--loss-border)"}`,
              borderRadius: 20,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <span className="refresh-eyebrow" style={{ fontSize: 10, letterSpacing: "0.14em" }}>
              If you&apos;d stopped, you&apos;d have
            </span>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <MonoNumber
                value={Math.abs(result.delta.absolute)}
                prefix={favorable ? "+$" : "−$"}
                decimals={0}
                size={44}
                weight={600}
                letterSpacing="-0.04em"
                color={deltaColor}
                mask={locked}
                style={{ lineHeight: 0.9 }}
              />
              <MonoNumber
                value={Math.abs(result.delta.pct)}
                prefix={result.delta.pct >= 0 ? "+" : "−"}
                suffix="%"
                decimals={1}
                size={15}
                weight={400}
                color={deltaColor}
                style={{ paddingBottom: 5 }}
              />
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
              {view.sentence}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  ["Simulated", result.simulation.total],
                  ["Actual today", result.actual.total],
                ] as const
              ).map(([label, amount]) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    background: "var(--inset)",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <span className="refresh-eyebrow" style={{ letterSpacing: "0.1em" }}>
                    {label}
                  </span>
                  <div style={{ marginTop: 3 }}>
                    <MonoNumber
                      value={amount}
                      prefix="$"
                      decimals={0}
                      size={16}
                      weight={600}
                      mask={locked}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Frozen holdings */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              paddingBottom: 10,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
              Frozen holdings
            </h2>
            <span className="refresh-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
              UNITS × TODAY
            </span>
          </div>

          <div
            key={`rows-${result.snapshotDate}`}
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--surface-1)",
              border: "1px solid var(--hairline)",
              borderRadius: 18,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {view.rows.map((row, i) => (
              <div
                key={row.key}
                className="refresh-enter"
                style={
                  {
                    "--refresh-i": i,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderTop: i > 0 ? "1px solid var(--hairline-soft)" : undefined,
                  } as React.CSSProperties
                }
              >
                <span
                  className="refresh-mono"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: row.cash ? "var(--text-subtle)" : "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.label}
                  {row.tag && (
                    <span style={{ fontSize: 10, color: "var(--accent)", marginLeft: 7 }}>
                      {row.tag}
                    </span>
                  )}
                </span>
                {row.cash ? (
                  <span style={{ flex: 1 }} />
                ) : (
                  <>
                    <span
                      className="refresh-mono"
                      style={{ width: 56, flex: "none", fontSize: 12, color: "var(--text-dim)" }}
                    >
                      {privateCount(locked, row.units ?? 0)} {row.unitSuffix}
                    </span>
                    <span
                      className="refresh-mono"
                      style={{
                        width: 62,
                        flex: "none",
                        fontSize: 12,
                        color: "var(--text-dim)",
                        textAlign: "right",
                      }}
                    >
                      {row.price != null ? row.price.toFixed(2) : "—"}
                    </span>
                  </>
                )}
                <span style={{ width: 74, flex: "none", textAlign: "right" }}>
                  <MonoNumber
                    value={Math.abs(row.value)}
                    prefix={row.value < 0 ? "−$" : "$"}
                    decimals={0}
                    size={13}
                    weight={600}
                    color={row.value < 0 ? "var(--down)" : "var(--text-primary)"}
                    countUp={false}
                    mask={locked}
                  />
                </span>
              </div>
            ))}
          </div>

          {/* Cash-flow statements — corrections to the headline number */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {view.deposits > 0 && (
              <div
                key={`dep-${result.snapshotDate}`}
                className="refresh-enter"
                style={{
                  background: "rgba(255,190,60,0.09)",
                  border: "1px solid var(--accent-border-soft)",
                  borderRadius: 16,
                  padding: "13px 15px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="refresh-eyebrow"
                    style={{ fontSize: 10, color: "var(--accent)" }}
                  >
                    Deposits since · kept as cash
                  </span>
                  {view.depositCaption && (
                    <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
                      {view.depositCaption}
                    </div>
                  )}
                </div>
                <MonoNumber
                  value={view.deposits}
                  prefix="+$"
                  decimals={0}
                  size={17}
                  weight={600}
                  color="var(--accent)"
                  mask={locked}
                />
              </div>
            )}

            {view.withdrawals > 0 && (
              <div
                key={`wd-${result.snapshotDate}`}
                className="refresh-enter"
                style={
                  {
                    "--refresh-i": 1,
                    background: "rgba(255,140,60,0.09)",
                    border: "1px solid rgba(255,150,70,0.3)",
                    borderRadius: 16,
                    padding: "13px 15px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  } as React.CSSProperties
                }
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    className="refresh-eyebrow"
                    style={{ fontSize: 10, color: "var(--warn-orange)" }}
                  >
                    Withdrawals · not subtracted
                  </span>
                  <div style={{ fontSize: 12, color: "var(--text-subtle)", marginTop: 4 }}>
                    Would need funding elsewhere
                  </div>
                </div>
                <MonoNumber
                  value={view.withdrawals}
                  prefix="$"
                  decimals={0}
                  size={17}
                  weight={600}
                  color="var(--warn-orange)"
                  mask={locked}
                />
              </div>
            )}

            {/* Assumptions — one quiet line, not a disclaimer block. The
                engine's own notes hang off the end of it rather than getting
                a block of their own; the whole line is the 44pt target. */}
            <div
              style={{
                padding: "2px 2px 0",
                fontSize: 12,
                lineHeight: 1.55,
                color: "var(--text-dim)",
              }}
            >
              {result.assumptions.length === 0 ? (
                view.assumptionLine
              ) : (
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  aria-expanded={notesOpen}
                  style={{
                    display: "block",
                    width: "100%",
                    minHeight: 44,
                    textAlign: "left",
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: "inherit",
                  }}
                >
                  {view.assumptionLine}
                  {" · "}
                  <span style={{ color: "var(--accent)" }}>
                    {result.assumptions.length} {plural(result.assumptions.length, "note")}
                  </span>
                </button>
              )}
              {notesOpen && (
                <ul style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 4 }}>
                  {result.assumptions.map((a, i) => (
                    <li key={i}>· {a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
