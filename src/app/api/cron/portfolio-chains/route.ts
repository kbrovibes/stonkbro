import { NextResponse } from "next/server";
import { getOptionChains } from "@/lib/snaptrade/client";
import {
  CHAIN_CACHE_START_DATE,
  insertChainScan,
  markChainScanComplete,
  markChainScanFailed,
} from "@/lib/db/portfolio-chain-scans";

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

    const chains = await getOptionChains(CHAIN_CACHE_START_DATE);
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
    console.error("[PortfolioChains] Cron failed:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    if (scanId) {
      try {
        await markChainScanFailed(scanId, message);
      } catch {
        // best effort
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
