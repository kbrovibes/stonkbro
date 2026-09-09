import type { Order, Strategy } from "../types";
import { Budget, fmtPct, num, price, sellAll, stocks } from "./helpers";

export const rotation: Strategy = {
  needs: () => [],
  decide(ctx) {
    if (!ctx.isFirstSessionOfWeek) return [];
    const hold = num(ctx, "hold", 3);
    const lookback = num(ctx, "lookbackDays", 20);

    const ranked = ctx.profile.universe
      .map((symbol) => ({ symbol, ret: ctx.returnPct(symbol, lookback) }))
      .filter((r): r is { symbol: string; ret: number } => r.ret != null && price(ctx, r.symbol) != null)
      .sort((a, b) => b.ret - a.ret);
    if (ranked.length === 0) return [];
    const top = ranked.slice(0, hold);
    const topSymbols = new Set(top.map((t) => t.symbol));

    const sells: Order[] = [];
    const buys: Order[] = [];
    const budget = new Budget(ctx.buyingPower);
    for (const p of stocks(ctx)) {
      if (topSymbols.has(p.symbol)) continue;
      sells.push(sellAll(p, `Dropped out of the top ${hold} by ${lookback}-day return`));
      budget.add(p.qty * (price(ctx, p.symbol) ?? p.avgPrice));
    }

    const target = ctx.equity / hold;
    const wants: Array<{ symbol: string; usd: number; reason: string }> = [];
    for (const t of top) {
      const px = price(ctx, t.symbol)!;
      const held = stocks(ctx, t.symbol).reduce((s, p) => s + p.qty, 0);
      const diff = target - held * px;
      const label = `${t.symbol} ranks top ${hold} (${fmtPct(t.ret)} over ${lookback}d)`;
      if (diff < -px) {
        const qty = Math.floor(-diff / px);
        sells.push({ symbol: t.symbol, kind: "stock", action: "sell", qty, reason: `Trim to equal weight — ${label}` });
        budget.add(qty * px);
      } else if (diff > px) {
        wants.push({ symbol: t.symbol, usd: diff, reason: held > 0 ? `Top up to equal weight — ${label}` : `Enter — ${label}` });
      }
    }
    for (const w of wants) {
      const px = price(ctx, w.symbol)!;
      const qty = Math.floor(Math.min(w.usd, budget.remaining) / px);
      if (qty >= 1 && budget.spend(qty * px)) {
        buys.push({ symbol: w.symbol, kind: "stock", action: "buy", qty, reason: w.reason });
      }
    }
    return [...sells, ...buys];
  },
};
