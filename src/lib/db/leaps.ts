/**
 * LEAPS Lab persistence: scan rows (service role — crons have no session)
 * and per-user pins (the user's own client, so RLS does the scoping).
 */

import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase-server";
import type { LeapsPick, LeapsScanResult } from "@/lib/options/leaps-scan";
import type { LeapsStrikePick } from "@/lib/options/leaps-grid";
import type { PmccIncomePick } from "@/lib/options/pmcc-income";

const SCANS = "leaps_scans";
const PINS = "leaps_pins";

export type LeapsScanType = "scheduled" | "manual";

export interface LeapsScanRow {
  id: string;
  created_at: string;
  scan_type: LeapsScanType;
  universe_size: number;
  leaps: LeapsPick[];
  pmcc: PmccIncomePick[];
  errors: string[];
  status: string;
}

export async function insertLeapsScan(result: LeapsScanResult, scanType: LeapsScanType): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from(SCANS)
    .insert({
      scan_type: scanType,
      universe_size: result.universeSize,
      leaps: result.leaps,
      pmcc: result.pmcc,
      errors: result.errors,
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error(`insertLeapsScan: ${error.message}`);
  return (data as { id: string }).id;
}

export async function getLatestLeapsScan(): Promise<LeapsScanRow | null> {
  const { data, error } = await supabaseAdmin
    .from(SCANS)
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestLeapsScan: ${error.message}`);
  return (data as LeapsScanRow | null) ?? null;
}

/* -------------------------------------------------------------------------
   Pins
   ------------------------------------------------------------------------- */

export interface PinRecommendation {
  strike: number;
  mid: number;
  iv: number;
  delta: number | null;
  score: number;
  why: string;
  capturedAt: string;
  itm?: LeapsStrikePick | null;
  otm?: LeapsStrikePick | null;
}

export interface PinStrike {
  strike: number;
  label: string;
  addedAt: string;
}

export interface LeapsPin {
  id: string;
  user_id: string;
  symbol: string;
  expiry: string;
  recommended: PinRecommendation | Record<string, never>;
  strikes: PinStrike[];
  compare_strike: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export async function listPins(userId: string): Promise<LeapsPin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PINS)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listPins: ${error.message}`);
  return (data ?? []) as LeapsPin[];
}

export async function getPin(userId: string, symbol: string): Promise<LeapsPin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PINS)
    .select("*")
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .maybeSingle();
  if (error) throw new Error(`getPin: ${error.message}`);
  return (data as LeapsPin | null) ?? null;
}

export async function upsertPin(
  userId: string,
  pin: { symbol: string; expiry: string; recommended: PinRecommendation }
): Promise<LeapsPin> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PINS)
    .upsert(
      {
        user_id: userId,
        symbol: pin.symbol,
        expiry: pin.expiry,
        recommended: pin.recommended,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,symbol" }
    )
    .select("*")
    .single();
  if (error) throw new Error(`upsertPin: ${error.message}`);
  return data as LeapsPin;
}

export interface PinPatch {
  strikes?: PinStrike[];
  compare_strike?: number | null;
  notes?: string | null;
}

export async function updatePin(userId: string, symbol: string, patch: PinPatch): Promise<LeapsPin> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(PINS)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("symbol", symbol)
    .select("*")
    .single();
  if (error) throw new Error(`updatePin: ${error.message}`);
  return data as LeapsPin;
}

export async function deletePin(userId: string, symbol: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from(PINS).delete().eq("user_id", userId).eq("symbol", symbol);
  if (error) throw new Error(`deletePin: ${error.message}`);
}
