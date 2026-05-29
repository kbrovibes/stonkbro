import { supabaseAdmin } from "@/lib/supabase";
import { getPortfolio } from "@/lib/snaptrade/client";
import type { TickerSnapshot } from "./types";

const CACHE_TABLE = "portfolio_manager_holdings_cache";

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Read today's cached stock holdings, or fetch from SnapTrade + cache. */
export async function getStockHoldingsToday(): Promise<{
  tickers: TickerSnapshot[];
  free_cash: number;
  from_cache: boolean;
}> {
  const date = todayUTC();

  // Try cache first
  const { data: cached } = await supabaseAdmin
    .from(CACHE_TABLE)
    .select("tickers")
    .eq("date", date)
    .maybeSingle();

  if (cached?.tickers && Array.isArray(cached.tickers) && cached.tickers.length > 0) {
    const tickers = cached.tickers as TickerSnapshot[];
    // free_cash is recomputed from balances each time — not cached
    const portfolio = await getPortfolio().catch(() => null);
    const free_cash = portfolio?.summary.cash ?? 0;
    return { tickers, free_cash, from_cache: true };
  }

  // Cache miss — fetch from SnapTrade
  const portfolio = await getPortfolio();

  // Stocks only (is_option === false), deduplicate by symbol (sum units + values across accounts)
  const bySymbol = new Map<string, TickerSnapshot>();
  for (const p of portfolio.positions) {
    if (p.is_option) continue;
    if (!p.symbol || p.symbol === "UNKNOWN") continue;
    if (p.units === 0) continue;

    const existing = bySymbol.get(p.symbol);
    if (existing) {
      existing.units += p.units;
      existing.market_value += p.market_value;
      existing.cost_basis += p.cost_basis;
      existing.unrealized_pnl_pct = existing.cost_basis > 0
        ? ((existing.market_value - existing.cost_basis) / existing.cost_basis) * 100
        : 0;
      existing.account_name = "multi-account";
    } else {
      bySymbol.set(p.symbol, {
        symbol: p.symbol,
        units: p.units,
        market_value: p.market_value,
        cost_basis: p.cost_basis,
        unrealized_pnl_pct: p.unrealized_pnl_pct,
        account_name: p.account_name,
      });
    }
  }

  const tickers = Array.from(bySymbol.values()).sort((a, b) => b.market_value - a.market_value);

  // Persist cache (upsert idempotent on date PK)
  await supabaseAdmin.from(CACHE_TABLE).upsert({
    date,
    tickers,
    fetched_at: new Date().toISOString(),
  });

  return { tickers, free_cash: portfolio.summary.cash, from_cache: false };
}
