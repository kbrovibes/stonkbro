import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getRecentScans } from "@/lib/options/csp-delta";
import { scanForCSPs, scanForCalls, scanForLeaps, CSPScanConfig } from "@/lib/options/csp-scanner";
import { computeDelta, getLastScan, saveScanResult } from "@/lib/options/csp-delta";
import { analyzeCSPCandidates } from "@/lib/options/csp-analyst";

/** GET — fetch recent scan results (public, no user context needed) */
export async function GET() {
  const scans = await getRecentScans(10);

  return NextResponse.json({
    scans: scans.map((s) => ({
      id: s.id,
      createdAt: s.created_at,
      scanType: s.scan_type,
      candidateCount: s.candidate_count,
      capital: s.capital,
      candidates: s.candidates,
      callCandidates: s.call_candidates ?? [],
      leapsCandidates: s.leaps_candidates ?? [],
      delta: s.delta,
      claudeAnalysis: s.claude_analysis,
      claudeProvider: s.claude_provider,
      claudeModel: s.claude_model,
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

  const config: CSPScanConfig = {};
  try {
    const body = await request.json();
    if (body.capital) config.capital = body.capital;
    if (body.tickers) config.tickers = body.tickers;
    if (body.minDTE) config.minDTE = body.minDTE;
    if (body.maxDTE) config.maxDTE = body.maxDTE;
  } catch {
    // Use defaults
  }

  // Run all three scans in parallel
  const [scan, callScan, leapsScan] = await Promise.all([
    scanForCSPs(config),
    scanForCalls(config),
    scanForLeaps(config),
  ]);

  // Deduplicate within each section (1 ticker per section), no cross-section dedup
  const dedupSection = <T extends { symbol: string }>(items: T[], max: number): T[] => {
    const seen = new Set<string>();
    return items.filter((c) => {
      if (seen.has(c.symbol)) return false;
      seen.add(c.symbol);
      return true;
    }).slice(0, max);
  };

  const dedupedCSPs = dedupSection(scan.candidates, 10);
  const dedupedCalls = dedupSection(callScan.candidates, 10);
  const dedupedLeaps = dedupSection(leapsScan.candidates, 10);

  let delta = null;
  const lastScan = await getLastScan();
  if (lastScan) {
    delta = computeDelta(dedupedCSPs, lastScan.candidates, lastScan.scannedAt);
  }

  let analysis = null;
  if (dedupedCSPs.length > 0) {
    try {
      analysis = await analyzeCSPCandidates(dedupedCSPs, delta, scan.capital, user.id);
    } catch (e) {
      console.error("[Options Scanner] AI analysis failed:", e);
    }
  }

  const scanId = await saveScanResult(
    { ...scan, candidates: dedupedCSPs },
    delta,
    analysis?.text ?? null,
    analysis?.provider ?? null,
    "manual",
    dedupedCalls,
    dedupedLeaps,
    analysis?.model ?? null
  );

  return NextResponse.json({
    scanId,
    candidates: dedupedCSPs,
    callCandidates: dedupedCalls,
    leapsCandidates: dedupedLeaps,
    delta,
    claudeAnalysis: analysis?.text ?? null,
    scannedAt: scan.scannedAt,
    capital: scan.capital,
    errors: [...scan.errors, ...callScan.errors, ...leapsScan.errors],
  });
}
