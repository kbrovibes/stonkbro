/** Time formatting helpers for the Jobs page. */

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function clockTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "3m ago", "2h ago" for today; "Yesterday 4:12 PM"; "Aug 12, 4:12 PM" older. */
export function relativeTime(iso: string, now: number): string {
  const d = new Date(iso);
  const diff = now - d.getTime();
  const today = startOfDay(new Date(now));
  const day = startOfDay(d);

  if (day === today) {
    if (diff < 60_000) return "just now";
    const m = Math.floor(diff / 60_000);
    if (m < 60) return `${m}m ago`;
    return `${Math.floor(m / 60)}h ago`;
  }
  if (day === today - 86_400_000) return `Yesterday ${clockTime(d)}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${clockTime(d)}`;
}

/** "4.2s", "48s", "3m 12s", "2h 5m" */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)}s`;
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s % 60)}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** Local calendar-day key for grouping, e.g. "2026-08-15". */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "Today", "Yesterday", or "Tuesday, Aug 12" (with year when not current). */
export function dayLabel(iso: string, now: number): string {
  const d = new Date(iso);
  const day = startOfDay(d);
  const today = startOfDay(new Date(now));
  if (day === today) return "Today";
  if (day === today - 86_400_000) return "Yesterday";
  const opts: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };
  if (d.getFullYear() !== new Date(now).getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString([], opts);
}
