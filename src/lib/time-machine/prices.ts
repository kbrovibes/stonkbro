/**
 * Price helpers for the Time Machine simulator.
 *
 * Three small Tradier wrappers used by the option-expiry replay and the
 * snapshot/today valuation:
 *   - getCurrentStockPrices: batch /markets/quotes lookup for held stocks
 *   - getCurrentOptionMid:   mid (bid/ask) for one live option contract
 *   - getHistoricalClose:    adj. close on a date (with prior-trading-day
 *                            fallback), cached in-process for hot replay
 *
 * Behaviour notes:
 *   - All three return `null` (or empty Map) when TRADIER_API_TOKEN is unset,
 *     matching the soft-fail pattern in src/lib/market/history.ts and the
 *     rest of the Tradier client.
 *   - We reuse tradierFetch from src/lib/market/tradier-client.ts for auth,
 *     base URL, and 429 backoff.
 */

import { tradierFetch } from "../market/tradier-client";

// ---------------------------------------------------------------------------
// Module-level cache for historical closes — keyed `${symbol}|${dateISO}`.
// The expiry replay hits the same (symbol, expiry) pair repeatedly when a
// user holds several legs on the same underlying, so this matters.
// ---------------------------------------------------------------------------

const historicalCloseCache = new Map<string, number | null>();

/**
 * Manual price overrides for symbols Tradier doesn't quote (mutual funds,
 * proprietary tickers). Used as a final fallback after Tradier returns null.
 * Update these periodically until we wire a proper mutual-fund data feed.
 */
const MANUAL_PRICES: Record<string, number> = {
  FXAIX: 263.16,   // Fidelity 500 Index Fund
  FSELX: 67.91,    // Fidelity Select Semiconductors Portfolio
};

/**
 * Today's stock prices for a list of symbols (Tradier /markets/quotes, batched).
 * Falls back to MANUAL_PRICES for mutual funds Tradier doesn't quote.
 */
export async function getCurrentStockPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  // Seed with manual overrides for everything in the requested list.
  for (const s of symbols) {
    const u = s?.trim().toUpperCase();
    if (u && MANUAL_PRICES[u] != null) out.set(u, MANUAL_PRICES[u]);
  }
  if (!process.env.TRADIER_API_TOKEN) return out;

  // Dedupe + drop blanks before the call.
  const uniq = Array.from(
    new Set(symbols.map((s) => s?.trim().toUpperCase()).filter(Boolean))
  );
  if (uniq.length === 0) return out;

  try {
    const res = await tradierFetch(
      `/markets/quotes?symbols=${uniq.join(",")}`,
      { revalidate: 60 }
    );
    if (!res) return out;

    const data = await res.json();
    const quotes = data.quotes?.quote;
    if (!quotes) return out;

    // Tradier returns a single object when only one symbol was requested,
    // an array when there were multiple. Normalise.
    const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

    for (const q of quoteArray) {
      if (!q || !q.symbol) continue;
      const price = q.last ?? q.prevclose;
      if (typeof price === "number" && price > 0) {
        out.set(String(q.symbol).toUpperCase(), price);
      }
    }
    return out;
  } catch (e) {
    console.error("getCurrentStockPrices error:", e);
    return out;
  }
}

/**
 * Snapshot-date price for a list of symbols, with manual-price fallback.
 * Uses getHistoricalClose for each symbol; for mutual funds without history,
 * falls back to MANUAL_PRICES (same as today's price → return % shows 0).
 */
export async function getSnapshotStockPrices(
  symbols: string[],
  dateISO: string
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const uniq = Array.from(new Set(symbols.map((s) => s?.trim().toUpperCase()).filter(Boolean)));
  await Promise.all(
    uniq.map(async (sym) => {
      const px = await getHistoricalClose(sym, dateISO);
      if (px != null && px > 0) out.set(sym, px);
      else if (MANUAL_PRICES[sym] != null) out.set(sym, MANUAL_PRICES[sym]);
    })
  );
  return out;
}

/**
 * Mid price for one live option contract (expiry > today).
 * Returns null if not found or the chain call fails.
 */
export async function getCurrentOptionMid(args: {
  underlying: string;
  expiry: string; // YYYY-MM-DD
  strike: number;
  optionType: "CALL" | "PUT";
}): Promise<number | null> {
  if (!process.env.TRADIER_API_TOKEN) return null;

  const { underlying, expiry, strike, optionType } = args;
  const wantType = optionType.toLowerCase(); // tradier returns "call" / "put"

  try {
    const res = await tradierFetch(
      `/markets/options/chains?symbol=${encodeURIComponent(
        underlying
      )}&expiration=${expiry}`,
      { revalidate: 60 }
    );
    if (!res) return null;

    const data = await res.json();
    const options = data.options?.option;
    if (!options) return null;

    const optArray = Array.isArray(options) ? options : [options];

    // Strikes are floats — compare with a small epsilon so 17.50 and 17.5
    // (or 17.5000001) match cleanly.
    const epsilon = 0.0001;
    const match = optArray.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (o: any) =>
        o &&
        o.option_type === wantType &&
        typeof o.strike === "number" &&
        Math.abs(o.strike - strike) < epsilon
    );
    if (!match) return null;

    const bid = typeof match.bid === "number" ? match.bid : 0;
    const ask = typeof match.ask === "number" ? match.ask : 0;

    // If both sides are quoted, midpoint. If only one side is, use it.
    // If neither, fall back to last trade price; otherwise null.
    if (bid > 0 && ask > 0) return (bid + ask) / 2;
    if (ask > 0) return ask;
    if (bid > 0) return bid;
    if (typeof match.last === "number" && match.last > 0) return match.last;
    return null;
  } catch (e) {
    console.error(
      `getCurrentOptionMid error for ${underlying} ${expiry} ${strike} ${optionType}:`,
      e
    );
    return null;
  }
}

/**
 * Adjusted-close for `symbol` on `dateISO`. If Tradier has no bar on that
 * exact date (weekend / holiday / missing), falls back to the latest close
 * within the prior 5 calendar days. Cached in-process.
 */
export async function getHistoricalClose(
  symbol: string,
  dateISO: string
): Promise<number | null> {
  const cacheKey = `${symbol.toUpperCase()}|${dateISO}`;
  if (historicalCloseCache.has(cacheKey)) {
    return historicalCloseCache.get(cacheKey) ?? null;
  }

  if (!process.env.TRADIER_API_TOKEN) {
    historicalCloseCache.set(cacheKey, null);
    return null;
  }

  try {
    // First attempt: exact date.
    const exact = await fetchDailyBars(symbol, dateISO, dateISO);
    if (exact && exact.length > 0) {
      // Pick the bar on or before the target date (should be exactly one).
      const onOrBefore = exact
        .filter((b) => b.date <= dateISO)
        .sort((a, b) => a.date.localeCompare(b.date));
      const last = onOrBefore[onOrBefore.length - 1];
      if (last && typeof last.close === "number") {
        historicalCloseCache.set(cacheKey, last.close);
        return last.close;
      }
    }

    // Fallback: widen the window back 5 calendar days and take the most
    // recent close <= dateISO. Handles weekends, holidays, and the
    // occasional Tradier gap.
    const start = shiftDateISO(dateISO, -5);
    const wider = await fetchDailyBars(symbol, start, dateISO);
    if (wider && wider.length > 0) {
      const onOrBefore = wider
        .filter((b) => b.date <= dateISO)
        .sort((a, b) => a.date.localeCompare(b.date));
      const last = onOrBefore[onOrBefore.length - 1];
      if (last && typeof last.close === "number") {
        historicalCloseCache.set(cacheKey, last.close);
        return last.close;
      }
    }

    historicalCloseCache.set(cacheKey, null);
    return null;
  } catch (e) {
    console.error(
      `getHistoricalClose error for ${symbol} on ${dateISO}:`,
      e
    );
    historicalCloseCache.set(cacheKey, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type Bar = { date: string; close: number };

async function fetchDailyBars(
  symbol: string,
  startISO: string,
  endISO: string
): Promise<Bar[] | null> {
  const res = await tradierFetch(
    `/markets/history?symbol=${encodeURIComponent(
      symbol
    )}&interval=daily&start=${startISO}&end=${endISO}`,
    { revalidate: 3600 }
  );
  if (!res) return null;

  const data = await res.json();
  const days = data.history?.day;
  if (!days) return [];

  const arr = Array.isArray(days) ? days : [days];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return arr.map((d: any) => ({
    date: String(d.date),
    close: typeof d.close === "number" ? d.close : Number(d.close),
  }));
}

/** Shift an ISO date (YYYY-MM-DD) by `deltaDays`. UTC arithmetic. */
function shiftDateISO(dateISO: string, deltaDays: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split("T")[0];
}
