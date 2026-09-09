/** Simple moving average of the last `n` values, or null when there are too few. */
export function sma(values: readonly number[], n: number): number | null {
  if (n <= 0 || values.length < n) return null;
  let sum = 0;
  for (let i = values.length - n; i < values.length; i++) sum += values[i];
  return sum / n;
}

/** Wilder-smoothed 14-period RSI over closes. */
export function rsi14(values: readonly number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Percent change from the close `days` bars ago to the latest close. */
export function returnPct(values: readonly number[], days: number): number | null {
  if (days <= 0 || values.length <= days) return null;
  const then = values[values.length - 1 - days];
  const now = values[values.length - 1];
  if (!(then > 0)) return null;
  return (now / then - 1) * 100;
}
