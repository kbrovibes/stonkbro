import { NextResponse } from "next/server";
import { getOptionChains } from "@/lib/snaptrade/client";
import {
  CHAIN_CACHE_START_DATE,
  insertChainScan,
  markChainScanComplete,
  markChainScanFailed,
} from "@/lib/db/portfolio-chain-scans";
import { runTracked } from "@/lib/jobs/tracker";
import { JobCancelledError } from "@/lib/jobs/types";

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
    console.log("[PortfolioChains] Starting scheduled chain scan...");
    scanId = await insertChainScan("scheduled");

    const chains = await runTracked(
      {
        kind: "chain-scan",
        label: "Option chain scan (scheduled)",
        trigger: "cron",
        createdBy: "cron",
        meta: { startDate: CHAIN_CACHE_START_DATE },
      },
      (ctx) =>
        getOptionChains(CHAIN_CACHE_START_DATE, {
          checkCancelled: ctx.checkCancelled,
          progress: ctx.progress,
        })
    );
    await markChainScanComplete(scanId, {
      chains,
      duration_ms: Date.now() - startTime,
    });

    console.log(`[PortfolioChains] Cached ${chains.length} chains in ${Date.now() - startTime}ms`);
    return NextResponse.json({
      ok: true,
      scanId,
      chains: chains.length,
      durationMs: Date.now() - startTime,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    if (scanId) {
      try {
        await markChainScanFailed(scanId, message);
      } catch {
        // best effort
      }
    }
    if (e instanceof JobCancelledError) {
      console.log("[PortfolioChains] Scan cancelled by user");
      return NextResponse.json({ ok: false, cancelled: true, scanId });
    }
    console.error("[PortfolioChains] Cron failed:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
