import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortfolio, getTransactions, getOptionChains, getAllActivities } from "@/lib/snaptrade/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

import { hasPortfolioAccess } from "@/lib/portfolio-access";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPortfolioAccess(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const include = searchParams.get("include") ?? "portfolio";

  try {
    if (include === "transactions") {
      const startDate = searchParams.get("startDate") ?? "2026-01-01";
      const transactions = await getTransactions(startDate);
      return NextResponse.json({ transactions });
    }

    if (include === "option-chains") {
      const startDate = searchParams.get("startDate") ?? "2026-01-01";
      const chains = await getOptionChains(startDate);
      return NextResponse.json({ chains });
    }

    if (include === "debug-all-txns") {
      const activities = await getAllActivities("2010-01-01");
      const totalCount = activities.length;

      // Compute earliest/latest date range
      let earliest: string | null = null;
      let latest: string | null = null;
      for (const t of activities) {
        const d = t?.trade_date ?? t?.settlement_date ?? null;
        if (!d) continue;
        if (earliest === null || d < earliest) earliest = d;
        if (latest === null || d > latest) latest = d;
      }

      // Count by type and collect samples (first 3 per type)
      const byType: Record<string, number> = {};
      const sample: Record<string, any[]> = {};
      for (const t of activities) {
        const ty = String(t?.type ?? "UNKNOWN");
        byType[ty] = (byType[ty] ?? 0) + 1;
        if (!sample[ty]) sample[ty] = [];
        if (sample[ty].length < 3) sample[ty].push(t);
      }

      return NextResponse.json({
        totalCount,
        dateRangeFound: { earliest, latest },
        byType,
        sample,
      });
    }

    if (include === "debug-txns") {
      const startDate = searchParams.get("startDate") ?? "2025-01-01";
      const underlying = searchParams.get("underlying")?.toUpperCase();
      const txns = await getTransactions(startDate);
      const optionTxns = txns.filter((t: any) => t.option_symbol != null);
      const filtered = underlying
        ? optionTxns.filter((t: any) =>
            (t.option_symbol?.underlying_symbol?.symbol ?? "").toUpperCase() === underlying
          )
        : optionTxns;
      return NextResponse.json(filtered.map((t: any) => ({
        date: t.trade_date ?? t.settlement_date,
        type: t.type,
        underlying: t.option_symbol?.underlying_symbol?.symbol,
        option_type: t.option_symbol?.option_type,
        strike: t.option_symbol?.strike_price,
        expiry: t.option_symbol?.expiration_date,
        ticker: t.option_symbol?.ticker,
        units: t.units,
        price: t.price,
        amount: t.amount,
        _raw_type: t.type,
      })));
    }

    const portfolio = await getPortfolio();
    return NextResponse.json(portfolio);
  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data ?? err?.message ?? String(err);
    console.error("SnapTrade error:", status, JSON.stringify(detail));
    return NextResponse.json({ error: "Failed to fetch portfolio data", detail: String(detail).slice(0, 200) }, { status: 500 });
  }
}
