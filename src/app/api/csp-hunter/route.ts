import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getRecentScans } from "@/lib/options/csp-delta";
import { scanForCSPs, CSPScanConfig } from "@/lib/options/csp-scanner";
import { computeDelta, getLastScan, saveScanResult } from "@/lib/options/csp-delta";
import { analyzeCSPCandidates } from "@/lib/options/csp-analyst";

/** GET — fetch recent scan results */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scans = await getRecentScans(10);

  return NextResponse.json({
    scans: scans.map((s) => ({
      id: s.id,
      createdAt: s.created_at,
      scanType: s.scan_type,
      candidateCount: s.candidate_count,
      capital: s.capital,
      candidates: s.candidates,
      delta: s.delta,
      claudeAnalysis: s.claude_analysis,
      status: s.status,
    })),
  });
}

/** POST — trigger a manual scan */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let config: CSPScanConfig = {};
  try {
    const body = await request.json();
    if (body.capital) config.capital = body.capital;
    if (body.tickers) config.tickers = body.tickers;
    if (body.minDTE) config.minDTE = body.minDTE;
    if (body.maxDTE) config.maxDTE = body.maxDTE;
  } catch {
    // Use defaults
  }

  const scan = await scanForCSPs(config);

  let delta = null;
  const lastScan = await getLastScan();
  if (lastScan) {
    delta = computeDelta(scan.candidates, lastScan.candidates, lastScan.scannedAt);
  }

  let analysis = null;
  if (scan.candidates.length > 0) {
    try {
      analysis = await analyzeCSPCandidates(scan.candidates, delta, scan.capital);
    } catch (e) {
      console.error("[CSP Hunter] Manual scan Claude analysis failed:", e);
    }
  }

  const scanId = await saveScanResult(
    scan,
    delta,
    analysis?.text ?? null,
    analysis?.provider ?? null,
    "manual"
  );

  return NextResponse.json({
    scanId,
    candidates: scan.candidates,
    delta,
    claudeAnalysis: analysis?.text ?? null,
    scannedAt: scan.scannedAt,
    capital: scan.capital,
    errors: scan.errors,
  });
}
