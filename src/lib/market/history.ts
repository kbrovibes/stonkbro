/**
 * Fetch historical price data from Tradier (or generate mock).
 */

import { tradierFetch } from "./tradier-client";

export type DailyBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

async function tradierHistory(symbol: string, days: number): Promise<DailyBar[]> {
  if (!process.env.TRADIER_API_TOKEN) return mockHistory(symbol, days);

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - Math.ceil(days * 1.5)); // extra buffer for weekends

  try {
    const res = await tradierFetch(
      `/markets/history?symbol=${symbol}&interval=daily&start=${start.toISOString().split("T")[0]}&end=${end.toISOString().split("T")[0]}`
    );
    if (!res) return mockHistory(symbol, days);

    const data = await res.json();
    const history = data.history?.day;
    if (!history) return mockHistory(symbol, days);

    const bars: DailyBar[] = (Array.isArray(history) ? history : [history]).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (d: any) => ({
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      })
    );

    return bars.slice(-days);
  } catch {
    return mockHistory(symbol, days);
  }
}

function mockHistory(symbol: string, days: number): DailyBar[] {
  // Generate deterministic mock history
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
  hash = Math.abs(hash);

  const basePrice = 50 + (hash % 500);
  const bars: DailyBar[] = [];
  let price = basePrice * 0.8;

  for (let i = days; i > 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    const change = (Math.sin(hash + i * 0.1) * 0.02 + 0.001) * price;
    price += change;
    const vol = 5_000_000 + (hash * i) % 20_000_000;

    bars.push({
      date: d.toISOString().split("T")[0],
      open: price - change * 0.3,
      high: price + Math.abs(change) * 0.5,
      low: price - Math.abs(change) * 0.5,
      close: price,
      volume: vol,
    });
  }

  return bars.slice(-days);
}

/** Return the close price on a specific date (or the first trading day on/after it). */
export async function getHistoricalClose(symbol: string, date: string): Promise<number | null> {
  if (!process.env.TRADIER_API_TOKEN) return null;
  try {
    const start = date;
    // Look up to 7 days forward in case `date` is a weekend/holiday
    const endDt = new Date(date);
    endDt.setDate(endDt.getDate() + 7);
    const end = endDt.toISOString().split("T")[0];

    const res = await tradierFetch(
      `/markets/history?symbol=${symbol}&interval=daily&start=${start}&end=${end}`
    );
    if (!res) return null;
    const data = await res.json();
    const history = data.history?.day;
    if (!history) return null;
    const bars = Array.isArray(history) ? history : [history];
    // First bar with date >= requested
    for (const b of bars) {
      if (b?.date && b.date >= date && typeof b.close === "number") return b.close;
    }
    return bars[0]?.close ?? null;
  } catch {
    return null;
  }
}

export async function getHistory(symbol: string, days = 200): Promise<DailyBar[]> {
  return tradierHistory(symbol, days);
}
