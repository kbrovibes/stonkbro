/**
 * US equity session state, from the clock alone.
 *
 * Pure and dependency-free so the same function can run during the server
 * render and then again on a client timer — the Pulse header re-derives the
 * label every 30s rather than re-fetching anything.
 *
 * Holidays are deliberately not modelled: there is no holiday calendar in
 * this codebase and inventing one would be a table nobody maintains. The
 * consequence is that Thanksgiving reads OPEN, which is wrong but quiet —
 * a wrong holiday label is a far smaller error than a wrong price, and the
 * numbers beside it come from the feed either way.
 */

export type MarketStatus = "PRE" | "OPEN" | "AFTER" | "CLOSED";

const ET = "America/New_York";

/** Minutes past midnight, and the weekday, as they read in New York. */
function easternClock(now: Date): { minutes: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // `hour12: false` can render midnight as "24" in some engines.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));

  return { minutes: hour * 60 + minute, weekday };
}

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const { minutes, weekday } = easternClock(now);
  if (weekday === 0 || weekday === 6) return "CLOSED";
  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) return "PRE";
  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) return "OPEN";
  if (minutes >= 16 * 60 && minutes < 20 * 60) return "AFTER";
  return "CLOSED";
}

const STATUS_LABELS: Record<MarketStatus, string> = {
  PRE: "PRE-MARKET",
  OPEN: "MARKET OPEN",
  AFTER: "AFTER HOURS",
  CLOSED: "MARKET CLOSED",
};

/** The eyebrow's trailing clause — `MARKET OPEN`, `PRE-MARKET`, … */
export function marketStatusLabel(status: MarketStatus): string {
  return STATUS_LABELS[status];
}

/** `FRI SEP 4`, in the market's own timezone rather than the device's. */
export function easternDateLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(now)
    .replace(",", "")
    .toUpperCase();
}
