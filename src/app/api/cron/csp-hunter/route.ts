import { NextResponse } from "next/server";
import { scanForCSPs, scanForCalls } from "@/lib/options/csp-scanner";
import { computeDelta, getLastScan, saveScanResult } from "@/lib/options/csp-delta";
import { analyzeCSPCandidates } from "@/lib/options/csp-analyst";
import { sendCSPHunterReport } from "@/lib/notifications/csp-report";
import { supabaseAdmin } from "@/lib/supabase";

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // 1. Run CSP + Call scans in parallel
    console.log("[Options Scanner] Starting scheduled scan...");
    const [scan, callScan] = await Promise.all([scanForCSPs(), scanForCalls()]);

    // Deduplicate: 1 ticker per section, cap CSPs at 5
    const seenCSP = new Set<string>();
    scan.candidates = scan.candidates.filter((c) => {
      if (seenCSP.has(c.symbol)) return false;
      seenCSP.add(c.symbol);
      return true;
    }).slice(0, 5);

    const seenCalls = new Set<string>();
    const dedupedCalls = callScan.candidates.filter((c) => {
      if (seenCalls.has(c.symbol)) return false;
      seenCalls.add(c.symbol);
      return true;
    }).slice(0, 5);

    console.log(`[Options Scanner] Found ${scan.candidates.length} CSPs + ${dedupedCalls.length} calls`);

    if (scan.errors.length > 0) {
      console.warn(`[CSP Hunter] ${scan.errors.length} errors:`, scan.errors.slice(0, 5));
    }

    // 2. Compute delta from last scan
    let delta = null;
    const lastScan = await getLastScan();
    if (lastScan) {
      delta = computeDelta(scan.candidates, lastScan.candidates, lastScan.scannedAt);
      console.log(`[CSP Hunter] Delta: ${delta.totalChanges} changes (${delta.newEntries.length} new, ${delta.premiumIncreased.length} up, ${delta.premiumDecreased.length} down, ${delta.dropped.length} dropped)`);
    }

    // 3. Claude analysis (only if we have candidates)
    let analysis = null;
    if (scan.candidates.length > 0) {
      try {
        analysis = await analyzeCSPCandidates(scan.candidates, delta, scan.capital);
        console.log(`[CSP Hunter] Claude analysis complete (${analysis.provider})`);
      } catch (e) {
        console.error("[CSP Hunter] Claude analysis failed:", e);
      }
    }

    // 4. Save to database
    const scanId = await saveScanResult(
      scan,
      delta,
      analysis?.text ?? null,
      analysis?.provider ?? null,
      "scheduled",
      dedupedCalls
    );

    // 5. Send email report
    try {
      // Get user email from profiles
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .limit(1);
      const email = profiles?.[0]?.email;

      if (email) {
        await sendCSPHunterReport(email, scan, delta, analysis?.text ?? null);
        console.log(`[CSP Hunter] Report sent to ${email}`);
      }
    } catch (e) {
      console.error("[CSP Hunter] Email report failed:", e);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CSP Hunter] Complete in ${elapsed}s`);

    return NextResponse.json({
      ok: true,
      scanId,
      candidates: scan.candidates.length,
      tickers: scan.scannedTickers.length,
      deltaChanges: delta?.totalChanges ?? 0,
      hasAnalysis: !!analysis,
      elapsed: `${elapsed}s`,
      errors: scan.errors.length,
    });
  } catch (e) {
    console.error("[CSP Hunter] Fatal error:", e);
    return NextResponse.json(
      { error: "CSP Hunter scan failed", details: String(e) },
      { status: 500 }
    );
  }
}
