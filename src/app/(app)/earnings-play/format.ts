export const usd = (n: number, digits = 0) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const signedUsd = (n: number) => `${n < 0 ? "−" : "+"}${usd(n)}`;

export const signedPct = (n: number, digits = 1) => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(digits)}%`;

export const tone = (n: number) =>
  n > 0 ? "text-emerald-700 dark:text-gain-strong" : n < 0 ? "text-rose-700 dark:text-loss-strong" : "text-stone-500 dark:text-text-subtle";

export function dayLabel(date: string, withWeekday = true): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    ...(withWeekday ? { weekday: "short" } : {}),
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function timingShort(t: string): string {
  return t === "after_market" ? "After close" : t === "before_market" ? "Before open" : "Time TBA";
}

export const CARD = "rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated";
export const EYEBROW = "text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-text-subtle";
