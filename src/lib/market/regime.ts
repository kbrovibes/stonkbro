/**
 * Market Regime Reader
 *
 * Deterministic read of "what kind of market is this right now" from data we
 * already pay for: SPY trend, a volatility gauge, breadth across our universe,
 * risk appetite (QQQ/IWM vs SPY), and trend quality.
 *
 * The output is not a forecast — it is a set of guardrails. In a calm, broad
 * market we can sell closer to the money for less premium; in a jumpy market we
 * move further away and demand more. Never throws: a degraded reading is always
 * better than no reading.
 */

import { getQuote, getQuotes } from "@/lib/market/yahoo";
import { getHistory } from "@/lib/market/history";
import { analyzeTechnicals } from "@/lib/analysis/technicals";
import { DEFAULT_UNIVERSE, type CSPScanConfig } from "@/lib/options/csp-scanner";

export type Regime = "RISK_ON" | "NEUTRAL" | "RISK_OFF" | "VOLATILE";

export type RegimeSignal = {
  label: string;
  value: string;
  contribution: number; // signed points folded into `score`
  note: string;
};

export type RegimeRecommendation = {
  maxDelta: number;
  minDelta: number;
  minDTE: number;
  maxDTE: number;
  minAROC: number;
  stance: string;
};

export type RegimeReading = {
  regime: Regime;
  score: number; // -100 (max risk-off) .. +100 (max risk-on)
  asOf: string;
  signals: RegimeSignal[];
  volatility: {
    source: "vix" | "realized";
    level: number; // VIX points, or annualized realized vol in %
  };
  breadthPct: number; // % of universe above its own 50-day average
  recommended: RegimeRecommendation;
};

const VIX_SYMBOLS = ["VIX", "^VIX", "$VIX.X"];
const VOLATILE_VIX = 28;
const VOLATILE_REALIZED = 25;

const RECOMMENDATIONS: Record<Regime, Omit<RegimeRecommendation, "stance">> = {
  RISK_ON: { minDelta: 0.20, maxDelta: 0.30, minDTE: 7, maxDTE: 21, minAROC: 12 },
  NEUTRAL: { minDelta: 0.15, maxDelta: 0.25, minDTE: 7, maxDTE: 21, minAROC: 10 },
  RISK_OFF: { minDelta: 0.12, maxDelta: 0.20, minDTE: 14, maxDTE: 30, minAROC: 15 },
  VOLATILE: { minDelta: 0.10, maxDelta: 0.18, minDTE: 7, maxDTE: 14, minAROC: 20 },
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function round(v: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(v * f) / f;
}

/** Annualized standard deviation of the last `window` daily log returns, in %. */
function realizedVol(closes: number[], window = 20): number | null {
  if (closes.length < window + 1) return null;
  const returns: number[] = [];
  for (let i = closes.length - window; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

async function readVolatility(spyCloses: number[]): Promise<{ source: "vix" | "realized"; level: number }> {
  for (const sym of VIX_SYMBOLS) {
    try {
      const q = await getQuote(sym);
      // A plausible VIX print. Anything outside this is a mock or a bad symbol map.
      if (q && q.price >= 5 && q.price <= 90) {
        return { source: "vix", level: round(q.price, 2) };
      }
    } catch {
      // Try the next symbology
    }
  }
  const rv = realizedVol(spyCloses);
  return { source: "realized", level: rv !== null ? round(rv, 2) : 18 };
}

/**
 * Breadth, cheapest path first: a quote that already carries its own 50-day
 * average makes `price > fiftyDayAvg` free. Tradier quotes do not fill that
 * field, so when too few quotes are usable we fall back to computing 50-day
 * averages from history for an evenly-strided sample of the universe. A sample
 * is enough — breadth is a proportion, not a roll call — and the reading is
 * cached upstream, so this costs at most a few dozen calls per quarter hour.
 */
const BREADTH_SAMPLE = 40;
const BREADTH_BATCH = 8;

function breadthFromQuotes(quotes: { price: number; fiftyDayAvg: number }[]): { pct: number; counted: number } {
  const usable = quotes.filter((q) => q.price > 0 && q.fiftyDayAvg > 0);
  if (usable.length === 0) return { pct: 50, counted: 0 };
  const above = usable.filter((q) => q.price > q.fiftyDayAvg).length;
  return { pct: round((above / usable.length) * 100), counted: usable.length };
}

function stridedSample(symbols: string[], size: number): string[] {
  if (symbols.length <= size) return symbols;
  const stride = symbols.length / size;
  const out: string[] = [];
  for (let i = 0; i < size; i++) out.push(symbols[Math.floor(i * stride)]);
  return out;
}

async function breadthFromHistory(symbols: string[]): Promise<{ pct: number; counted: number }> {
  const sample = stridedSample(symbols, BREADTH_SAMPLE);
  let above = 0;
  let counted = 0;

  for (let i = 0; i < sample.length; i += BREADTH_BATCH) {
    const settled = await Promise.allSettled(
      sample.slice(i, i + BREADTH_BATCH).map((s) => getHistory(s, 60))
    );
    for (const r of settled) {
      if (r.status !== "fulfilled" || r.value.length < 50) continue;
      const closes = r.value.map((b) => b.close);
      const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
      if (!(sma50 > 0)) continue;
      counted++;
      if (closes[closes.length - 1] > sma50) above++;
    }
  }

  if (counted === 0) return { pct: 50, counted: 0 };
  return { pct: round((above / counted) * 100), counted };
}

function buildStance(regime: Regime, r: Omit<RegimeRecommendation, "stance">, breadthPct: number, vol: { source: "vix" | "realized"; level: number }): string {
  const volPhrase = vol.source === "vix"
    ? `the VIX is ${vol.level} — the market's own estimate of how much the S&P will swing over the next month`
    : `the S&P has been swinging about ${vol.level}% a year lately — measured from its own daily moves, since a live fear gauge was unavailable`;
  const deltaPhrase = `deltas of ${r.minDelta.toFixed(2)}-${r.maxDelta.toFixed(2)} (delta is roughly the chance the stock finishes below your strike and you get assigned the shares, so 0.20 means about a 1-in-5 chance)`;
  const arocPhrase = `at least ${r.minAROC}% annualized return on the cash you set aside`;
  const dtePhrase = `${r.minDTE}-${r.maxDTE} days to expiration`;

  switch (regime) {
    case "RISK_ON":
      return `Broad market is healthy — ${breadthPct}% of the names we watch are trading above their own 50-day average price, and ${volPhrase}. Sell ${deltaPhrase} at ${dtePhrase} and ask for ${arocPhrase}; you can afford to sit a little closer to the stock price because most things are going up.`;
    case "NEUTRAL":
      return `Market is mixed — ${breadthPct}% of the names we watch are above their own 50-day average price, and ${volPhrase}. Sell ${deltaPhrase} at ${dtePhrase} and ask for ${arocPhrase}; keep normal size and do not reach for extra premium.`;
    case "RISK_OFF":
      return `The market is weakening — only ${breadthPct}% of the names we watch are above their own 50-day average price, and ${volPhrase}. Sell ${deltaPhrase} — further below the stock price than usual — at ${dtePhrase} so you have more time to be right, and demand ${arocPhrase} to be paid for the extra risk.`;
    case "VOLATILE":
      return `Prices are jumping around hard: ${volPhrase}, with ${breadthPct}% of the names we watch above their own 50-day average price. Sell ${deltaPhrase} — well below the stock price — and keep it short at ${dtePhrase} so you are not stuck in the storm, but only if you are paid ${arocPhrase}.`;
  }
}

export async function getMarketRegime(opts?: { universe?: string[] }): Promise<RegimeReading> {
  const universe = opts?.universe && opts.universe.length > 0 ? opts.universe : DEFAULT_UNIVERSE;
  const asOf = new Date().toISOString();
  const signals: RegimeSignal[] = [];

  const [quotesResult, spyBarsResult] = await Promise.allSettled([
    getQuotes([...new Set([...universe, "SPY", "QQQ", "IWM"])]),
    getHistory("SPY", 60),
  ]);

  const quotes = quotesResult.status === "fulfilled" ? quotesResult.value : [];
  const spyCloses = spyBarsResult.status === "fulfilled" ? spyBarsResult.value.map((b) => b.close) : [];
  const bySymbol = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]));

  const spyQuote = bySymbol.get("SPY");
  const qqqQuote = bySymbol.get("QQQ");
  const iwmQuote = bySymbol.get("IWM");

  const [spyTech, qqqTech, iwmTech] = await Promise.all([
    spyQuote ? analyzeTechnicals("SPY", spyQuote).catch(() => null) : Promise.resolve(null),
    qqqQuote ? analyzeTechnicals("QQQ", qqqQuote).catch(() => null) : Promise.resolve(null),
    iwmQuote ? analyzeTechnicals("IWM", iwmQuote).catch(() => null) : Promise.resolve(null),
  ]);

  // 1. SPY trend vs its own moving averages — max +/- 25
  let trendPoints = 0;
  if (spyTech) {
    trendPoints += spyTech.above20sma ? 7 : -7;
    trendPoints += spyTech.above50sma ? 9 : -9;
    trendPoints += spyTech.above200sma ? 9 : -9;
    signals.push({
      label: "S&P 500 trend",
      value: `${spyTech.above20sma ? "above" : "below"} 20d, ${spyTech.above50sma ? "above" : "below"} 50d, ${spyTech.above200sma ? "above" : "below"} 200d`,
      contribution: trendPoints,
      note: "Where the S&P sits versus its own average price over the last 20, 50 and 200 trading days — above all three means the uptrend is intact.",
    });
  } else {
    signals.push({
      label: "S&P 500 trend",
      value: "unavailable",
      contribution: 0,
      note: "Could not read S&P price history, so trend is scored as neutral.",
    });
  }

  // 2. Volatility — max +/- 25
  const volatility = await readVolatility(spyCloses);
  const volPoints = clamp((20 - volatility.level) * 3, -25, 25);
  signals.push({
    label: volatility.source === "vix" ? "Volatility (VIX)" : "Volatility (realized)",
    value: volatility.source === "vix" ? `${volatility.level}` : `${volatility.level}% annualized`,
    contribution: round(volPoints),
    note: volatility.source === "vix"
      ? "The VIX is the market's estimate of how much the S&P will swing over the next month. Under 15 is calm, over 28 is genuine stress."
      : "Annualized swing size computed from the S&P's own last 20 days, used because a live fear gauge was unavailable. Over 25% is genuine stress.",
  });

  // 3. Breadth — max +/- 25. The strongest signal we have and it is nearly free.
  const universeQuotes = universe
    .map((s) => bySymbol.get(s.toUpperCase()))
    .filter((q): q is NonNullable<typeof q> => !!q);
  if (universeQuotes.length < universe.length) {
    console.warn(
      `Regime: quotes returned ${universeQuotes.length}/${universe.length} universe symbols; breadth is computed on what came back.`
    );
  }

  let breadth = breadthFromQuotes(universeQuotes);
  if (breadth.counted < universe.length * 0.4) {
    breadth = await breadthFromHistory(universe).catch(() => breadth);
  }
  const breadthPoints = clamp((breadth.pct - 50) * 0.5, -25, 25);
  signals.push({
    label: "Breadth",
    value: breadth.counted < universe.length
      ? `${breadth.pct}% of a ${breadth.counted}-name sample (from ${universe.length} tracked) above their 50-day average`
      : `${breadth.pct}% of ${breadth.counted} names above their 50-day average`,
    contribution: round(breadthPoints),
    note: "How many stocks are actually participating. A rally carried by a handful of names is fragile; broad participation is not.",
  });

  // 4. Risk appetite — max +/- 15
  let appetitePoints = 0;
  if (spyTech && (qqqTech || iwmTech)) {
    const qqqEdge = qqqTech ? qqqTech.change20d - spyTech.change20d : 0;
    const iwmEdge = iwmTech ? iwmTech.change20d - spyTech.change20d : 0;
    appetitePoints = clamp((qqqEdge + iwmEdge) * 1.5, -15, 15);
    signals.push({
      label: "Risk appetite",
      value: `Nasdaq ${qqqEdge >= 0 ? "+" : ""}${round(qqqEdge)}%, small caps ${iwmEdge >= 0 ? "+" : ""}${round(iwmEdge)}% vs S&P over 20 days`,
      contribution: round(appetitePoints),
      note: "When tech and small companies outrun the S&P, buyers are willing to take risk. When they lag, money is hiding in the biggest, safest names.",
    });
  }

  // 5. Trend quality — max +/- 10
  let qualityPoints = 0;
  if (spyTech) {
    qualityPoints = clamp(spyTech.change5d * 1.0 + spyTech.change20d * 0.5, -10, 10);
    signals.push({
      label: "Recent momentum",
      value: `S&P ${spyTech.change5d >= 0 ? "+" : ""}${round(spyTech.change5d)}% over 5 days, ${spyTech.change20d >= 0 ? "+" : ""}${round(spyTech.change20d)}% over 20 days`,
      contribution: round(qualityPoints),
      note: "Direction and pace of the last month. Steady gains reinforce the trend; a sharp drop is what actually hurts a put seller.",
    });
  }

  const score = Math.round(clamp(trendPoints + volPoints + breadthPoints + appetitePoints + qualityPoints, -100, 100));

  const stressed = volatility.source === "vix"
    ? volatility.level > VOLATILE_VIX
    : volatility.level > VOLATILE_REALIZED;

  const regime: Regime = stressed
    ? "VOLATILE"
    : score >= 35
      ? "RISK_ON"
      : score <= -35
        ? "RISK_OFF"
        : "NEUTRAL";

  const base = RECOMMENDATIONS[regime];

  return {
    regime,
    score,
    asOf,
    signals,
    volatility,
    breadthPct: breadth.pct,
    recommended: { ...base, stance: buildStance(regime, base, breadth.pct, volatility) },
  };
}

export function regimeToScanConfig(r: RegimeReading): Partial<CSPScanConfig> {
  return {
    minDelta: r.recommended.minDelta,
    maxDelta: r.recommended.maxDelta,
    minDTE: r.recommended.minDTE,
    maxDTE: r.recommended.maxDTE,
    minAROC: r.recommended.minAROC,
  };
}
