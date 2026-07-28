import { NextResponse } from "next/server";
import { scanBloodbath } from "@/lib/analysis/bloodbath";
import {
  generateBloodbathVerdicts,
  pickVerdictTargets,
  type BloodbathVerdict,
} from "@/lib/analysis/bloodbath-verdict";
import {
  getAllUsersWatchlistSymbols,
  insertScan,
  markComplete,
  markFailed,
} from "@/lib/db/bloodbath-scans";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
  let scanId: string | null = null;

  try {
    console.log("[Bloodbath] Starting scheduled scan...");
    scanId = await insertScan("scheduled");

    let watchlistSymbols: string[] = [];
    try {
      watchlistSymbols = await getAllUsersWatchlistSymbols();
    } catch {
      // continue with the scan universe only
    }

    const scan = await scanBloodbath(watchlistSymbols);
    console.log(
      `[Bloodbath] Scanned ${scan.scannedCount}: ${scan.watchlist.length} watchlist, ${scan.market.length} market drops`
    );

    // Verdicts are best-effort — a failed AI call still leaves a usable scan.
    let verdicts: BloodbathVerdict[] | null = null;
    let aiProvider: string | null = null;
    let aiModel: string | null = null;
    const targets = pickVerdictTargets([...scan.watchlist, ...scan.market]);
    if (targets.length > 0) {
      try {
        const result = await generateBloodbathVerdicts(targets, undefined, scan.benchmarks);
        verdicts = result.verdicts;
        aiProvider = result.aiProvider;
        aiModel = result.aiModel;
        console.log(`[Bloodbath] Got ${verdicts.length} AI verdicts via ${aiProvider}`);
      } catch (e) {
        console.error("[Bloodbath] Verdict generation failed:", e);
      }
    }

    await markComplete(scanId, {
      scanned_count: scan.scannedCount,
      watchlist: scan.watchlist,
      market: scan.market,
      benchmarks: scan.benchmarks,
      verdicts,
      ai_provider: aiProvider,
      ai_model: aiModel,
      duration_ms: Date.now() - startTime,
    });

    return NextResponse.json({
      ok: true,
      scanId,
      scannedCount: scan.scannedCount,
      watchlist: scan.watchlist.length,
      market: scan.market.length,
      verdicts: verdicts?.length ?? 0,
      durationMs: Date.now() - startTime,
    });
  } catch (e) {
    console.error("[Bloodbath] Cron failed:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    if (scanId) {
      try {
        await markFailed(scanId, message);
      } catch {
        // best effort
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
