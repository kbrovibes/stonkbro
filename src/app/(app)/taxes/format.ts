import { MASK, privateCurrency } from "@/lib/privacy";

/** Whole-dollar currency, masked under the privacy lock. */
export function fmtMoney(locked: boolean, value: number): string {
  return privateCurrency(locked, Math.round(value));
}

/** Signed whole-dollar currency ("+$1,234" / "-$567"), masked when locked. */
export function fmtSignedMoney(locked: boolean, value: number): string {
  if (locked) return MASK;
  const abs = privateCurrency(false, Math.abs(Math.round(value)));
  return value < 0 ? `-${abs}` : `+${abs}`;
}

/** "Sep 15, 2026" from YYYY-MM-DD (UTC-safe — no timezone drift). */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Jun 1 – Aug 31" from two YYYY-MM-DD dates. */
export function fmtRange(startISO: string, endISO: string): string {
  const f = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  };
  return `${f(startISO)} – ${f(endISO)}`;
}
