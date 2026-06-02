import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAllActivities, getPortfolio } from "@/lib/snaptrade/client";
import { simulateTimeMachine } from "@/lib/time-machine/simulate";
import { SnapTradeTxn } from "@/lib/time-machine/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { hasPortfolioAccess } from "@/lib/portfolio-access";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPortfolioAccess(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

    const result = await simulateTimeMachine({ snapshotDate, txns, currentPortfolio: portfolio });
    // Per-account breakdown so the user can verify only the intended
    // accounts are being summed (SnapTrade-linked vs all Fidelity accounts).
    const perAccount = portfolio.accounts.map((a) => {
      const acctStocks = portfolio.positions
        .filter((p) => p.account_name === a.name)
        .reduce((s, p) => s + p.market_value, 0);
      const acctOptions = portfolio.options
        .filter((o) => o.account_name === a.name)
        .reduce((s, o) => s + o.market_value, 0);
      const acctCash = portfolio.balances
        .filter((b) => b.account_id === a.id)
        .reduce((s, b) => s + b.cash, 0);
      return {
        id: a.id,
        name: a.name,
        institution: a.institution,
        number: a.number,
        stocks: acctStocks,
        options: acctOptions,
        cash: acctCash,
        total: acctStocks + acctOptions + acctCash,
      };
    });

    return NextResponse.json({
      ...result,
      earliestAvailable,
      actual: {
        ...result.actual,
        breakdown: {
          stocks: portfolio.summary.total_market_value,
          options: portfolio.options.reduce((s, o) => s + o.market_value, 0),
          cash: portfolio.summary.cash,
          accountCount: portfolio.accounts.length,
          stockPositionCount: portfolio.positions.length,
          optionPositionCount: portfolio.options.length,
          perAccount,
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
