/**
 * CSP Alpha Hunter — Delta Tracker
 *
 * Compares the current scan results against the previous scan stored in Supabase.
 * Highlights: new entries, premium increases/decreases, dropped candidates,
 * and support level changes.
 */

import { CSPHunterCandidate, CSPScanResult } from "./csp-scanner";
import { supabaseAdmin } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeltaChange = {
  symbol: string;
  strike: number;
  expiry: string;
  changeType: "new" | "premium_up" | "premium_down" | "dropped" | "support_lost";
  current?: CSPHunterCandidate;
  previous?: CSPHunterCandidate;
  premiumChange?: number;     // absolute change in mid price
  premiumChangePct?: number;  // % change
  arocChange?: number;        // change in AROC
  message: string;
};

export type ScanDelta = {
  newEntries: DeltaChange[];
  premiumIncreased: DeltaChange[];
  premiumDecreased: DeltaChange[];
  dropped: DeltaChange[];
  supportLost: DeltaChange[];
  totalChanges: number;
  previousScanAt: string | null;
  hoursSinceLast: number | null;
};

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

/** Save a completed scan to Supabase */
export async function saveScanResult(
  scan: CSPScanResult,
  delta: ScanDelta | null,
  claudeAnalysis: string | null,
  claudeProvider: string | null,
  scanType: "scheduled" | "manual" = "scheduled"
): Promise<string | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("csp_scans")
    .insert({
      scan_type: scanType,
      ticker_count: scan.scannedTickers.length,
      candidate_count: scan.candidates.length,
      capital: scan.capital,
      candidates: scan.candidates,
      delta: delta ? {
        new: delta.newEntries,
        premium_increased: delta.premiumIncreased,
        premium_decreased: delta.premiumDecreased,
        dropped: delta.dropped,
        support_lost: delta.supportLost,
      } : null,
      claude_analysis: claudeAnalysis,
      claude_provider: claudeProvider,
      status: "completed",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save CSP scan:", error);
    return null;
  }

  return data?.id ?? null;
}

/** Get the most recent completed scan */
export async function getLastScan(): Promise<{
  candidates: CSPHunterCandidate[];
  scannedAt: string;
} | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("csp_scans")
    .select("candidates, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    candidates: data.candidates as CSPHunterCandidate[],
    scannedAt: data.created_at,
  };
}

/** Get recent scan history */
export async function getRecentScans(limit = 10): Promise<Array<{
  id: string;
  created_at: string;
  scan_type: string;
  candidate_count: number;
  capital: number;
  candidates: CSPHunterCandidate[];
  delta: ScanDelta | null;
  claude_analysis: string | null;
  status: string;
}>> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("csp_scans")
    .select("*")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data;
}

// ---------------------------------------------------------------------------
// Delta computation
// ---------------------------------------------------------------------------

/** Compare current scan results against the previous scan */
export function computeDelta(
  current: CSPHunterCandidate[],
  previous: CSPHunterCandidate[],
  previousScanAt: string
): ScanDelta {
  const prevMap = new Map<string, CSPHunterCandidate>();
  for (const c of previous) {
    prevMap.set(candidateKey(c), c);
  }

  const currMap = new Map<string, CSPHunterCandidate>();
  for (const c of current) {
    currMap.set(candidateKey(c), c);
  }

  const newEntries: DeltaChange[] = [];
  const premiumIncreased: DeltaChange[] = [];
  const premiumDecreased: DeltaChange[] = [];
  const supportLost: DeltaChange[] = [];

  // Check current candidates against previous
  for (const [key, curr] of currMap) {
    const prev = prevMap.get(key);

    if (!prev) {
      // New entry
      newEntries.push({
        symbol: curr.symbol,
        strike: curr.strike,
        expiry: curr.expiry,
        changeType: "new",
        current: curr,
        message: `🆕 ${curr.symbol} $${curr.strike} put appeared — $${curr.mid.toFixed(2)} (${curr.aroc}% AROC)`,
      });
      continue;
    }

    // Premium change
    const premDiff = curr.mid - prev.mid;
    const premPct = prev.mid > 0 ? (premDiff / prev.mid) * 100 : 0;
    const arocDiff = curr.aroc - prev.aroc;

    if (premPct > 5) {
      premiumIncreased.push({
        symbol: curr.symbol,
        strike: curr.strike,
        expiry: curr.expiry,
        changeType: "premium_up",
        current: curr,
        previous: prev,
        premiumChange: Math.round(premDiff * 100) / 100,
        premiumChangePct: Math.round(premPct * 10) / 10,
        arocChange: Math.round(arocDiff * 10) / 10,
        message: `📈 ${curr.symbol} $${curr.strike} premium UP $${prev.mid.toFixed(2)} → $${curr.mid.toFixed(2)} (+${premPct.toFixed(1)}%) — AROC ${prev.aroc}% → ${curr.aroc}%`,
      });
    } else if (premPct < -5) {
      premiumDecreased.push({
        symbol: curr.symbol,
        strike: curr.strike,
        expiry: curr.expiry,
        changeType: "premium_down",
        current: curr,
        previous: prev,
        premiumChange: Math.round(premDiff * 100) / 100,
        premiumChangePct: Math.round(premPct * 10) / 10,
        arocChange: Math.round(arocDiff * 10) / 10,
        message: `📉 ${curr.symbol} $${curr.strike} premium DOWN $${prev.mid.toFixed(2)} → $${curr.mid.toFixed(2)} (${premPct.toFixed(1)}%)`,
      });
    }

    // Support lost — was near support before, not anymore
    if (prev.nearSupport && !curr.nearSupport) {
      supportLost.push({
        symbol: curr.symbol,
        strike: curr.strike,
        expiry: curr.expiry,
        changeType: "support_lost",
        current: curr,
        previous: prev,
        message: `⚠️ ${curr.symbol} $${curr.strike} lost support level (was $${prev.supportLevel}, now $${curr.supportLevel})`,
      });
    }
  }

  // Find dropped candidates (were in previous, not in current)
  const dropped: DeltaChange[] = [];
  for (const [key, prev] of prevMap) {
    if (!currMap.has(key)) {
      dropped.push({
        symbol: prev.symbol,
        strike: prev.strike,
        expiry: prev.expiry,
        changeType: "dropped",
        previous: prev,
        message: `❌ ${prev.symbol} $${prev.strike} put dropped from scan (was ${prev.aroc}% AROC)`,
      });
    }
  }

  const now = new Date();
  const prevTime = new Date(previousScanAt);
  const hoursSinceLast = (now.getTime() - prevTime.getTime()) / (1000 * 60 * 60);

  return {
    newEntries,
    premiumIncreased,
    premiumDecreased,
    dropped,
    supportLost,
    totalChanges:
      newEntries.length +
      premiumIncreased.length +
      premiumDecreased.length +
      dropped.length +
      supportLost.length,
    previousScanAt,
    hoursSinceLast: Math.round(hoursSinceLast * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unique key for a candidate (symbol + strike + expiry) */
function candidateKey(c: { symbol: string; strike: number; expiry: string }): string {
  return `${c.symbol}:${c.strike}:${c.expiry}`;
}
