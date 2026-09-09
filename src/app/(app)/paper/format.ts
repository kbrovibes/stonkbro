/** Formatting shared by the Paper screens. Real minus signs, tabular-safe. */

export const money = (n: number, decimals = 0): string =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const signedMoney = (n: number): string => `${n < 0 ? "−" : "+"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

export const signedPct = (n: number, places = 2): string => `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(places)}%`;

export const tone = (n: number): string => (n < 0 ? "var(--down)" : "var(--up)");

/** `MON SEP 8`, from a `YYYY-MM-DD`. */
export function dateEyebrow(date: string): string {
  return new Date(`${date}T12:00:00Z`)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .replace(",", "")
    .toUpperCase();
}

/** `Sep 8`. */
export function shortDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** `17 Oct`, the option-expiry spelling. */
export function expiryLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`;
}

/** `2h ago`, `just now`. */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** `10:04 AM` in New York. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
}

export interface StructureInput {
  kind: "stock" | "call" | "put";
  side: "long" | "short";
  qty: number;
  strike: number | null;
  expiry: string | null;
  avgPrice: number;
  delta?: number | null;
}

/** `100 sh @ 187.20` / `−1 250P 17 Oct · 0.22Δ`. */
export function structureLine(p: StructureInput): string {
  if (p.kind === "stock") return `${p.qty.toLocaleString("en-US")} sh @ ${p.avgPrice.toFixed(2)}`;
  const sign = p.side === "short" ? "−" : "+";
  const leg = `${sign}${p.qty} ${p.strike ?? ""}${p.kind === "call" ? "C" : "P"}${p.expiry ? ` ${expiryLabel(p.expiry)}` : ""}`;
  return p.delta != null ? `${leg} · ${p.delta.toFixed(2)}Δ` : leg;
}

export const STYLE_LABEL: Record<string, string> = {
  stocks: "STOCKS", options: "OPTIONS", mixed: "MIXED", margin: "MARGIN", "no-margin": "NO MARGIN",
  index: "INDEX", growth: "GROWTH", income: "INCOME", momentum: "MOMENTUM", contrarian: "CONTRARIAN",
  sector: "SECTOR", neutral: "NEUTRAL",
};

export const sessionLabel = (s: string | null | undefined): string => (s ? s.toUpperCase() : "");
