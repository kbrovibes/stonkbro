const ET = "America/New_York";

/** Today's date as it reads in New York, `YYYY-MM-DD`. */
export function etToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function utc(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = utc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return utc(date).getUTCDay();
}

export function isWeekend(date: string): boolean {
  const w = weekday(date);
  return w === 0 || w === 6;
}

/** The Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const w = weekday(date);
  return addDays(date, w === 0 ? -6 : 1 - w);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Calendar days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
}

/** Weekdays strictly after `from` up to and including `to`. */
export function tradingDaysBetween(from: string, to: string): number {
  let n = 0;
  let d = from;
  while (d < to) {
    d = addDays(d, 1);
    if (!isWeekend(d)) n++;
  }
  return n;
}

/** Days to expiry as the option modules count it: whole days, floored at 0. */
export function dteOn(expiry: string, date: string): number {
  return Math.max(0, daysBetween(date, expiry));
}
