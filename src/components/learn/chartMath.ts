// Shared, dependency-free math + deterministic synthetic-data helpers for the
// interactive Learn components. Everything here is pure and seeded so server and
// client render identically (no hydration mismatch) and lessons work offline.

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — small, fast, deterministic. NEVER use Math.random
// in Learn components; hydration depends on identical SSR/CSR output.
// ---------------------------------------------------------------------------
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller standard normal from a uniform generator.
export function randNormal(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type Candle = { open: number; high: number; low: number; close: number };

// ---------------------------------------------------------------------------
// Indicators — these teach, so they follow the textbook definitions.
// Outputs align index-for-index with the input; warmup slots are null.
// ---------------------------------------------------------------------------

export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  // Seed with the SMA of the first `period` values (standard practice).
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

// Wilder's RSI.
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = values[i] - values[i - 1];
    if (delta >= 0) avgGain += delta;
    else avgLoss -= delta;
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const delta = values[i] - values[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export type MacdResult = {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
};

export function macd(
  values: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): MacdResult {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine: (number | null)[] = values.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null
      ? (emaFast[i] as number) - (emaSlow[i] as number)
      : null,
  );
  // Signal = EMA of the defined MACD region.
  const firstIdx = macdLine.findIndex((v) => v != null);
  const signal: (number | null)[] = new Array(values.length).fill(null);
  if (firstIdx !== -1) {
    const defined = macdLine.slice(firstIdx).map((v) => v as number);
    const sig = ema(defined, signalPeriod);
    for (let i = 0; i < sig.length; i++) {
      if (sig[i] != null) signal[firstIdx + i] = sig[i];
    }
  }
  const histogram: (number | null)[] = values.map((_, i) =>
    macdLine[i] != null && signal[i] != null
      ? (macdLine[i] as number) - (signal[i] as number)
      : null,
  );
  return { macd: macdLine, signal, histogram };
}

export type BollingerResult = {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  bandwidth: (number | null)[];
};

export function bollinger(values: number[], period = 20, mult = 2): BollingerResult {
  const middle = sma(values, period);
  const upper: (number | null)[] = new Array(values.length).fill(null);
  const lower: (number | null)[] = new Array(values.length).fill(null);
  const bandwidth: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i];
    if (mean == null) continue;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + mult * sd;
    lower[i] = mean - mult * sd;
    bandwidth[i] = mean !== 0 ? ((upper[i] as number) - (lower[i] as number)) / mean : 0;
  }
  return { upper, middle, lower, bandwidth };
}

// Indices where line A crosses above (dir 'up') or below (dir 'down') line B.
export function crossovers(
  a: (number | null)[],
  b: (number | null)[],
): { index: number; dir: "up" | "down" }[] {
  const out: { index: number; dir: "up" | "down" }[] = [];
  for (let i = 1; i < a.length; i++) {
    const a0 = a[i - 1];
    const a1 = a[i];
    const b0 = b[i - 1];
    const b1 = b[i];
    if (a0 == null || a1 == null || b0 == null || b1 == null) continue;
    const prev = a0 - b0;
    const cur = a1 - b1;
    if (prev <= 0 && cur > 0) out.push({ index: i, dir: "up" });
    else if (prev >= 0 && cur < 0) out.push({ index: i, dir: "down" });
  }
  return out;
}

// Percentile threshold of the defined values (0..1).
export function percentile(values: (number | null)[], p: number): number | null {
  const defined = values.filter((v): v is number => v != null).sort((x, y) => x - y);
  if (defined.length === 0) return null;
  const idx = Math.min(defined.length - 1, Math.max(0, Math.floor(p * (defined.length - 1))));
  return defined[idx];
}

// ---------------------------------------------------------------------------
// Synthetic price series.
// ---------------------------------------------------------------------------

export type SeriesPreset = "trend" | "meanreversion" | "squeeze" | "divergence";

// Build OHLC candles from a close series with deterministic wicks.
function closesToCandles(closes: number[], rng: () => number, wickScale = 1): Candle[] {
  return closes.map((c, i) => {
    const open = i === 0 ? c : closes[i - 1];
    const body = Math.abs(c - open);
    const wick = (0.2 + rng() * 0.8 + body * 0.3) * wickScale;
    return {
      open,
      close: c,
      high: Math.max(open, c) + wick * (0.4 + rng() * 0.6),
      low: Math.min(open, c) - wick * (0.4 + rng() * 0.6),
    };
  });
}

// A ~`count`-bar daily series shaped by preset so each lesson can demonstrate
// its concept on a chart that actually exhibits it.
export function genSeries(seed: number, count = 120, preset: SeriesPreset = "trend"): Candle[] {
  const rng = mulberry32(seed);
  const closes: number[] = [];
  let price = 100;

  if (preset === "divergence") {
    // Two rallies: second makes a higher price high on weaker momentum, so RSI
    // prints a lower high — the classic bearish divergence.
    for (let i = 0; i < count; i++) {
      const t = i / count;
      let drift: number;
      let vol: number;
      if (t < 0.32) {
        drift = 0.85;
        vol = 0.7;
      } else if (t < 0.5) {
        drift = -0.7;
        vol = 0.9;
      } else if (t < 0.8) {
        drift = 0.42; // slower grind up -> weaker RSI at the higher high
        vol = 1.5;
      } else {
        drift = -1.1;
        vol = 1.2;
      }
      price += drift + randNormal(rng) * vol;
      closes.push(price);
    }
    return closesToCandles(closes, rng, 1.1);
  }

  for (let i = 0; i < count; i++) {
    const t = i / count;
    let drift = 0;
    let vol = 1.1;
    if (preset === "trend") {
      drift = 0.38;
      vol = 1.0;
      // periodic pullbacks keep it realistic
      if (Math.sin(t * Math.PI * 4) < -0.7) drift = -0.9;
    } else if (preset === "meanreversion") {
      drift = (100 - price) * 0.07;
      vol = 1.5;
    } else if (preset === "squeeze") {
      // quiet coil for the first ~60%, then volatility expansion + breakout
      if (t < 0.6) {
        drift = 0;
        vol = 0.32;
      } else {
        drift = 0.6;
        vol = 1.9;
      }
    }
    price += drift + randNormal(rng) * vol;
    closes.push(price);
  }
  return closesToCandles(closes, rng, preset === "squeeze" ? 0.9 : 1);
}

// ---------------------------------------------------------------------------
// Support/resistance training series for LevelFinder.
// ---------------------------------------------------------------------------

export type SRSeries = {
  candles: Candle[];
  mode: "support" | "resistance";
  level: number;
  zone: { low: number; high: number };
  touches: number[]; // bar indices that tag the level
  minPrice: number;
  maxPrice: number;
};

export function genSRSeries(
  seed: number,
  mode: "support" | "resistance" = "support",
  difficulty: 1 | 2 | 3 = 1,
): SRSeries {
  const rng = mulberry32(seed);
  const n = 32;
  const level = mode === "support" ? 92 : 112;
  const amp = 8 + rng() * 3;
  const touchCount = difficulty === 1 ? 4 : 3;
  const noiseAmp = difficulty === 1 ? 0.35 : difficulty === 2 ? 0.8 : 1.5;
  const wickBase = difficulty === 1 ? 0.25 : 0.5;
  const wickOver = difficulty === 1 ? 0.5 : difficulty === 2 ? 1.2 : 2.3;
  const cycleLen = n / touchCount;

  const candles: Candle[] = [];
  const touches: number[] = [];
  let prevClose = mode === "support" ? level + amp * 0.5 : level - amp * 0.5;

  for (let i = 0; i < n; i++) {
    const phase = (i % cycleLen) / cycleLen; // 0 at each cycle boundary
    const swing = amp * Math.sin(phase * Math.PI); // 0 at boundaries, amp mid
    const target = mode === "support" ? level + swing : level - swing;
    const close = target + (rng() - 0.5) * 2 * noiseAmp;
    const open = prevClose;
    const high = Math.max(open, close) + wickBase + rng() * wickOver;
    const low = Math.min(open, close) - wickBase - rng() * wickOver;
    candles.push({ open, high, low, close });
    prevClose = close;
  }

  for (let k = 0; k < touchCount; k++) {
    const idx = Math.round(k * cycleLen);
    if (idx < n) touches.push(idx);
  }

  // Zone wraps the actual extremes the price prints at the level.
  const band = difficulty === 1 ? 1.0 : difficulty === 2 ? 1.7 : 2.6;
  let zone: { low: number; high: number };
  if (mode === "support") {
    const lows = touches.map((i) => candles[i].low);
    zone = { low: Math.min(...lows) - 0.2, high: level + band };
  } else {
    const highs = touches.map((i) => candles[i].high);
    zone = { low: level - band, high: Math.max(...highs) + 0.2 };
  }

  const allPrices = candles.flatMap((c) => [c.high, c.low]);
  return {
    candles,
    mode,
    level,
    zone,
    touches,
    minPrice: Math.min(...allPrices) - 1.5,
    maxPrice: Math.max(...allPrices) + 1.5,
  };
}
