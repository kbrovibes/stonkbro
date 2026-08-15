import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { getAllActivitiesTagged } from "@/lib/snaptrade/client";
import { computeEquitySales } from "@/lib/taxes/equities";
import { insertEquityScan, getLatestEquityScan } from "@/lib/db/tax-equities";
import { runTracked } from "@/lib/jobs/tracker";
import { JobCancelledError } from "@/lib/jobs/types";

export const dynamic = "force-dynamic";
// Full activity history walk under SnapTrade rate-limit pacing — minutes.
export const maxDuration = 300;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPortfolioAccess(user.email)) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Latest scan metadata (freshness for the UI). */
export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;
  try {
    const scan = await getLatestEquityScan();
    return NextResponse.json({
      lastSyncedAt: scan?.created_at ?? null,
      saleCount: scan?.events?.length ?? 0,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/** Sync now: walk full activity history, FIFO-match, store the scan. */
export async function POST() {
  const { user, error } = await requireUser();
  if (!user) return error;

  try {
    const result = await runTracked(
      {
        kind: "tax-equity-sync",
        label: "Tax Center stock-sale sync",
        trigger: "manual",
        createdBy: user.email,
      },
      async (ctx) => {
        const activities = await getAllActivitiesTagged("2010-01-01", {
          checkCancelled: ctx.checkCancelled,
          progress: ctx.progress,
        });
        await ctx.progress("Matching lots (FIFO)…");
        const sales = computeEquitySales(activities);
        await insertEquityScan(sales, {
          activities: activities.length,
          sales: sales.length,
        });
        return { sales: sales.length, activities: activities.length };
      }
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof JobCancelledError) {
      return NextResponse.json({ ok: false, cancelled: true });
    }
    console.error("Equity sync failed:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
