import { NextResponse } from "next/server";
import { runLeapsPmccScan } from "@/lib/options/leaps-scan";
import { insertLeapsScan } from "@/lib/db/leaps";

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

  const startedAt = Date.now();
  try {
    const result = await runLeapsPmccScan();
    const scanId = await insertLeapsScan(result, "scheduled");
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(
      `[LEAPS Lab] ${result.leaps.length} LEAPS + ${result.pmcc.length} PMCC from ${result.universeSize} tickers in ${elapsed}s`
    );
    return NextResponse.json({
      ok: true,
      scanId,
      leaps: result.leaps.length,
      pmcc: result.pmcc.length,
      tickers: result.universeSize,
      errors: result.errors.length,
      elapsed: `${elapsed}s`,
    });
  } catch (e) {
    console.error("[LEAPS Lab] scan failed:", e);
    return NextResponse.json({ error: "LEAPS scan failed", details: String(e) }, { status: 500 });
  }
}
