// Learn v2 — defensive-action math over the real chain-snapshot dataset.
// Pure functions only: every number the "defense" sections show (stop levels,
// trigger prices, savings) is computed here from V2 bars and observed option
// marks, so it can never drift from src/lib/learn/v2-data/.

import {
  type V2Bar,
  type V2Option,
  type V2Ticker,
  type OptionSide,
  bars,
  contractSeries,
} from "@/lib/learn/v2";

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Average True Range over the last `n` bars of `series` (simple average). */
export function atr(series: V2Bar[], n = 14): number {
  if (series.length < 2) {
    throw new Error("[defense] atr needs at least 2 bars");
  }
  const trs: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const b = series[i];
    trs.push(
      Math.max(
        b.high - b.low,
        Math.abs(b.high - prev.close),
        Math.abs(b.low - prev.close)
      )
    );
  }
  const window = trs.slice(-n);
  return r2(window.reduce((a, b) => a + b, 0) / window.length);
}

/** Lowest low over the last `lookback` bars of `series`, with its date. */
export function swingLow(
  series: V2Bar[],
  lookback = 20
): { date: string; low: number } {
  const window = series.slice(-lookback);
  if (window.length === 0) throw new Error("[defense] swingLow needs bars");
  let best = window[0];
  for (const b of window) if (b.low < best.low) best = b;
  return { date: best.date, low: best.low };
}

/** Highest high over the last `lookback` bars of `series`, with its date. */
export function swingHigh(
  series: V2Bar[],
  lookback = 20
): { date: string; high: number } {
  const window = series.slice(-lookback);
  if (window.length === 0) throw new Error("[defense] swingHigh needs bars");
  let best = window[0];
  for (const b of window) if (b.high > best.high) best = b;
  return { date: best.date, high: best.high };
}

/**
 * The premium level at which a short option should be bought back:
 * `multiple`× the credit received (the "2× rule" by default).
 */
export function creditStopTrigger(credit: number, multiple = 2): number {
  return r2(credit * multiple);
}

/** Suggested stop-limit ceiling for the buy-to-close order (~10% slippage). */
export function creditStopLimit(credit: number, multiple = 2): number {
  return r2(credit * multiple * 1.1);
}

/** First bar in `series` that CLOSES below `level`, or null. */
export function firstBreachDate(series: V2Bar[], level: number): V2Bar | null {
  return series.find((b) => b.close < level) ?? null;
}

/** First observed mark at or above `level` (a short seller's stop firing). */
export function firstMarkAtOrAbove(
  marks: (V2Option & { date: string })[],
  level: number
): (V2Option & { date: string }) | null {
  return marks.find((m) => m.mid >= level) ?? null;
}

/** First observed mark at or below `level` (a profit target being hit). */
export function firstMarkAtOrBelow(
  marks: (V2Option & { date: string })[],
  level: number
): (V2Option & { date: string }) | null {
  return marks.find((m) => m.mid <= level) ?? null;
}

// ── Short-option defense (short puts, covered calls' short leg) ────────────

export type ShortDefenseInput = {
  side: OptionSide;
  strike: number;
  expiry: string;
  entryDate: string;
  /** Credit received per share at entry. */
  credit: number;
  /** Buy-back multiple for the premium trigger (default 2 = the 2× rule). */
  multiple?: number;
  /** Underlying level whose CLOSE-breach invalidates the trade (support for
   *  puts). Defaults to the strike itself when the setup named no level. */
  support?: number;
};

export type ShortDefense = {
  /** Premium at which the buy-to-close stop sits (multiple × credit). */
  trigger: number;
  /** Stop-limit ceiling for that order. */
  limit: number;
  /** Underlying level used for the close-basis alert. */
  support: number;
  /** First bar after entry that closed below `support` (null = never). */
  supportBreach: V2Bar | null;
  /** First scanned mark of this contract at/above `trigger` after entry. */
  premiumBreach: (V2Option & { date: string }) | null;
  /** The earlier of the two events — when the defense would have acted. */
  exit: {
    date: string;
    /** Premium paid to close (observed mark where available). */
    mark: number;
    reason: "support" | "premium";
    /** True when no scan existed near the exit date and `mark` is the
     *  larger of intrinsic-at-close and the trigger (a conservative floor). */
    estimated: boolean;
    /** Date of the mark used, when it differs from the event date. */
    markDate: string;
  } | null;
  /** P&L per contract if the defensive exit had been taken. */
  exitPnl: number | null;
  /** P&L per contract of holding to the end of the data. */
  actualPnl: number;
  /** True when the expiry bar is inside the dataset window. */
  settled: boolean;
  /** Close used to settle (expiry close, or last bar when unsettled). */
  settleClose: number;
  settleDate: string;
  /** Dollars per contract the defense kept (exitPnl − actualPnl). */
  saved: number | null;
  /** First scan at/below 50% of the credit — the take-profit sighting. */
  profitTake: (V2Option & { date: string }) | null;
};

function intrinsic(side: OptionSide, strike: number, spot: number): number {
  return side === "put"
    ? Math.max(0, strike - spot)
    : Math.max(0, spot - strike);
}

/**
 * Replays the playbook's short-option defense against what really happened:
 * a GTC stop-limit buy-to-close at `multiple`× credit, paired with a
 * close-basis alert on the underlying at `support`. Marks come from real
 * scanner observations of the same contract (`contractSeries`).
 */
export function shortOptionDefense(
  t: V2Ticker,
  input: ShortDefenseInput
): ShortDefense {
  const { side, strike, expiry, entryDate, credit, multiple = 2 } = input;
  const support = input.support ?? strike;

  const trigger = creditStopTrigger(credit, multiple);
  const limit = creditStopLimit(credit, multiple);

  // A close-breach on expiry day itself is settlement, not a defensive exit.
  const after = bars(t).filter((b) => b.date > entryDate && b.date < expiry);
  const supportBreach =
    side === "put"
      ? firstBreachDate(after, support)
      : after.find((b) => b.close > support) ?? null; // short call: close above

  const marks = contractSeries(t, side, strike, expiry).filter(
    (m) => m.date > entryDate
  );
  const premiumBreach = firstMarkAtOrAbove(marks, trigger);

  // The defense acts on whichever event lands first.
  let exit: ShortDefense["exit"] = null;
  const events: { date: string; reason: "support" | "premium" }[] = [];
  if (supportBreach) events.push({ date: supportBreach.date, reason: "support" });
  if (premiumBreach) events.push({ date: premiumBreach.date, reason: "premium" });
  events.sort((a, b) => a.date.localeCompare(b.date));

  if (events.length > 0) {
    const ev = events[0];
    if (ev.reason === "premium" && premiumBreach) {
      exit = {
        date: ev.date,
        mark: r2(premiumBreach.mid),
        reason: "premium",
        estimated: false,
        markDate: premiumBreach.date,
      };
    } else if (supportBreach) {
      // Cost of closing on the breach: the nearest observed mark on/after it.
      const near = marks.find((m) => m.date >= supportBreach.date) ?? null;
      if (near) {
        exit = {
          date: supportBreach.date,
          mark: r2(near.mid),
          reason: "support",
          estimated: near.date !== supportBreach.date,
          markDate: near.date,
        };
      } else {
        const floor = Math.max(
          trigger,
          intrinsic(side, strike, supportBreach.close)
        );
        exit = {
          date: supportBreach.date,
          mark: r2(floor),
          reason: "support",
          estimated: true,
          markDate: supportBreach.date,
        };
      }
    }
  }

  // Settlement: expiry close when the window contains it, else the last bar.
  const all = bars(t);
  const expiryBar = all.find((b) => b.date === expiry) ?? null;
  const lastBar = all[all.length - 1];
  const settled = expiryBar !== null;
  const settleBar = expiryBar ?? lastBar;
  const settleValue = settled
    ? intrinsic(side, strike, settleBar.close)
    : // still open at the window's edge: last observed mark, else intrinsic
      r2(
        marks.length > 0
          ? marks[marks.length - 1].mid
          : intrinsic(side, strike, settleBar.close)
      );

  const actualPnl = Math.round((credit - settleValue) * 100);
  const exitPnl = exit ? Math.round((credit - exit.mark) * 100) : null;
  const saved = exit && exitPnl !== null ? exitPnl - actualPnl : null;

  const profitTake = firstMarkAtOrBelow(marks, r2(credit * 0.5));

  return {
    trigger,
    limit,
    support,
    supportBreach,
    premiumBreach,
    exit,
    exitPnl,
    actualPnl,
    settled,
    settleClose: settleBar.close,
    settleDate: settleBar.date,
    saved,
    profitTake,
  };
}

// ── Stock/LEAPS defense (long side: shares held under a covered call) ──────

export type StockStopDefense = {
  /** Stop level: entry swing low − 1 ATR. */
  stopLevel: number;
  swingLow: { date: string; low: number };
  atr: number;
  /** First bar after entry that closed below the stop (null = never hit). */
  breach: V2Bar | null;
  /** Per-share result of the stop vs holding to the window's end. */
  stopPnlPerShare: number | null;
  heldPnlPerShare: number;
  savedPerShare: number | null;
  lastBar: V2Bar;
};

/**
 * The playbook's long-side stop: below the swing low that justified the
 * entry, minus one ATR of noise room. Computed strictly from bars up to and
 * including `entryDate`, then replayed forward.
 */
export function stockStopDefense(
  t: V2Ticker,
  entryDate: string,
  opts?: { lookback?: number; atrN?: number }
): StockStopDefense {
  const lookback = opts?.lookback ?? 20;
  const atrN = opts?.atrN ?? 14;
  const upTo = bars(t, undefined, entryDate);
  const entryBar = upTo[upTo.length - 1];
  if (!entryBar || entryBar.date !== entryDate) {
    throw new Error(`[defense] ${t.symbol}: no bar on entry date ${entryDate}`);
  }
  const sl = swingLow(upTo, lookback);
  const a = atr(upTo, atrN);
  const stopLevel = r2(sl.low - a);

  const after = bars(t).filter((b) => b.date > entryDate);
  const breach = firstBreachDate(after, stopLevel);
  const lastBar = after.length > 0 ? after[after.length - 1] : entryBar;

  const heldPnlPerShare = r2(lastBar.close - entryBar.close);
  const stopPnlPerShare = breach ? r2(stopLevel - entryBar.close) : null;
  const savedPerShare =
    breach && stopPnlPerShare !== null
      ? r2(stopPnlPerShare - heldPnlPerShare)
      : null;

  return {
    stopLevel,
    swingLow: sl,
    atr: a,
    breach,
    stopPnlPerShare,
    heldPnlPerShare,
    savedPerShare,
    lastBar,
  };
}
