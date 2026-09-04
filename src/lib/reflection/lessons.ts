/**
 * Deterministic aggregation over graded decisions.
 *
 * `formatLessonsBlock` is the payload other engines inject into prompts: a
 * compact, factual record of how our own recommendations actually performed.
 */

import {
  DecisionOutcome,
  DecisionStrategy,
  TradeDecisionRow,
  getResolvedDecisions,
} from "@/lib/db/trade-decisions";

const MIN_BUCKET_N = 5;
const MIN_SYMBOL_N = 3;
const WARN_GAP_PCT = 10;
const DEFAULT_FOCUS_LIMIT = 4;
const PREMIUM_SELLING: DecisionStrategy[] = ["CSP", "CC"];

export type LessonBucket = {
  label: string;
  n: number;
  winRate: number | null;
  /** Mean realized_period_pct — expected value per trade. Win rate alone is misleading without it. */
  expectancy: number | null;
  /** Average period return among losses only — the "when it goes wrong" number. */
  avgLossPct: number | null;
  /** What we advertised, expressed over the actual holding period. */
  avgProjectedPeriodPct: number | null;
  /** Annualized, wins only. Never blended with losses. */
  avgWinAroc: number | null;
  avgAlphaVsHold: number | null;
  avgHoldingDays: number | null;
  insufficient: boolean;
};

/** One prior decision on the focus ticker, newest first. */
export type FocusEntry = {
  decidedAt: string;
  expiry: string | null;
  strike: number | null;
  dte: number | null;
  delta: number | null;
  conviction: string | null;
  outcome: DecisionOutcome;
  realizedPeriodPct: number | null;
  alphaVsHold: number | null;
};

export type LessonsOptions = {
  /** Only count decisions that had resolved by this instant — blocks lookahead bias. */
  asOf?: Date;
  /** Ticker to build a per-ticker history section for. */
  symbol?: string;
  strategies?: DecisionStrategy[];
  focusLimit?: number;
};

export type Lessons = {
  generatedAt: string;
  scope: DecisionStrategy[];
  asOf: string | null;
  /** Distinct contracts. Every statistic below is computed over these. */
  uniqueContracts: number;
  /** Raw resolved rows before dedupe — the same contract re-surfaced across scans. */
  totalRows: number;
  /** Alias of uniqueContracts, kept as the headline count. */
  totalResolved: number;
  since: string | null;
  overall: {
    n: number;
    winRate: number | null;
    expectancy: number | null;
    avgLossPct: number | null;
    avgHoldingDays: number | null;
    breachedRecoveredRate: number | null;
  };
  /** Are we systematically over-promising? Both sides on a period basis. */
  projectionHonesty:
    | { projectedPeriodPct: number; realizedPeriodPct: number; gapPp: number; n: number }
    | null;
  /** Was selling the put better than just owning the shares? */
  vsHold: { n: number; beatRate: number; avgAlpha: number } | null;
  focusSymbol: string | null;
  focusStats: LessonBucket | null;
  focusHistory: FocusEntry[];
  byDelta: LessonBucket[];
  byDte: LessonBucket[];
  byEarnings: LessonBucket[];
  byConviction: LessonBucket[];
  byJuiciness: LessonBucket[];
  bySymbol: LessonBucket[];
  bestSymbols: LessonBucket[];
  worstSymbols: LessonBucket[];
};

const WINS = new Set(["expired_worthless", "breached_recovered", "itm"]);
const LOSSES = new Set(["assigned", "expired_otm"]);

/**
 * One row per contract, not per sighting.
 *
 * A contract is re-surfaced on every scan it still qualifies for, so raw rows
 * weight each opportunity by how often it happened to get re-scanned — and
 * persisting on the list correlates with the setup holding up, which is not a
 * neutral bias. Keeps the earliest sighting: that is the decision point, and it
 * is the only choice that cannot see forward.
 */
export function dedupeContracts(rows: TradeDecisionRow[]): TradeDecisionRow[] {
  const earliest = new Map<string, TradeDecisionRow>();
  for (const r of rows) {
    const key = `${r.strategy}|${r.symbol}|${r.strike ?? ""}|${r.expiry ?? ""}`;
    const prev = earliest.get(key);
    if (!prev || r.decided_at < prev.decided_at) earliest.set(key, r);
  }
  return [...earliest.values()];
}

function isGraded(row: TradeDecisionRow): boolean {
  return !!row.outcome && (WINS.has(row.outcome) || LOSSES.has(row.outcome));
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const nums = (rows: TradeDecisionRow[], pick: (r: TradeDecisionRow) => number | null): number[] =>
  rows.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v));

function summarize(label: string, rows: TradeDecisionRow[], minN = MIN_BUCKET_N): LessonBucket {
  const n = rows.length;
  const wins = rows.filter((r) => WINS.has(r.outcome!));
  const losses = rows.filter((r) => LOSSES.has(r.outcome!));
  return {
    label,
    n,
    winRate: n > 0 ? (wins.length / n) * 100 : null,
    expectancy: mean(nums(rows, (r) => r.realized_period_pct)),
    avgLossPct: mean(nums(losses, (r) => r.realized_period_pct)),
    avgProjectedPeriodPct: mean(
      nums(rows, (r) => (r.aroc !== null && r.dte ? (r.aroc * r.dte) / 365 : null))
    ),
    avgWinAroc: mean(nums(wins, (r) => r.realized_aroc)),
    avgAlphaVsHold: mean(nums(rows, (r) => r.alpha_vs_hold)),
    avgHoldingDays: mean(nums(rows, (r) => r.dte)),
    insufficient: n < minN,
  };
}

function bucketBy(
  rows: TradeDecisionRow[],
  bands: Array<{ label: string; test: (r: TradeDecisionRow) => boolean }>
): LessonBucket[] {
  return bands.map((b) => summarize(b.label, rows.filter(b.test)));
}

function quintileBuckets(rows: TradeDecisionRow[]): LessonBucket[] {
  const withJ = rows.filter((r) => typeof r.juiciness === "number");
  if (withJ.length < MIN_BUCKET_N * 5) return [];

  const sorted = [...withJ].sort((a, b) => (a.juiciness ?? 0) - (b.juiciness ?? 0));
  const size = sorted.length / 5;
  const out: LessonBucket[] = [];
  for (let q = 0; q < 5; q++) {
    const slice = sorted.slice(Math.floor(q * size), Math.floor((q + 1) * size));
    if (slice.length === 0) continue;
    const lo = Math.round(slice[0].juiciness ?? 0);
    const hi = Math.round(slice[slice.length - 1].juiciness ?? 0);
    out.push(summarize(`Q${q + 1} ${lo}-${hi}`, slice));
  }
  return out;
}

export function computeLessonsFromRows(
  rows: TradeDecisionRow[],
  opts: LessonsOptions = {}
): Lessons {
  const scope = opts.strategies ?? PREMIUM_SELLING;
  const asOfMs = opts.asOf ? opts.asOf.getTime() : null;

  // asOf first, so a replay dedupes to the earliest surfacing that is still
  // inside the as-of window rather than one it could not have seen.
  const sightings = rows.filter((r) => {
    if (!scope.includes(r.strategy) || !isGraded(r)) return false;
    if (asOfMs === null) return true;
    // No resolved_at means we cannot prove it had resolved by asOf — exclude it.
    return !!r.resolved_at && new Date(r.resolved_at).getTime() <= asOfMs;
  });

  const graded = dedupeContracts(sightings);

  const since =
    graded.length > 0
      ? graded.map((r) => r.decided_at).sort()[0].slice(0, 10)
      : null;

  const breached = graded.filter((r) => r.outcome === "breached_recovered").length;

  const bySymbolMap = new Map<string, TradeDecisionRow[]>();
  for (const r of graded) {
    const list = bySymbolMap.get(r.symbol);
    if (list) list.push(r);
    else bySymbolMap.set(r.symbol, [r]);
  }
  const bySymbol = [...bySymbolMap.entries()]
    .map(([symbol, srows]) => summarize(symbol, srows, MIN_SYMBOL_N))
    .filter((b) => b.n >= MIN_SYMBOL_N)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));

  const reportableSymbols = bySymbol.filter((b) => b.n >= MIN_BUCKET_N);
  const overall = summarize("overall", graded);
  const overallWin = overall.winRate;

  const honestyRows = graded.filter(
    (r) =>
      typeof r.realized_period_pct === "number" &&
      typeof r.aroc === "number" &&
      typeof r.dte === "number" &&
      r.dte > 0
  );
  const projectionHonesty =
    honestyRows.length >= MIN_BUCKET_N
      ? {
          projectedPeriodPct: mean(
            honestyRows.map((r) => ((r.aroc as number) * (r.dte as number)) / 365)
          )!,
          realizedPeriodPct: mean(honestyRows.map((r) => r.realized_period_pct as number))!,
          gapPp: mean(
            honestyRows.map(
              (r) =>
                (r.realized_period_pct as number) -
                ((r.aroc as number) * (r.dte as number)) / 365
            )
          )!,
          n: honestyRows.length,
        }
      : null;

  const alphaRows = graded.filter((r) => typeof r.alpha_vs_hold === "number");
  const vsHold =
    alphaRows.length >= MIN_BUCKET_N
      ? {
          n: alphaRows.length,
          beatRate:
            (alphaRows.filter((r) => (r.alpha_vs_hold as number) > 0).length / alphaRows.length) *
            100,
          avgAlpha: mean(alphaRows.map((r) => r.alpha_vs_hold as number))!,
        }
      : null;

  const focusSymbol = opts.symbol ? opts.symbol.toUpperCase() : null;
  const focusRows = focusSymbol ? bySymbolMap.get(focusSymbol) ?? [] : [];
  const focusHistory: FocusEntry[] = [...focusRows]
    .sort((a, b) => b.decided_at.localeCompare(a.decided_at))
    .slice(0, opts.focusLimit ?? DEFAULT_FOCUS_LIMIT)
    .map((r) => ({
      decidedAt: r.decided_at.slice(0, 10),
      expiry: r.expiry,
      strike: r.strike,
      dte: r.dte,
      delta: r.delta,
      conviction: r.conviction,
      outcome: r.outcome!,
      realizedPeriodPct: r.realized_period_pct,
      alphaVsHold: r.alpha_vs_hold,
    }));

  return {
    generatedAt: new Date().toISOString(),
    scope,
    asOf: opts.asOf ? opts.asOf.toISOString() : null,
    uniqueContracts: graded.length,
    totalRows: sightings.length,
    totalResolved: graded.length,
    since,
    overall: {
      n: graded.length,
      winRate: overall.winRate,
      expectancy: overall.expectancy,
      avgLossPct: overall.avgLossPct,
      avgHoldingDays: overall.avgHoldingDays,
      breachedRecoveredRate: graded.length > 0 ? (breached / graded.length) * 100 : null,
    },
    projectionHonesty,
    vsHold,
    focusSymbol,
    focusStats:
      focusSymbol && focusRows.length > 0
        ? summarize(focusSymbol, focusRows, MIN_SYMBOL_N)
        : null,
    focusHistory,
    byDelta: bucketBy(graded, [
      { label: "<0.15", test: (r) => r.delta !== null && Math.abs(r.delta) < 0.15 },
      { label: "0.15-0.20", test: (r) => r.delta !== null && Math.abs(r.delta) >= 0.15 && Math.abs(r.delta) < 0.2 },
      { label: "0.20-0.25", test: (r) => r.delta !== null && Math.abs(r.delta) >= 0.2 && Math.abs(r.delta) < 0.25 },
      { label: "0.25-0.30", test: (r) => r.delta !== null && Math.abs(r.delta) >= 0.25 && Math.abs(r.delta) < 0.3 },
      { label: ">0.30", test: (r) => r.delta !== null && Math.abs(r.delta) >= 0.3 },
    ]),
    byDte: bucketBy(graded, [
      { label: "<7", test: (r) => r.dte !== null && r.dte < 7 },
      { label: "7-14", test: (r) => r.dte !== null && r.dte >= 7 && r.dte < 14 },
      { label: "14-21", test: (r) => r.dte !== null && r.dte >= 14 && r.dte < 21 },
      { label: "21-30", test: (r) => r.dte !== null && r.dte >= 21 && r.dte < 30 },
      { label: ">30", test: (r) => r.dte !== null && r.dte >= 30 },
    ]),
    byEarnings: bucketBy(graded, [
      { label: "earnings in window", test: (r) => r.earnings_within_dte === true },
      { label: "no earnings", test: (r) => r.earnings_within_dte === false },
    ]),
    byConviction: bucketBy(graded, [
      { label: "STRONG", test: (r) => r.conviction === "STRONG" },
      { label: "MODERATE", test: (r) => r.conviction === "MODERATE" },
      { label: "SPECULATIVE", test: (r) => r.conviction === "SPECULATIVE" },
    ]),
    byJuiciness: quintileBuckets(graded),
    bySymbol,
    bestSymbols: reportableSymbols
      .filter((b) => overallWin === null || (b.winRate ?? 0) > overallWin)
      .slice(0, 3),
    worstSymbols: [...reportableSymbols]
      .reverse()
      .filter((b) => overallWin === null || (b.winRate ?? 0) < overallWin)
      .slice(0, 3),
  };
}

export async function computeLessons(opts: LessonsOptions = {}): Promise<Lessons> {
  const rows = await getResolvedDecisions({ asOf: opts.asOf, limit: 5000 });
  return computeLessonsFromRows(rows, opts);
}

// ---------------------------------------------------------------------------
// Prompt block
// ---------------------------------------------------------------------------

function pct(v: number | null, digits = 0): string {
  return v === null ? "n/a" : `${v.toFixed(digits)}%`;
}

function bucketLine(buckets: LessonBucket[], overallWinRate: number | null): string | null {
  const usable = buckets.filter((b) => !b.insufficient);
  if (usable.length === 0) return null;
  return usable
    .map((b) => {
      const warn =
        overallWinRate !== null && b.winRate !== null && overallWinRate - b.winRate >= WARN_GAP_PCT
          ? " ⚠️"
          : "";
      const ret = b.expectancy !== null ? ` ${signed(b.expectancy, 1, "%")}/trade` : "";
      return `${b.label} → ${pct(b.winRate)} (n=${b.n})${ret}${warn}`;
    })
    .join(" | ");
}

const OUTCOME_SHORT: Record<string, string> = {
  expired_worthless: "WIN",
  breached_recovered: "WIN (breached first)",
  assigned: "ASSIGNED",
  itm: "ITM",
  expired_otm: "EXPIRED WORTHLESS",
  open: "OPEN",
  unknown: "?",
};

function signed(v: number | null, digits = 1, unit = "pp"): string {
  if (v === null) return "n/a";
  const rounded = Number(v.toFixed(digits));
  return `${rounded >= 0 ? "+" : ""}${rounded.toFixed(digits)}${unit}`;
}

function focusSection(l: Lessons, symbol: string): string[] {
  const lines: string[] = [];
  const stats = l.focusStats && l.focusStats.label === symbol ? l.focusStats : null;

  if (stats) {
    const alpha =
      stats.avgAlphaVsHold !== null ? `, ${signed(stats.avgAlphaVsHold)} vs owning it` : "";
    lines.push(
      `### ${symbol} TRACK RECORD: ${pct(stats.winRate)} on n=${stats.n} (expectancy ${signed(stats.expectancy, 1, "%")}/trade${alpha})`
    );
  } else {
    lines.push(`### ${symbol} TRACK RECORD: no resolved decisions yet`);
  }

  if (l.focusSymbol === symbol) {
    for (const e of l.focusHistory) {
      const d = e.delta !== null ? ` ${e.delta.toFixed(2)}d` : "";
      const r = e.realizedPeriodPct !== null ? ` ${signed(e.realizedPeriodPct, 1, "%")}` : "";
      const a = e.alphaVsHold !== null ? ` (${signed(e.alphaVsHold, 0)} vs hold)` : "";
      lines.push(
        `- ${e.decidedAt} ${e.strike ?? "?"}p ${e.dte ?? "?"}dte${d} ${e.conviction ?? ""} → ${OUTCOME_SHORT[e.outcome] ?? e.outcome}${r}${a}`
      );
    }
  }
  return lines;
}

/**
 * The block injected into downstream prompts. Pass `focusSymbol` to lead with
 * that ticker's own history before the cross-ticker buckets; the per-decision
 * lines require the Lessons to have been computed with the same `symbol`.
 */
export function formatLessonsBlock(l: Lessons, focusSymbol?: string): string {
  const focus = (focusSymbol ?? l.focusSymbol)?.toUpperCase() ?? null;

  if (l.totalResolved === 0) {
    return "## WHAT ACTUALLY HAPPENED\nNo resolved decisions yet — no track record to learn from.";
  }

  const asOf = l.asOf ? `, as of ${l.asOf.slice(0, 10)}` : "";
  const lines: string[] = [
    `## WHAT ACTUALLY HAPPENED (n=${l.uniqueContracts} contracts from ${l.totalRows} sightings, since ${l.since}${asOf})`,
  ];

  if (focus) lines.push(...focusSection(l, focus));

  const held =
    l.overall.avgHoldingDays !== null
      ? ` over ~${l.overall.avgHoldingDays.toFixed(0)} days held`
      : "";
  const whenWrong =
    l.overall.avgLossPct !== null
      ? ` | when assigned, avg ${signed(l.overall.avgLossPct, 1, "%")}`
      : "";
  lines.push(
    `Overall: ${pct(l.overall.winRate, 1)} expired worthless | expectancy ${signed(l.overall.expectancy, 1, "%")}/trade${held}${whenWrong}`
  );

  if (l.projectionHonesty) {
    const h = l.projectionHonesty;
    lines.push(
      `PROJECTION HONESTY: we project ${signed(h.projectedPeriodPct, 1, "%")}/trade, realize ${signed(h.realizedPeriodPct, 1, "%")} (${signed(h.gapPp)})`
    );
  }

  if (l.vsHold) {
    lines.push(
      `VS JUST OWNING IT: beat buy-and-hold on ${pct(l.vsHold.beatRate)} of ${l.vsHold.n} resolved picks (avg ${signed(l.vsHold.avgAlpha)})`
    );
  }

  if (l.overall.breachedRecoveredRate !== null && l.overall.breachedRecoveredRate >= 5) {
    lines.push(
      `Breached strike but recovered: ${pct(l.overall.breachedRecoveredRate, 0)} of all decisions (won, but went against us first)`
    );
  }

  const w = l.overall.winRate;
  const sections: Array<[string, string | null]> = [
    ["BY DELTA", bucketLine(l.byDelta, w)],
    ["BY DTE", bucketLine(l.byDte, w)],
    ["EARNINGS", bucketLine(l.byEarnings, w)],
    ["CONVICTION CALIBRATION", bucketLine(l.byConviction, w)],
    ["BY JUICINESS", bucketLine(l.byJuiciness, w)],
  ];
  for (const [heading, body] of sections) {
    if (body) lines.push(`${heading}: ${body}`);
  }

  const names = (bs: LessonBucket[]) =>
    bs
      .map((b) => {
        const alpha = b.avgAlphaVsHold !== null ? ` ${signed(b.avgAlphaVsHold, 1)} vs hold` : "";
        return `${b.label} ${pct(b.winRate)} (n=${b.n}${alpha})`;
      })
      .join(", ");

  if (l.bestSymbols.length > 0) lines.push(`BEST NAMES: ${names(l.bestSymbols)}`);
  if (l.worstSymbols.length > 0) lines.push(`WORST NAMES: ${names(l.worstSymbols)}`);

  return lines.join("\n");
}
