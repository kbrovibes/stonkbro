/**
 * Daily bars for the small charts, cached across requests.
 *
 * `getHistory` issues an uncached Tradier call, which is right for a scan
 * that runs once but wrong for a home screen that renders on every
 * navigation: a dozen symbols would be a dozen round-trips per view, against
 * a 120/minute budget. Daily bars change once a day, so they are cached for
 * fifteen minutes and the live quote is spliced onto the end — which is what
 * actually makes the sparkline agree with the percentage beside it.
 */

import { unstable_cache } from "next/cache";
import { getHistory, type DailyBar } from "./history";

/** Enough for the sparkline (9) and the 50-day cross test (52). */
const BAR_WINDOW = 60;
const SPARK_POINTS = 9;

export const getSparkBars = unstable_cache(
  async (symbol: string): Promise<DailyBar[]> => getHistory(symbol, BAR_WINDOW),
  ["refresh-spark-bars"],
  { revalidate: 900 },
);

/**
 * The last `points` closes, with the live price as the final point.
 *
 * When today's bar has already printed the live price replaces its close;
 * otherwise it is appended. Either way the series ends where the row's
 * percentage says the stock is.
 */
export function toSparkPoints(
  bars: readonly DailyBar[],
  livePrice: number,
  today: string,
  points = SPARK_POINTS,
): number[] {
  const closes = bars.map((b) => b.close).filter((c) => c > 0);
  if (closes.length === 0) return [];

  if (livePrice > 0) {
    if (bars[bars.length - 1]?.date === today) closes[closes.length - 1] = livePrice;
    else closes.push(livePrice);
  }
  return closes.slice(-points);
}
