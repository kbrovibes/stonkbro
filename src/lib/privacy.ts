// Privacy lock — shared constants + pure masking helpers (safe in RSC and
// client components). Lock state itself lives in the `pii_lock` cookie
// (httpOnly, set/cleared by /api/privacy) so server-rendered HTML is masked
// too, not just the client paint.

export const PII_LOCK_COOKIE = "pii_lock";

/** What a masked value renders as, everywhere. */
export const MASK = "•••••";

/**
 * Mask an already-formatted dollar string (or any wealth-revealing string).
 * Keeps a leading "+"/"-" out of the mask — sign direction is fine to show,
 * magnitude is not.
 */
export function maskValue(locked: boolean, formatted: string): string {
  return locked ? MASK : formatted;
}

/** Currency formatter that masks when locked. */
export function privateCurrency(
  locked: boolean,
  value: number,
  opts: Intl.NumberFormatOptions = {}
): string {
  if (locked) return MASK;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    ...opts,
  });
}

/** Counts (shares/contracts of real positions) reveal wealth too. */
export function privateCount(locked: boolean, value: number | string): string {
  return locked ? "••" : String(value);
}
