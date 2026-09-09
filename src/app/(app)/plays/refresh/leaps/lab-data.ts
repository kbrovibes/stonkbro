/**
 * Client-side shapes and helpers for the LEAPS Lab and PMCC Income screens.
 * Types come straight from the server modules (type-only, so nothing from
 * the server bundle leaks into the client). Nothing here fetches.
 */

import type { LeapsPin, LeapsScanRow, PinRecommendation } from "@/lib/db/leaps";
import type { LeapsPick } from "@/lib/options/leaps-scan";
import type { GridResponse, LeapsStrikePick, PricedStrike } from "@/lib/options/leaps-grid";
import { fmtExpiry } from "../scanner-data";

export type { LeapsPin, LeapsScanRow, PinRecommendation, LeapsPick, LeapsStrikePick, GridResponse, PricedStrike };

export interface LeapsPayload {
  scan: LeapsScanRow | null;
  pins: LeapsPin[];
}

export const LEAPS_URL = "/api/leaps";
export const LEAPS_TTL_MS = 5 * 60_000;

/** `2h ago` — age of a scan row. */
export function ago(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  const mins = Math.round((Date.now() - ts) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function fmtStrike(strike: number): string {
  return Number.isInteger(strike) ? `$${strike}` : `$${strike.toFixed(2).replace(/\.?0+$/, "")}`;
}

export function fmtPct(n: number, decimals = 0): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function fmtIv(iv: number): string {
  return iv > 0 ? `${Math.round(iv * 100)}%` : "—";
}

export function fmtDelta(delta: number | null | undefined): string {
  return typeof delta === "number" ? `${delta.toFixed(2)}Δ` : "—Δ";
}

/** `Long 145C Jan'28 · 0.71Δ · $210.50` */
export function structureLine(pick: LeapsPick): string {
  const r = pick.recommended;
  return `Long ${r.strike}C ${fmtExpiry(pick.expiry)} · ${fmtDelta(r.delta)} · $${r.mid.toFixed(2)}`;
}

export interface StrikeChip {
  strike: number;
  label: string;
  /** Recommended / ITM / OTM come from the scan; `user` strikes can be removed. */
  kind: "recommended" | "itm" | "otm" | "user";
}

export function hasRecommendation(rec: LeapsPin["recommended"]): rec is PinRecommendation {
  return typeof (rec as PinRecommendation).strike === "number";
}

/**
 * The strike chips for a ticker: the scan's three, then the user's, deduped,
 * in that order so the first chip is always the recommendation.
 */
export function strikeChips(pick: LeapsPick | null, pin: LeapsPin | null): StrikeChip[] {
  const chips: StrikeChip[] = [];
  const seen = new Set<number>();
  const push = (strike: number | undefined | null, kind: StrikeChip["kind"], label: string) => {
    if (typeof strike !== "number" || seen.has(strike)) return;
    seen.add(strike);
    chips.push({ strike, kind, label });
  };
  const rec = pin && hasRecommendation(pin.recommended) ? pin.recommended : null;
  push(rec?.strike ?? pick?.recommended.strike, "recommended", "Recommended");
  push(rec?.itm?.strike ?? pick?.itm?.strike, "itm", "ITM");
  push(rec?.otm?.strike ?? pick?.otm?.strike, "otm", "OTM");
  for (const s of pin?.strikes ?? []) push(s.strike, "user", "Added");
  return chips;
}

/** Tinted cell background — alpha scales with |return|, capped at 100%. */
export function cellTint(returnPct: number): string {
  const strength = Math.min(1, Math.abs(returnPct) / 100);
  const alpha = (0.06 + strength * 0.3).toFixed(3);
  return returnPct >= 0 ? `rgba(120, 220, 150, ${alpha})` : `rgba(255, 120, 110, ${alpha})`;
}
