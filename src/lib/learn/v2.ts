// Learn v2 — typed access to the real chain-snapshot dataset in
// src/lib/learn/v2-data/. Case-study content must derive every number it
// shows from these helpers; lookups throw on a miss so an untraceable
// reference fails the build instead of shipping a fabricated figure.

export type V2Bar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type V2Option = {
  symbol: string;
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  premium: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  iv: number;
  rsi?: number;
  aroc?: number;
  volume?: number;
  juiciness?: number;
  priority?: string;
  catalyst?: string;
  score?: number;
  maxLoss?: number;
};

export type V2Snapshot = {
  date: string;
  puts: V2Option[];
  calls: V2Option[];
  leaps?: V2Option[];
};

export type V2Ticker = {
  symbol: string;
  universe: "traded" | "opportunity";
  window: { start: string; end: string };
  prices: V2Bar[];
  snapshots: V2Snapshot[];
};

export type OptionSide = "put" | "call" | "leap";

/** Price bars in [start, end] inclusive (whole series when omitted). */
export function bars(t: V2Ticker, start?: string, end?: string): V2Bar[] {
  return t.prices.filter(
    (b) => (!start || b.date >= start) && (!end || b.date <= end)
  );
}

export function barOn(t: V2Ticker, date: string): V2Bar {
  const bar = t.prices.find((b) => b.date === date);
  if (!bar) throw new Error(`[learn-v2] ${t.symbol}: no price bar on ${date}`);
  return bar;
}

export function closeOn(t: V2Ticker, date: string): number {
  return barOn(t, date).close;
}

function sideRows(s: V2Snapshot, side: OptionSide): V2Option[] {
  if (side === "put") return s.puts;
  if (side === "call") return s.calls;
  return s.leaps ?? [];
}

/**
 * The option row scanned on `date` for (side, strike, expiry). Snapshots can
 * repeat a date (multiple scan runs); the first matching row wins.
 */
export function findOption(
  t: V2Ticker,
  side: OptionSide,
  date: string,
  strike: number,
  expiry: string
): V2Option {
  for (const s of t.snapshots) {
    if (s.date !== date) continue;
    const hit = sideRows(s, side).find(
      (o) => o.strike === strike && o.expiry === expiry
    );
    if (hit) return hit;
  }
  throw new Error(
    `[learn-v2] ${t.symbol}: no ${side} ${strike} ${expiry} snapshotted on ${date}`
  );
}

export const findPut = (t: V2Ticker, date: string, strike: number, expiry: string) =>
  findOption(t, "put", date, strike, expiry);
export const findCall = (t: V2Ticker, date: string, strike: number, expiry: string) =>
  findOption(t, "call", date, strike, expiry);

/**
 * Every scan of the same contract across the window, oldest first, one row
 * per day — the observed premium/IV path of that contract.
 */
export function contractSeries(
  t: V2Ticker,
  side: OptionSide,
  strike: number,
  expiry: string
): (V2Option & { date: string })[] {
  const byDate = new Map<string, V2Option>();
  for (const s of t.snapshots) {
    const hit = sideRows(s, side).find(
      (o) => o.strike === strike && o.expiry === expiry
    );
    if (hit && !byDate.has(s.date)) byDate.set(s.date, hit);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, o]) => ({ ...o, date }));
}

/** % the strike sits below the reference price (positive = OTM put). */
export function pctOtm(strike: number, refPrice: number): number {
  return Math.round(((refPrice - strike) / refPrice) * 1000) / 10;
}

export const money = (x: number) =>
  `$${x.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
