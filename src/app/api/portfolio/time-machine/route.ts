import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAllActivities, getPortfolio } from "@/lib/snaptrade/client";
import { simulateTimeMachine } from "@/lib/time-machine/simulate";
import { SnapTradeTxn } from "@/lib/time-machine/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_EMAIL = "k4rthikr@gmail.com";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.email !== ALLOWED_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const snapshotDate = searchParams.get("date");

  if (!snapshotDate || !/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
    return NextResponse.json({ error: "Missing or invalid ?date=YYYY-MM-DD" }, { status: 400 });
  }

  const todayISO = new Date().toISOString().split("T")[0];
  if (snapshotDate >= todayISO) {
    return NextResponse.json({ error: "Snapshot date must be in the past" }, { status: 400 });
  }

  try {
    // Pull full activity history + current portfolio in parallel.
    const [activities, portfolio] = await Promise.all([
      getAllActivities("2010-01-01"),
      getPortfolio(),
    ]);

    if (!activities.length) {
      return NextResponse.json(
        { error: "No transaction history returned by broker", detail: "SnapTrade returned 0 activities." },
        { status: 502 }
      );
    }

    const txns = activities as SnapTradeTxn[];

    // Compute earliest available txn date — clamps how far back the user can go.
    let earliestAvailable: string | null = null;
    for (const t of activities as any[]) {
      const d = (t?.trade_date ?? t?.settlement_date ?? "").slice(0, 10);
      if (!d) continue;
      if (earliestAvailable === null || d < earliestAvailable) earliestAvailable = d;
    }

    if (earliestAvailable && snapshotDate < earliestAvailable) {
      return NextResponse.json(
        {
          error: "Snapshot date is before available transaction history",
          detail: `Earliest activity from broker: ${earliestAvailable}. Try a later date.`,
          earliestAvailable,
        },
        { status: 400 }
      );
    }

    // Actual current total = stock MV + net options MV (signed) + cash
    const stocksMV = portfolio.summary.total_market_value;
    const optionsMV = portfolio.options.reduce((s, o) => s + o.market_value, 0);
    const cashTotal = portfolio.summary.cash;
    const actualTotal = stocksMV + optionsMV + cashTotal;

    const result = await simulateTimeMachine({ snapshotDate, txns, actualTotal });
    return NextResponse.json({
      ...result,
      earliestAvailable,
      actual: {
        ...result.actual,
        breakdown: {
          stocks: stocksMV,
          options: optionsMV,
          cash: cashTotal,
          accountCount: portfolio.accounts.length,
          stockPositionCount: portfolio.positions.length,
          optionPositionCount: portfolio.options.length,
        },
      },
    });
  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data ?? err?.message ?? String(err);
    console.error("Time Machine error:", status, detail);
    return NextResponse.json(
      { error: "Time Machine simulation failed", detail: String(detail).slice(0, 300) },
      { status: 500 }
    );
  }
}
