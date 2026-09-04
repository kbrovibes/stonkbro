"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AIModelBadge } from "@/components/AIModelBadge";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";

// ---------------------------------------------------------------------------
// Response shape — mirrors GET /api/desk. Kept structural rather than imported
// so a server-side type change cannot silently blank the page.
// ---------------------------------------------------------------------------

type Regime = "RISK_ON" | "NEUTRAL" | "RISK_OFF" | "VOLATILE";

type RegimeSignal = { label: string; value: string; contribution: number; note: string };

type RegimeReading = {
  regime: Regime;
  score: number;
  asOf: string;
  signals: RegimeSignal[];
  volatility: { source: "vix" | "realized"; level: number };
  breadthPct: number;
  recommended: { minDelta: number; maxDelta: number; minDTE: number; maxDTE: number; minAROC: number; stance: string };
};

type Evidence = { side: "bull" | "bear"; code: string; label: string; weight: number; detail: string };

type Rating = "BUY" | "OVERWEIGHT" | "HOLD" | "UNDERWEIGHT" | "SELL";

type DebateLedger = {
  symbol: string;
  bull: Evidence[];
  bear: Evidence[];
  bullScore: number;
  bearScore: number;
  net: number;
  rating: Rating;
  confidence: "high" | "medium" | "low";
  insufficientEvidence: boolean;
};

type DebateNarration = { symbol: string; bullCase: string; bearCase: string; verdict: string };

type NewsSentiment = {
  symbol: string;
  score: number;
  materiality: "high" | "medium" | "low";
  oneLine: string;
  headlineCount: number;
  keywordFlags: string[];
  source: "llm" | "keyword";
};

type RiskVerdict = "APPROVE" | "SIZE_DOWN" | "REJECT";

type CandidateRisk = {
  symbol: string;
  strike: number;
  expiry: string;
  verdict: RiskVerdict;
  maxContracts: number;
  requestedContracts: number;
  reasons: string[];
  flags: string[];
};

type DeskCandidate = {
  symbol: string;
  name: string;
  strike: number;
  expiry: string;
  dte: number;
  mid: number;
  delta: number;
  iv: number;
  aroc: number;
  currentPrice: number;
  distanceFromPrice: number;
  collateralRequired: number;
  juiciness: number;
  catalyst?: string;
  risk?: string;
  ledger: DebateLedger;
  narration?: DebateNarration;
  news?: NewsSentiment;
  riskVerdict?: CandidateRisk;
};

type PortfolioRisk = {
  totalCollateralIfAllAssigned: number;
  approvedCollateral: number;
  capital: number;
  assignmentCapacityPct: number;
  sectorExposure: { sector: string; pct: number; symbols: string[] }[];
  correlatedClusters: { name: string; symbols: string[]; pct: number }[];
  earningsClusters: { week: string; symbols: string[] }[];
  worstCase: { drawdownPct: number; note: string };
  verdicts: CandidateRisk[];
  summary: string;
};

/** Only the fields this page reads — the lessons module is still growing. */
type LessonBucket = { label: string; n: number; winRate: number | null; insufficient: boolean };

type Lessons = {
  totalResolved: number;
  since: string | null;
  overall: { n: number; winRate: number | null };
  byDelta?: LessonBucket[];
  byDte?: LessonBucket[];
  byEarnings?: LessonBucket[];
  byConviction?: LessonBucket[];
};

type DeskResponse = {
  regime: RegimeReading;
  candidates: DeskCandidate[];
  risk: PortfolioRisk;
  lessons: Lessons;
  lessonsBlock: string;
  generatedAt: string;
  aiUsed: boolean;
  holdingsIncluded: boolean;
  tokens: { input: number; output: number; calls: number };
  errors: string[];
  cached?: boolean;
};

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

const CHIP_POSITIVE = "bg-emerald-100 dark:bg-gain-bg text-emerald-700 dark:text-gain-strong";
const CHIP_INFO = "bg-sky-100 dark:bg-accent-bg text-sky-700 dark:text-accent-hover";
const CHIP_MUTED = "bg-stone-200 dark:bg-surface-muted text-stone-600 dark:text-text-subtle";
const CHIP_WARN = "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300";
const CHIP_NEGATIVE = "bg-red-100 dark:bg-loss-bg text-red-700 dark:text-loss-strong";

const REGIME_STYLE: Record<Regime, { label: string; card: string; accent: string; chip: string }> = {
  RISK_ON: {
    label: "Risk on",
    card: "bg-emerald-50 dark:bg-gain-bg border-emerald-200 dark:border-gain-border",
    accent: "text-emerald-700 dark:text-gain-strong",
    chip: CHIP_POSITIVE,
  },
  NEUTRAL: {
    label: "Neutral",
    card: "bg-stone-50 dark:bg-surface border-stone-200 dark:border-border-default",
    accent: "text-stone-700 dark:text-text",
    chip: CHIP_MUTED,
  },
  RISK_OFF: {
    label: "Risk off",
    card: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50",
    accent: "text-amber-700 dark:text-amber-300",
    chip: CHIP_WARN,
  },
  VOLATILE: {
    label: "Volatile",
    card: "bg-red-50 dark:bg-loss-bg border-red-200 dark:border-loss-border",
    accent: "text-red-700 dark:text-loss-strong",
    chip: CHIP_NEGATIVE,
  },
};

const RATING_STYLE: Record<Rating, string> = {
  BUY: CHIP_POSITIVE,
  OVERWEIGHT: CHIP_POSITIVE,
  HOLD: CHIP_MUTED,
  UNDERWEIGHT: CHIP_WARN,
  SELL: CHIP_NEGATIVE,
};

const VERDICT_STYLE: Record<RiskVerdict, { label: string; chip: string }> = {
  APPROVE: { label: "APPROVE", chip: CHIP_POSITIVE },
  SIZE_DOWN: { label: "SIZE DOWN", chip: CHIP_WARN },
  REJECT: { label: "REJECT", chip: CHIP_NEGATIVE },
};

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-1.5 py-px rounded font-bold text-[9px] tracking-wide ${className}`}>
      {children}
    </span>
  );
}

function money(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function expiryLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function RegimeBanner({ regime }: { regime: RegimeReading }) {
  const [open, setOpen] = useState(false);
  const style = REGIME_STYLE[regime.regime] ?? REGIME_STYLE.NEUTRAL;

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${style.card}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className={`text-sm font-bold truncate ${style.accent}`}>{style.label}</h2>
          <Chip className={style.chip}>{regime.score >= 0 ? `+${regime.score}` : regime.score}</Chip>
        </div>
        <span className="text-[10px] text-stone-500 dark:text-text-subtle shrink-0">
          {regime.volatility.source === "vix"
            ? `VIX ${regime.volatility.level}`
            : `${regime.volatility.level}% realized`}
          {" · "}
          {regime.breadthPct}% breadth
        </span>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-stone-700 dark:text-text-subtle">
        {regime.recommended.stance}
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-1.5 text-[10px] font-semibold text-stone-500 dark:text-text-faint hover:text-stone-700 transition"
      >
        {open ? "Hide signals" : `${regime.signals.length} signals ▾`}
      </button>

      {open && (
        <ul className="mt-1.5 space-y-1.5">
          {regime.signals.map((s) => (
            <li key={s.label} className="text-[11px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-stone-800 dark:text-text">{s.label}</span>
                <span
                  className={`font-bold tabular-nums shrink-0 ${
                    s.contribution > 0
                      ? "text-emerald-600 dark:text-gain"
                      : s.contribution < 0
                        ? "text-red-600 dark:text-loss"
                        : "text-stone-400 dark:text-text-faint"
                  }`}
                >
                  {s.contribution > 0 ? "+" : ""}
                  {s.contribution}
                </span>
              </div>
              <div className="text-stone-600 dark:text-text-subtle">{s.value}</div>
              <div className="text-[10px] text-stone-400 dark:text-text-faint leading-snug">{s.note}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TrackRecord({ lessons }: { lessons: Lessons }) {
  const overall = lessons.overall;

  // The buckets that actually change a decision: where you set the strike, how
  // long you hold it, and whether you sold through an earnings report.
  const buckets = [
    ...(lessons.byDelta ?? []),
    ...(lessons.byEarnings ?? []),
    ...(lessons.byDte ?? []),
  ]
    .filter((b) => !b.insufficient && b.winRate !== null)
    .slice(0, 3);

  if (lessons.totalResolved === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default px-3 py-2.5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
          Track record
        </h3>
        <p className="mt-1 text-[11px] text-stone-500 dark:text-text-subtle">
          No trades have resolved yet, so there is nothing to grade these picks against.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
          Track record
        </h3>
        <span className="text-[10px] text-stone-400 dark:text-text-faint">
          {lessons.totalResolved} resolved{lessons.since ? ` since ${expiryLabel(lessons.since)}` : ""}
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-bold text-stone-900 dark:text-text tabular-nums">
          {overall.winRate === null ? "—" : `${Math.round(overall.winRate)}%`}
        </span>
        <span className="text-[11px] text-stone-500 dark:text-text-subtle">
          win rate across {overall.n} graded trade{overall.n === 1 ? "" : "s"}
        </span>
      </div>

      {buckets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {buckets.map((b) => (
            <span
              key={b.label}
              className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-surface text-[10px] text-stone-600 dark:text-text-subtle"
            >
              <span className="font-semibold text-stone-800 dark:text-text">{b.label}</span>{" "}
              {b.winRate === null ? "—" : `${Math.round(b.winRate)}%`} (n={b.n})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceColumn({ items, side }: { items: Evidence[]; side: "bull" | "bear" }) {
  const tone =
    side === "bull"
      ? "text-emerald-700 dark:text-gain-strong"
      : "text-red-700 dark:text-loss-strong";
  const dot = side === "bull" ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="min-w-0">
      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${tone}`}>
        {side === "bull" ? "Bull case" : "Bear case"}
      </h4>
      {items.length === 0 ? (
        <p className="mt-1 text-[10px] text-stone-400 dark:text-text-faint">Nothing on this side.</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {items.map((e) => (
            <li key={e.code} className="flex gap-1.5">
              <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${dot}`} />
              <div className="min-w-0">
                <div className="text-[11px] leading-snug text-stone-800 dark:text-text">
                  {e.label}
                  <span className="ml-1 text-[9px] font-bold text-stone-400 dark:text-text-faint tabular-nums">
                    {e.weight}
                  </span>
                </div>
                <div className="text-[10px] text-stone-500 dark:text-text-subtle leading-snug">{e.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CandidateCard({ c }: { c: DeskCandidate }) {
  const [open, setOpen] = useState(false);
  const verdict = c.riskVerdict;
  const rejected = verdict?.verdict === "REJECT";
  const news = c.news;

  return (
    <div
      className={`rounded-xl border overflow-hidden transition ${
        rejected
          ? "bg-stone-50 dark:bg-surface border-stone-200 dark:border-border-default opacity-60"
          : "bg-white dark:bg-surface-elevated border-stone-200 dark:border-border-default"
      }`}
    >
      <button onClick={() => setOpen((v) => !v)} className="w-full px-3 py-2.5 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-sm font-bold text-stone-900 dark:text-text">{c.symbol}</span>
            <span className="text-[11px] text-stone-500 dark:text-text-subtle truncate">
              ${c.strike} put · {expiryLabel(c.expiry)} · {c.dte}d
            </span>
          </div>
          <span className="text-sm font-bold text-emerald-600 dark:text-gain tabular-nums shrink-0">
            {Math.round(c.aroc)}%
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1 flex-wrap">
          <Chip className={RATING_STYLE[c.ledger.rating]}>{c.ledger.rating}</Chip>
          {verdict && (
            <Chip className={VERDICT_STYLE[verdict.verdict].chip}>
              {VERDICT_STYLE[verdict.verdict].label}
              {verdict.verdict !== "REJECT" && ` ${verdict.maxContracts}/${verdict.requestedContracts}`}
            </Chip>
          )}
          {news && news.headlineCount > 0 && (
            <Chip className={news.score > 0 ? CHIP_POSITIVE : news.score < 0 ? CHIP_NEGATIVE : CHIP_INFO}>
              NEWS {news.score > 0 ? "+" : ""}
              {news.score}
            </Chip>
          )}
          <span className="ml-auto text-[10px] text-stone-400 dark:text-text-faint tabular-nums">
            Δ {Math.abs(c.delta).toFixed(2)} · {c.distanceFromPrice.toFixed(1)}% OTM
          </span>
        </div>

        {verdict && verdict.reasons.length > 0 && (
          <p className="mt-1 text-[11px] leading-snug text-stone-600 dark:text-text-subtle line-clamp-2">
            {verdict.reasons[0]}
          </p>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-stone-100 dark:border-border-default pt-2.5 space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-stone-500 dark:text-text-subtle">
            <span>Bull {c.ledger.bullScore}</span>
            <span className="text-stone-300 dark:text-text-faint">vs</span>
            <span>Bear {c.ledger.bearScore}</span>
            <span className="text-stone-300 dark:text-text-faint">·</span>
            <span>{c.ledger.confidence} confidence</span>
            {c.ledger.insufficientEvidence && (
              <Chip className={CHIP_MUTED}>THIN EVIDENCE</Chip>
            )}
          </div>

          {/* The debate, side by side — the whole point of the page. */}
          <div className="grid grid-cols-2 gap-3">
            <EvidenceColumn items={c.ledger.bull} side="bull" />
            <EvidenceColumn items={c.ledger.bear} side="bear" />
          </div>

          {c.narration && (
            <div className="rounded-lg bg-stone-50 dark:bg-surface px-2.5 py-2 space-y-1.5">
              {c.narration.bullCase && (
                <p className="text-[11px] leading-relaxed text-stone-700 dark:text-text-subtle">
                  <span className="font-bold text-emerald-700 dark:text-gain-strong">Bull. </span>
                  {c.narration.bullCase}
                </p>
              )}
              {c.narration.bearCase && (
                <p className="text-[11px] leading-relaxed text-stone-700 dark:text-text-subtle">
                  <span className="font-bold text-red-700 dark:text-loss-strong">Bear. </span>
                  {c.narration.bearCase}
                </p>
              )}
              {c.narration.verdict && (
                <p className="text-[11px] leading-relaxed font-semibold text-stone-900 dark:text-text">
                  {c.narration.verdict}
                </p>
              )}
            </div>
          )}

          {news && news.headlineCount > 0 && (
            <p className="text-[11px] leading-snug text-stone-600 dark:text-text-subtle">
              <span className="font-semibold text-stone-800 dark:text-text">News. </span>
              {news.oneLine}{" "}
              <span className="text-[10px] text-stone-400 dark:text-text-faint">
                ({news.headlineCount} headlines, {news.materiality} materiality)
              </span>
            </p>
          )}

          {verdict && verdict.reasons.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
                Risk desk
              </h4>
              <ul className="mt-1 space-y-1">
                {verdict.reasons.map((r, i) => (
                  <li key={i} className="text-[11px] leading-snug text-stone-600 dark:text-text-subtle">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-[10px] text-stone-500 dark:text-text-subtle">
            <div>
              <div className="text-stone-400 dark:text-text-faint uppercase tracking-wider text-[9px]">Premium</div>
              <div className="font-semibold text-stone-800 dark:text-text tabular-nums">
                ${(c.mid * 100).toFixed(0)}/contract
              </div>
            </div>
            <div>
              <div className="text-stone-400 dark:text-text-faint uppercase tracking-wider text-[9px]">Collateral</div>
              <div className="font-semibold text-stone-800 dark:text-text tabular-nums">
                {money(c.collateralRequired)}
              </div>
            </div>
            <div>
              <div className="text-stone-400 dark:text-text-faint uppercase tracking-wider text-[9px]">Spot</div>
              <div className="font-semibold text-stone-800 dark:text-text tabular-nums">
                ${c.currentPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskPanel({ risk, holdingsIncluded }: { risk: PortfolioRisk; holdingsIncluded: boolean }) {
  const over = risk.assignmentCapacityPct > 100;

  return (
    <div className="rounded-xl bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default px-3 py-2.5 space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
        Portfolio risk
      </h3>

      <p className="text-[12px] leading-relaxed text-stone-700 dark:text-text-subtle">{risk.summary}</p>

      {holdingsIncluded ? (
        <p className="text-[10px] text-stone-400 dark:text-text-faint">
          Sized against the positions you already hold.
        </p>
      ) : (
        <Link
          href="/login"
          className="block rounded-lg bg-sky-50 dark:bg-accent-bg border border-sky-200 dark:border-accent-border px-2.5 py-2"
        >
          <span className="text-[11px] font-semibold text-sky-700 dark:text-accent-hover">
            Sign in to factor in your actual positions →
          </span>
          <span className="block mt-0.5 text-[10px] text-sky-600/80 dark:text-accent-hover/70 leading-snug">
            Right now these limits assume you are starting from cash. With your brokerage connected, a name you
            already own eats into its own budget before a new put is allowed.
          </span>
        </Link>
      )}

      <div
        className={`rounded-lg px-2.5 py-2 ${
          over
            ? "bg-red-50 dark:bg-loss-bg border border-red-200 dark:border-loss-border"
            : "bg-stone-50 dark:bg-surface"
        }`}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-text-subtle">
            If everything assigns
          </span>
          <span
            className={`text-lg font-bold tabular-nums ${
              over ? "text-red-700 dark:text-loss-strong" : "text-stone-900 dark:text-text"
            }`}
          >
            {risk.assignmentCapacityPct}%
          </span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-stone-200 dark:bg-surface-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, risk.assignmentCapacityPct)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-stone-500 dark:text-text-subtle">
          {money(risk.totalCollateralIfAllAssigned)} needed against {money(risk.capital)} of capital ·{" "}
          {money(risk.approvedCollateral)} approved.
        </p>
      </div>

      {risk.sectorExposure.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
            Sector exposure
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {risk.sectorExposure.map((s) => (
              <li key={s.sector}>
                <div className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="text-stone-700 dark:text-text truncate">{s.sector}</span>
                  <span className="font-semibold tabular-nums text-stone-600 dark:text-text-subtle shrink-0">
                    {s.pct}%
                  </span>
                </div>
                <div className="mt-0.5 h-1 rounded-full bg-stone-200 dark:bg-surface-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500"
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
                <div className="text-[10px] text-stone-400 dark:text-text-faint">{s.symbols.join(", ")}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {risk.correlatedClusters.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
            Names that move together
          </h4>
          <ul className="mt-1.5 space-y-1">
            {risk.correlatedClusters.map((c) => (
              <li key={c.name} className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="text-stone-700 dark:text-text min-w-0">
                  <span className="font-semibold">{c.name}</span>{" "}
                  <span className="text-stone-400 dark:text-text-faint">{c.symbols.join(", ")}</span>
                </span>
                <span className="font-semibold tabular-nums text-stone-600 dark:text-text-subtle shrink-0">
                  {c.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {risk.earningsClusters.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
            Earnings pile-ups
          </h4>
          <ul className="mt-1 space-y-0.5">
            {risk.earningsClusters.map((e) => (
              <li key={e.week} className="text-[11px] text-stone-600 dark:text-text-subtle">
                <span className="font-semibold text-stone-800 dark:text-text">{e.week}</span>{" "}
                {e.symbols.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-stone-500 dark:text-text-subtle">{risk.worstCase.note}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const VERDICT_ORDER: Record<RiskVerdict, number> = { APPROVE: 0, SIZE_DOWN: 1, REJECT: 2 };

export default function DeskView() {
  const [data, setData] = useState<DeskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);

  const load = useCallback(async (ai: boolean, force = false) => {
    const url = ai ? "/api/desk" : "/api/desk?ai=0";
    setLoading(true);
    setError(null);
    try {
      if (force) invalidateCache(url);
      const res = await cachedFetchJson<DeskResponse>(url, { ttlMs: 10 * 60_000 });
      setData(res);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(useAI);
  }, [load, useAI]);

  const candidates = [...(data?.candidates ?? [])].sort((a, b) => {
    const av = VERDICT_ORDER[a.riskVerdict?.verdict ?? "APPROVE"];
    const bv = VERDICT_ORDER[b.riskVerdict?.verdict ?? "APPROVE"];
    if (av !== bv) return av - bv;
    return b.juiciness - a.juiciness;
  });

  return (
    <div className="flex flex-col flex-1">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-surface-elevated/90 backdrop-blur border-b border-stone-200 dark:border-border-default">
        <div className="px-3 py-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold text-stone-900 dark:text-text truncate">Trading Desk</h1>
            {data?.aiUsed && <AIModelBadge />}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setUseAI((v) => !v)}
              className={`px-2 py-1 rounded-md text-[10px] font-semibold transition ${
                useAI ? CHIP_INFO : CHIP_MUTED
              }`}
              title="Turn the AI narration layer on or off. Everything else is computed without it."
            >
              AI {useAI ? "on" : "off"}
            </button>
            <button
              onClick={() => load(useAI, true)}
              disabled={loading}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-300 text-white text-[11px] font-semibold rounded-md transition"
            >
              {loading ? "Running..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 px-4 text-center">
          <p className="text-stone-400 dark:text-text-faint text-sm animate-pulse">
            Reading the market, scanning, and grading the debate...
          </p>
          <p className="mt-1 text-[11px] text-stone-400 dark:text-text-faint">This takes a minute on a cold run.</p>
        </div>
      )}

      {error && !data && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 px-4">
          <p className="text-red-600 dark:text-loss text-sm">Could not load the desk.</p>
          <p className="mt-1 text-[11px] text-stone-400 dark:text-text-faint text-center">{error}</p>
        </div>
      )}

      {data && (
        <div className="px-3 py-3 space-y-3">
          <RegimeBanner regime={data.regime} />
          <TrackRecord lessons={data.lessons} />

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-text-faint">
                Candidates ({candidates.length})
              </h3>
              <span className="text-[10px] text-stone-400 dark:text-text-faint">
                {data.aiUsed ? `${data.tokens.calls} AI call${data.tokens.calls === 1 ? "" : "s"}` : "no AI calls"}
                {data.cached ? " · cached" : ""}
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="rounded-xl bg-white dark:bg-surface-elevated border border-stone-200 dark:border-border-default px-3 py-6 text-center">
                <p className="text-[12px] text-stone-500 dark:text-text-subtle">
                  Nothing cleared the bar this run. In this market the desk demands at least{" "}
                  {data.regime.recommended.minAROC}% annualized at deltas of{" "}
                  {data.regime.recommended.minDelta.toFixed(2)}-{data.regime.recommended.maxDelta.toFixed(2)}.
                </p>
              </div>
            ) : (
              candidates.map((c) => <CandidateCard key={`${c.symbol}-${c.strike}-${c.expiry}`} c={c} />)
            )}
          </div>

          <RiskPanel risk={data.risk} holdingsIncluded={data.holdingsIncluded} />

          {data.errors.length > 0 && (
            <details className="rounded-xl bg-stone-50 dark:bg-surface border border-stone-200 dark:border-border-default px-3 py-2">
              <summary className="text-[10px] font-semibold text-stone-400 dark:text-text-faint cursor-pointer">
                {data.errors.length} data issue{data.errors.length === 1 ? "" : "s"} this run
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {data.errors.map((e, i) => (
                  <li key={i} className="text-[10px] text-stone-500 dark:text-text-subtle break-words">
                    {e}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <p className="text-[10px] text-stone-400 dark:text-text-faint text-center">
            Generated {new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
