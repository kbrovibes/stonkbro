"use client";

/**
 * REFRESH SCREEN — ticker detail / Research.
 *
 * Handoff §4. The screen answers one question: decide on this ticker, and
 * leave with a specific structure rather than a summary. Which is why the
 * amber-bordered block under the prose is the point of the page, and the
 * prose is only the setup for it.
 *
 * Everything numeric comes from `/api/ticker/[symbol]/research`. Nothing here
 * is hardcoded; where a value genuinely cannot be derived the strip renders
 * an em dash rather than an invented number.
 *
 * The route hides this whole subtree unless the user is on the `refresh`
 * theme-style, and nothing is fetched until the DOM attribute confirms that —
 * HOOD and Classic users pay nothing for it.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarSeries,
  HeroChart,
  MonoNumber,
  PriceChart,
  SegmentedSwitch,
  prefersReducedMotion,
  subscribeRaf,
} from "@/components/refresh";
import { useThemeStyle } from "@/components/ThemeStyleProvider";
import type {
  ResearchAnswer,
  ResearchEarnings,
  ResearchSnapshot,
  ResearchStructure,
} from "./research-types";

/** Characters per second the answer reveals at, and a ceiling on the whole reveal. */
const REVEAL_CPS = 220;
const REVEAL_MAX_MS = 2600;

/** The chart card's two views: price history (default) and the IV/IVR/RSI/VOL snapshot. */
const CHART_VIEW_SEGMENTS = [
  { key: "price", label: "Price" },
  { key: "stats", label: "Stats" },
] as const;

const monoFont = "var(--font-refresh-mono)";

export type ResearchScreenQuote = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
};

type ThreadEntry = {
  id: number;
  /** Null on the opening read; a question on every follow-up. */
  question: string | null;
  answer: ResearchAnswer | null;
  error: string | null;
  askedAt: number;
};

// ---------------------------------------------------------------------------
// Type helpers — the two mono roles this screen uses, in one place each
// ---------------------------------------------------------------------------

function Mono({
  children,
  size = 10,
  weight = 400,
  color = "var(--text-dim)",
  tracking,
}: {
  children: React.ReactNode;
  size?: number;
  weight?: number;
  color?: string;
  tracking?: string;
}) {
  return (
    <span
      style={{
        fontFamily: monoFont,
        fontVariantNumeric: "tabular-nums",
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: tracking,
      }}
    >
      {children}
    </span>
  );
}

/**
 * A mono eyebrow — 10px, 0.14em. Callers pass the string already cased:
 * `MOVE vs IMPLIED` keeps its lowercase `vs`, so this cannot uppercase.
 */
function Eyebrow({ children, color = "var(--text-dim)" }: { children: React.ReactNode; color?: string }) {
  return (
    <Mono size={10} tracking="0.14em" color={color}>
      {children}
    </Mono>
  );
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** `26 SEP` — the expiry as the contract line writes it. */
function formatExpiry(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  return `${d.getUTCDate()} ${month}`;
}

/** `$16.5K` / `$1.2M` — collateral, at the width the caption has for it. */
function formatCollateral(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

function timeAgo(from: number, now: number): string {
  const mins = Math.floor((now - from) / 60_000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} HR AGO`;
  return `${Math.floor(hours / 24)} D AGO`;
}

// ---------------------------------------------------------------------------
// The reveal
// ---------------------------------------------------------------------------

/**
 * Reveals `text` a character at a time off the shared rAF loop.
 *
 * The provider layer this app is built on returns a whole completion rather
 * than a token stream — `generateText` in `src/lib/ai/provider.ts` has no
 * streaming entry point, and that file is out of scope here — so the reveal
 * is driven client-side. What the layout cares about is identical either way:
 * the card grows downward from a fixed chart and nothing above it moves.
 *
 * It lives inside the card that shows it so a per-frame render stays local to
 * that card rather than re-rendering the screen 150 times.
 *
 * Under `prefers-reduced-motion` the whole answer is there on the first
 * frame — this is text arriving, not an animation, and it collapses like one.
 */
function useReveal(text: string | null): { shown: string; complete: boolean } {
  const full = text ?? "";
  const [progress, setProgress] = useState({ text: "", count: 0 });

  // Reset during render rather than in an effect: an effect would paint one
  // frame of the previous answer's tail under the new question.
  if (progress.text !== full) {
    setProgress({ text: full, count: prefersReducedMotion() ? full.length : 0 });
  }

  useEffect(() => {
    if (!full || prefersReducedMotion()) return;

    const duration = Math.min(REVEAL_MAX_MS, (full.length / REVEAL_CPS) * 1000);
    let start = 0;
    let stop: (() => void) | null = null;

    stop = subscribeRaf((now) => {
      if (start === 0) start = now;
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      setProgress({ text: full, count: Math.ceil(full.length * t) });
      // Leave the shared loop the moment this reveal is done, so an idle
      // screen goes back to costing nothing.
      if (t >= 1) stop?.();
    });

    return () => stop?.();
  }, [full]);

  const count = progress.text === full ? progress.count : 0;
  return { shown: full.slice(0, count), complete: full.length > 0 && count >= full.length };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ResearchScreen({ quote }: { quote: ResearchScreenQuote }) {
  const router = useRouter();
  const active = useThemeStyle() === "refresh";
  const symbol = quote.symbol;

  const [snapshot, setSnapshot] = useState<ResearchSnapshot | null>(null);
  const [structure, setStructure] = useState<ResearchStructure | null>(null);
  const [chain, setChain] = useState<ResearchStructure[]>([]);
  const [structureLoaded, setStructureLoaded] = useState(false);
  const [earnings, setEarnings] = useState<ResearchEarnings | null>(null);
  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [openingComplete, setOpeningComplete] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [chartView, setChartView] = useState<"price" | "stats">("price");

  const earningsRef = useRef<HTMLDivElement | null>(null);
  const latestRef = useRef<HTMLDivElement | null>(null);
  const askedOpening = useRef(false);

  const opening = thread[0] ?? null;

  // ---- data ---------------------------------------------------------------

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const load = async (part: string) => {
      const res = await fetch(`/api/ticker/${symbol}/research?part=${part}`, {
        signal: controller.signal,
      });
      return res.ok ? await res.json() : null;
    };

    void load("snapshot").then((d) => d && setSnapshot(d.snapshot)).catch(() => {});
    void load("earnings").then((d) => d && setEarnings(d.earnings)).catch(() => {});
    void load("structure")
      .then((d) => {
        if (d) {
          setStructure(d.structure ?? null);
          setChain(d.chain ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setStructureLoaded(true));

    return () => controller.abort();
  }, [active, symbol]);

  const ask = useCallback(
    async (text: string | null, context: ResearchStructure | null) => {
      const id = Date.now();
      setThread((t) => [...t, { id, question: text, answer: null, error: null, askedAt: id }]);
      setAsking(true);
      try {
        const res = await fetch(`/api/ticker/${symbol}/research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text, structure: context }),
        });
        const data = await res.json().catch(() => null);
        setThread((t) =>
          t.map((e) =>
            e.id === id
              ? res.ok && data?.answer
                ? { ...e, answer: data.answer as ResearchAnswer }
                : { ...e, error: data?.error ?? "Research is unavailable right now" }
              : e
          )
        );
      } catch {
        setThread((t) =>
          t.map((e) => (e.id === id ? { ...e, error: "Could not reach research" } : e))
        );
      } finally {
        setAsking(false);
      }
    },
    [symbol]
  );

  // The opening read waits for the scan so the prose and the contract sitting
  // under it are written against the same chain.
  useEffect(() => {
    if (!active || askedOpening.current || !structureLoaded) return;
    askedOpening.current = true;
    void ask(null, structure);
  }, [active, structureLoaded, structure, ask]);

  // Keeps "time ago" honest without a per-second render.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [active]);

  // A follow-up scrolls to the top edge of its own answer, not to the bottom
  // of the page — the question just asked should be the first thing read.
  useEffect(() => {
    if (thread.length < 2) return;
    latestRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  }, [thread.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = question.trim();
    if (!text || asking) return;
    setQuestion("");
    void ask(text, structure);
  };

  // ---- derived ------------------------------------------------------------

  const price = snapshot?.price ?? quote.price;
  const changePct = snapshot?.changePct ?? quote.changePct;
  const direction = changePct >= 0 ? "var(--up)" : "var(--down)";

  const earningsBars = useMemo(
    () =>
      (earnings?.reactions ?? []).map((r) => ({
        value: Math.abs(r.movePct),
        tone: (r.movePct >= 0 ? "up" : "down") as "up" | "down",
      })),
    [earnings]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: "100%",
        // Clears the docked composer (10 + 56 + 12). The layout's own bottom
        // padding clears the tab bar underneath it.
        paddingBottom: 80,
      }}
    >
      {/* 1 — nav bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px var(--gutter) 14px" }}>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="refresh-pressable"
          style={{
            width: 44,
            height: 44,
            margin: "0 -7px",
            flex: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              background: "var(--surface-2)",
              color: "var(--text-subtle)",
              fontSize: 16,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </span>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: monoFont,
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: "-.01em",
              color: "var(--text-primary)",
            }}
          >
            {symbol}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {[snapshot?.name ?? quote.name, snapshot?.sector].filter(Boolean).join(" · ")}
          </div>
        </div>

        <div style={{ textAlign: "right", flex: "none" }}>
          <MonoNumber value={price} size={19} weight={600} decimals={2} color="var(--text-primary)" />
          <div>
            <MonoNumber
              value={changePct}
              size={12}
              decimals={2}
              prefix={changePct >= 0 ? "+" : ""}
              suffix="%"
              color={direction}
            />
          </div>
        </div>
      </div>

      {/* 2 — chart card */}
      <div style={{ padding: "0 var(--gutter) 16px" }}>
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--hairline)",
            borderRadius: 18,
            padding: "16px 16px 12px",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <SegmentedSwitch
              segments={CHART_VIEW_SEGMENTS}
              active={chartView}
              onChange={setChartView}
              aria-label="Chart view"
            />
          </div>

          {chartView === "price" ? (
            <PriceChart symbol={symbol} currentPrice={price} changePct={changePct} />
          ) : (
            <>
              {snapshot && snapshot.chart.length > 1 ? (
                <HeroChart points={snapshot.chart} height={110} />
              ) : (
                <div style={{ height: 110, borderRadius: 12, background: "var(--chart-dim)", opacity: 0.45 }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <StripStat label="IV" value={snapshot?.iv ?? null} decimals={1} />
                <StripStat label="IVR" value={snapshot?.ivRank ?? null} decimals={0} />
                <StripStat label="RSI" value={snapshot?.rsi ?? null} decimals={0} />
                <StripStat label="VOL" value={snapshot?.relativeVolume ?? null} decimals={1} suffix="×" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3 — section header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 var(--gutter) 12px" }}>
        <span
          aria-hidden="true"
          style={{
            width: 22,
            height: 22,
            flex: "none",
            borderRadius: 7,
            background: "var(--accent)",
            color: "var(--text-inverse)",
            fontSize: 12,
            fontWeight: 700,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✦
        </span>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-.01em", color: "var(--text-primary)" }}>
          Claude research
        </h2>
        <div style={{ flex: 1 }} />
        {opening?.answer ? <Mono>{timeAgo(opening.askedAt, now)}</Mono> : null}
      </div>

      {/* 4–7 — the answer, the structure, the actions, the earnings block */}
      <div style={{ padding: "0 var(--gutter)", display: "flex", flexDirection: "column", gap: 10 }}>
        <AnswerCard entry={opening} onComplete={() => setOpeningComplete(true)} />

        {/* 5 — the suggested structure animates in once the answer completes */}
        {openingComplete && structureLoaded ? (
          <div className="refresh-enter">
            <StructureCard structure={structure} />
          </div>
        ) : null}

        {/* 6 — two secondary actions */}
        {openingComplete ? (
          <div className="refresh-enter" style={{ display: "flex", gap: 8 }}>
            <SecondaryButton
              disabled={!earnings || earnings.reactions.length === 0}
              onClick={() =>
                earningsRef.current?.scrollIntoView({
                  behavior: prefersReducedMotion() ? "auto" : "smooth",
                  block: "center",
                })
              }
            >
              Earnings history
            </SecondaryButton>
            <SecondaryButton
              disabled={chain.length === 0}
              pressed={chainOpen}
              onClick={() => setChainOpen((v) => !v)}
            >
              Full chain
            </SecondaryButton>
          </div>
        ) : null}

        {chainOpen && chain.length > 0 ? <ChainList chain={chain} /> : null}

        {/* 7 — earnings history */}
        {earnings && earnings.reactions.length > 0 ? (
          <div
            ref={earningsRef}
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--hairline)",
              borderRadius: 18,
              padding: "15px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 11,
              scrollMarginTop: 76,
            }}
          >
            <Eyebrow>{`LAST ${earnings.total} EARNINGS · MOVE vs IMPLIED`}</Eyebrow>
            <BarSeries
              bars={earningsBars}
              height={46}
              gap={6}
              radius={3}
              aria-label={`Last ${earnings.total} earnings reactions`}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <SummaryStat label="AVG MOVE" value={earnings.avgMovePct} />
              <SummaryStat label="IMPLIED" value={earnings.impliedMovePct} />
              <Mono>{`${earnings.upCount} / ${earnings.total} UP`}</Mono>
            </div>
          </div>
        ) : null}

        {/* Follow-ups append below, each scrolled to its own top edge. */}
        {thread.slice(1).map((entry, i) => (
          <FollowUp
            key={entry.id}
            entry={entry}
            innerRef={i === thread.length - 2 ? latestRef : undefined}
          />
        ))}
      </div>

      {/* 8 — docked composer: above the tab bar, outside the scroll flow */}
      <form
        onSubmit={submit}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          // The tab bar is 60px tall and does not pad the home indicator itself.
          bottom: "calc(60px + env(safe-area-inset-bottom))",
          zIndex: 40,
          padding: "10px var(--gutter) 12px",
          background: "var(--chrome)",
          borderTop: "1px solid var(--hairline-soft)",
        }}
      >
        <div
          style={{
            maxWidth: 672,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--surface-1)",
            border: "1px solid var(--hairline-strong)",
            borderRadius: 22,
            padding: "11px 12px 11px 16px",
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`Ask about ${symbol}…`}
            aria-label={`Ask about ${symbol}`}
            enterKeyHint="send"
            style={{
              flex: 1,
              minWidth: 0,
              height: 34,
              background: "none",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={asking || question.trim().length === 0}
            className="refresh-pressable"
            style={{
              width: 44,
              height: 44,
              // The 34px circle is the visual; the 44pt box around it is the
              // target. Negative margins keep it from growing the pill.
              margin: "-5px -5px -5px 0",
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              padding: 0,
              opacity: asking || question.trim().length === 0 ? 0.45 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "var(--text-inverse)",
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ↑
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

/** One of the four chart-card stats. An em dash where the input is missing. */
function StripStat({
  label,
  value,
  decimals,
  suffix,
}: {
  label: string;
  value: number | null;
  decimals: number;
  suffix?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <Mono>{label}</Mono>
      {value === null ? (
        <Mono>—</Mono>
      ) : (
        <MonoNumber value={value} size={10} decimals={decimals} suffix={suffix} color="var(--text-dim)" />
      )}
    </span>
  );
}

function SummaryStat({ label, value }: { label: string; value: number | null }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
      <Mono>{label}</Mono>
      {value === null ? (
        <Mono>—</Mono>
      ) : (
        <MonoNumber value={value} size={10} decimals={1} suffix="%" color="var(--text-dim)" />
      )}
    </span>
  );
}

/**
 * The emphasis card the answer streams into. It owns its own reveal so the
 * per-frame render stays inside this card.
 */
function AnswerCard({ entry, onComplete }: { entry: ThreadEntry | null; onComplete?: () => void }) {
  const reveal = useReveal(entry?.answer?.answer ?? null);
  const pending = !!entry && !entry.answer && !entry.error;
  const quiet = !entry || pending || !!entry.error;

  useEffect(() => {
    if (reveal.complete) onComplete?.();
  }, [reveal.complete, onComplete]);

  return (
    <div
      style={{
        background: "var(--gradient-emphasis)",
        border: "1px solid var(--hairline-strong)",
        borderRadius: 18,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <p
        aria-live="polite"
        style={{
          margin: 0,
          fontSize: 14,
          lineHeight: 1.6,
          color: quiet ? "var(--text-dim)" : "var(--text-body)",
          // The card grows downward as the answer fills in; a floor keeps the
          // first character from arriving into a collapsed box.
          minHeight: 45,
        }}
      >
        {entry?.error ?? (pending || !entry ? "Reading the chain…" : reveal.shown)}
      </p>

      {reveal.complete && (entry?.answer?.bull || entry?.answer?.bear) ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {entry?.answer?.bull ? <Clause tone="up">{`Bull · ${entry.answer.bull}`}</Clause> : null}
          {entry?.answer?.bear ? <Clause tone="down">{`Bear · ${entry.answer.bear}`}</Clause> : null}
        </div>
      ) : null}
    </div>
  );
}

function Clause({ tone, children }: { tone: "up" | "down"; children: React.ReactNode }) {
  return (
    <span
      style={{
        padding: "6px 11px",
        borderRadius: 9,
        fontSize: 12,
        background: tone === "up" ? "var(--up-bg)" : "var(--down-bg)",
        color: tone === "up" ? "var(--up)" : "var(--down)",
      }}
    >
      {children}
    </span>
  );
}

/**
 * The point of the screen: one contract, sized to the account.
 *
 * `FITS YOUR CAPITAL` only appears when the account's cash is actually known.
 * With no brokerage link the scan runs against a default, and the label would
 * be a claim we cannot make.
 */
function StructureCard({ structure }: { structure: ResearchStructure | null }) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--accent-border-soft)",
        borderRadius: 18,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 11,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <Eyebrow color="var(--accent)">SUGGESTED STRUCTURE</Eyebrow>
        {structure?.fitsCapital ? <Mono size={11}>FITS YOUR CAPITAL</Mono> : null}
      </div>

      {structure ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: monoFont,
                fontVariantNumeric: "tabular-nums",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              {`${structure.strategy} · ${structure.strike}P · ${formatExpiry(structure.expiry)}`}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>
              {`${structure.dte} DTE · ${structure.delta.toFixed(2)}Δ · ${formatCollateral(
                structure.collateral
              )} collateral`}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <MonoNumber value={structure.monthlyRoc} size={20} weight={600} decimals={1} suffix="%" color="var(--up)" />
            <div>
              <Mono>MO. ROC</Mono>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
          No put on this chain clears the scanner right now.
        </div>
      )}
    </div>
  );
}

/** `Full chain` — every contract the scan returned, not just the pick. */
function ChainList({ chain }: { chain: ResearchStructure[] }) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--hairline)",
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      {chain.map((c, i) => (
        <div
          key={`${c.expiry}-${c.strike}`}
          className="refresh-enter"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderTop: i === 0 ? undefined : "1px solid var(--hairline-soft)",
            ["--refresh-i" as string]: i,
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: monoFont,
              fontVariantNumeric: "tabular-nums",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {`${c.strike}P · ${formatExpiry(c.expiry)}`}
          </span>
          <Mono size={11}>{`${c.dte} DTE`}</Mono>
          <Mono size={11}>{`${c.delta.toFixed(2)}Δ`}</Mono>
          <MonoNumber value={c.monthlyRoc} size={13} weight={600} decimals={1} suffix="%" color="var(--up)" />
        </div>
      ))}
    </div>
  );
}

function FollowUp({
  entry,
  innerRef,
}: {
  entry: ThreadEntry;
  innerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={innerRef} style={{ display: "flex", flexDirection: "column", gap: 8, scrollMarginTop: 76 }}>
      <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{entry.question}</div>
      <AnswerCard entry={entry} />
    </div>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
  pressed,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className="refresh-pressable"
      style={{
        flex: 1,
        padding: "13px 0",
        borderRadius: 13,
        border: `1px solid ${pressed ? "var(--accent-border-soft)" : "transparent"}`,
        background: "var(--control)",
        color: "var(--text-primary)",
        fontSize: 14,
        fontWeight: 500,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}
