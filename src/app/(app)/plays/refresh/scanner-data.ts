/**
 * The scanner screen's data shape, and the mappers from every existing scan
 * payload onto it.
 *
 * The five strategies are five different response shapes from three different
 * endpoints. The screen renders one card design, so everything funnels through
 * `Setup` here — one place to read when a number on the screen looks wrong,
 * and the only place that knows what "monthly ROC" means per strategy.
 *
 * Nothing in this file fetches. Nothing in it is allowed to invent a number:
 * where the app does not compute a value (IV rank, a return on a long call),
 * the tile says what the app actually has instead of guessing.
 */

import { SECTORS } from "@/lib/market/sectors";

/** The segmented switch. `calls` is the app's long-call scan — see below. */
export type Strategy = "csp" | "calls" | "pmcc" | "leaps" | "wkly";

/**
 * The handoff's segmented switch reads CSP · CC · PMCC · LEAPS · WKLY. The
 * app has no covered-call scanner; its second scan is long calls, so the
 * segment is labelled CALLS. "CC" over long-call setups would read as covered
 * calls, which is the opposite trade.
 */
export const STRATEGIES: { key: Strategy; label: string }[] = [
  { key: "csp", label: "CSP" },
  { key: "calls", label: "CALLS" },
  { key: "pmcc", label: "PMCC" },
  { key: "leaps", label: "LEAPS" },
  { key: "wkly", label: "WKLY" },
];

export interface SetupTile {
  label: string;
  value: string;
}

export interface Setup {
  /** Stable across re-scans — the FLIP re-sort keys off this. */
  id: string;
  symbol: string;
  /** The structure, one line, truncating. Never wraps. */
  structure: string;
  /** The ranked value. */
  metric: number;
  metricSuffix: string;
  metricDecimals: number;
  /** The eyebrow under it — `MO. ROC` where the metric really is one. */
  metricLabel: string;
  /** `up` for a return, `text-primary` for a score. */
  metricColor: string;
  tiles: SetupTile[];
  /** What opening one costs. `null` where the strategy has no single figure. */
  capitalRequired: number | null;
  /** Deep link into the position logger, where the strategy is loggable. */
  addHref: string | null;
}

/* -------------------------------------------------------------------------
   Sectors — the chip row
   ------------------------------------------------------------------------- */

export type SectorKey = string;

/** Short labels; `SECTORS[].name` is written for a page heading, not a chip. */
const SHORT_NAMES: Record<string, string> = {
  "ai-infrastructure": "AI Infra",
  "ai-software": "AI Software",
  quantum: "Quantum",
  "nuclear-energy": "Nuclear",
  "space-defense": "Space",
  fintech: "Fintech",
  biotech: "Biotech",
  "ev-autonomy": "EV",
};

export const SECTOR_CHIPS: { key: SectorKey; label: string }[] = [
  { key: "all", label: "All" },
  ...SECTORS.map((s) => ({ key: s.slug, label: SHORT_NAMES[s.slug] ?? s.name })),
];

const SECTOR_TICKERS = new Map<string, Set<string>>(
  SECTORS.map((s) => [s.slug, new Set(s.tickers)])
);

/** Sector membership, by ticker. `all` matches everything. */
export function inSector(symbol: string, sector: SectorKey): boolean {
  if (sector === "all") return true;
  return SECTOR_TICKERS.get(sector)?.has(symbol.toUpperCase()) ?? false;
}

/* -------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09-26` → `26 Sep` this year, `Jan'27` beyond it. */
export function fmtExpiry(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const thisYear = new Date().getFullYear();
  if (d.getFullYear() === thisYear) return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return `${MONTHS[d.getMonth()]}'${String(d.getFullYear()).slice(2)}`;
}

export function fmtMoney(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtMoney2(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** `$100K` — the header's capital figure, which has no room for six digits. */
export function fmtCompactMoney(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

/* -------------------------------------------------------------------------
   Source shapes — the fields these screens read, not the full payloads
   ------------------------------------------------------------------------- */

export interface CspCandidate {
  symbol: string;
  strike: number;
  expiry: string;
  dte: number;
  mid: number;
  delta: number;
  iv: number;
  collateralRequired: number;
  aroc: number;
}

export interface LongCallCandidate {
  symbol: string;
  strike: number;
  expiry: string;
  dte: number;
  mid: number;
  costPerContract: number;
  delta: number;
  iv: number;
  breakeven: number;
  score: number;
}

export interface PmccSetup {
  symbol: string;
  leaps: { strike: number; expiry: string; dte: number; mid: number; impliedVolatility: number };
  shortCall: { strike: number; expiry: string; dte: number; mid: number; impliedVolatility: number };
  monthlyPremium: number;
  monthlyReturnPct: number;
  shortDelta: number;
  capitalRequired: number;
}

export interface WeeklyPick {
  symbol: string;
  type: "csp" | "call" | "leaps";
  strike: number;
  expiry: string;
  dte: number;
  pickPrice: number;
  pickDate: string;
  appearances: number;
  currentPrice: number | null;
  pricePct: number | null;
}

/* -------------------------------------------------------------------------
   Mappers
   ------------------------------------------------------------------------- */

const UP = "var(--up)";
const DOWN = "var(--down)";
const PRIMARY = "var(--text-primary)";

/** IV is stored as a fraction everywhere in the scanners. */
function ivPct(iv: number | undefined): string {
  return Number.isFinite(iv) ? `${Math.round((iv as number) * 100)}%` : "—";
}

/**
 * Monthly ROC from the scanner's annualised figure. AROC is
 * `(premium / strike) × (365 / dte)`, so a twelfth of it is the monthly rate
 * on the same simple basis — the same arithmetic, one period shorter.
 */
export function cspSetup(c: CspCandidate): Setup {
  const add = new URLSearchParams({
    symbol: c.symbol,
    strategy: "Cash-Secured Put",
    strike: String(c.strike),
    expiry: c.expiry,
    premium: String(c.mid),
  });
  return {
    id: `csp-${c.symbol}-${c.strike}-${c.expiry}`,
    symbol: c.symbol,
    structure: `Short ${c.strike}P ${fmtExpiry(c.expiry)} · ${c.dte}DTE`,
    metric: c.aroc / 12,
    metricSuffix: "%",
    metricDecimals: 1,
    metricLabel: "MO. ROC",
    metricColor: UP,
    tiles: [
      { label: "Premium", value: fmtMoney2(c.mid) },
      { label: "Delta", value: Math.abs(c.delta).toFixed(2) },
      { label: "IV", value: ivPct(c.iv) },
    ],
    capitalRequired: c.collateralRequired,
    addHref: `/positions/new?${add.toString()}`,
  };
}

/**
 * Long calls have no return on capital to rank by — you are paying premium,
 * not collecting it — so they rank on the scanner's own composite score, and
 * the eyebrow says so.
 */
export function callSetup(c: LongCallCandidate, kind: "calls" | "leaps"): Setup {
  return {
    id: `${kind}-${c.symbol}-${c.strike}-${c.expiry}`,
    symbol: c.symbol,
    structure: `Long ${c.strike}C ${fmtExpiry(c.expiry)} · ${c.dte}DTE · BE ${fmtMoney2(c.breakeven)}`,
    metric: c.score,
    metricSuffix: "",
    metricDecimals: 0,
    metricLabel: "SCORE",
    metricColor: PRIMARY,
    tiles: [
      { label: "Cost", value: fmtMoney(c.costPerContract) },
      { label: "Delta", value: Math.abs(c.delta).toFixed(2) },
      { label: "IV", value: ivPct(c.iv) },
    ],
    capitalRequired: c.costPerContract,
    // Long calls are not one of the logger's four strategies.
    addHref: null,
  };
}

export function pmccSetup(s: PmccSetup): Setup {
  const add = new URLSearchParams({
    symbol: s.symbol,
    strategy: "PMCC",
    leaps_strike: String(s.leaps.strike),
    leaps_expiry: s.leaps.expiry,
    leaps_price: String(s.leaps.mid),
    short_strike: String(s.shortCall.strike),
    short_expiry: s.shortCall.expiry,
    short_price: String(s.shortCall.mid),
  });
  return {
    id: `pmcc-${s.symbol}-${s.leaps.strike}-${s.shortCall.strike}-${s.shortCall.expiry}`,
    symbol: s.symbol,
    structure: `Long ${s.leaps.strike}C ${fmtExpiry(s.leaps.expiry)} · Short ${s.shortCall.strike}C ${s.shortCall.dte}DTE`,
    metric: s.monthlyReturnPct,
    metricSuffix: "%",
    metricDecimals: 1,
    metricLabel: "MO. ROC",
    metricColor: UP,
    tiles: [
      { label: "Premium", value: fmtMoney(s.monthlyPremium) },
      { label: "Delta", value: Math.abs(s.shortDelta).toFixed(2) },
      { label: "IV", value: ivPct(s.shortCall.impliedVolatility) },
    ],
    capitalRequired: s.capitalRequired,
    addHref: `/positions/new?${add.toString()}`,
  };
}

/** The weekly recap ranks on what the pick has done since it was made. */
export function weeklySetup(p: WeeklyPick): Setup {
  const right = p.type === "csp" ? "P" : "C";
  const move = p.pricePct ?? 0;
  return {
    id: `wkly-${p.symbol}-${p.type}-${p.strike}-${p.expiry}`,
    symbol: p.symbol,
    structure: `${p.type === "csp" ? "Short" : "Long"} ${p.strike}${right} ${fmtExpiry(p.expiry)} · picked ${fmtExpiry(p.pickDate)}`,
    metric: move,
    metricSuffix: "%",
    metricDecimals: 1,
    metricLabel: "SINCE PICK",
    metricColor: move >= 0 ? UP : DOWN,
    tiles: [
      { label: "At pick", value: fmtMoney2(p.pickPrice) },
      { label: "Now", value: p.currentPrice == null ? "—" : fmtMoney2(p.currentPrice) },
      { label: "Scans", value: String(p.appearances) },
    ],
    capitalRequired: null,
    addHref: null,
  };
}

/* -------------------------------------------------------------------------
   Ranking
   ------------------------------------------------------------------------- */

/**
 * Bar fill, relative to the leader. The top card sits at 92% rather than
 * 100% so the bar reads as a rate on a scale, not a completed thing — the
 * proportions the reference draws.
 */
export function barFill(setup: Setup, leader: number): number {
  if (!leader) return 0;
  return Math.max(0.04, Math.min(1, Math.abs(setup.metric) / Math.abs(leader))) * 0.92;
}

export function rankSetups(setups: Setup[]): Setup[] {
  return [...setups].sort((a, b) => b.metric - a.metric);
}

export function fitsCapital(setup: Setup, capital: number | null): boolean {
  if (capital == null || setup.capitalRequired == null) return true;
  return setup.capitalRequired <= capital;
}
