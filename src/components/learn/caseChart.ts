// Shared geometry for the Learn v2 case-study charts. Pure + deterministic
// (same rule as chartMath.ts: no Math.random — SSR/CSR must match).

export type CaseBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export const CASE_W = 360;
export const CASE_PAD_L = 42;
export const CASE_PAD_R = 12;
export const CASE_PLOT_W = CASE_W - CASE_PAD_L - CASE_PAD_R;

export type Scale = {
  x: (i: number) => number;
  y: (price: number) => number;
  candleW: number;
  min: number;
  max: number;
};

export function makeScale(
  bars: CaseBar[],
  plotH: number,
  padT: number,
  extraLevels: number[] = []
): Scale {
  const lows = bars.map((b) => b.low).concat(extraLevels);
  const highs = bars.map((b) => b.high).concat(extraLevels);
  const rawMin = Math.min(...lows);
  const rawMax = Math.max(...highs);
  const pad = (rawMax - rawMin) * 0.06 || 1;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const step = CASE_PLOT_W / Math.max(bars.length, 1);
  return {
    x: (i) => CASE_PAD_L + step * (i + 0.5),
    y: (p) => padT + plotH - ((p - min) / (max - min)) * plotH,
    candleW: Math.min(7, Math.max(1.6, step * 0.62)),
    min,
    max,
  };
}

/** Y-axis ticks: 4 round-ish levels inside [min, max]. */
export function yTicks(min: number, max: number): number[] {
  const span = max - min;
  const rawStep = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / mag) * mag;
  const first = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = first; v <= max; v += step) out.push(Math.round(v * 100) / 100);
  return out;
}

export const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

export const LINE_COLORS: Record<string, string> = {
  red: "#f43f5e",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  stone: "#a8a29e",
};
