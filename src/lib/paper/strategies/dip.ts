import { tradingDaysBetween } from "../dates";
import type { Order, Strategy } from "../types";
import { Budget, buyStock, fmtPct, num, price, sellAll, stocks, thisWeek, unrealizedPct } from "./helpers";

type Entries = Record<string, string>;

function entries(ctx: { state: Record<string, unknown> }): Entries {
  const raw = ctx.state.entries;
  return raw && typeof raw === "object" ? (raw as Entries) : {};
}

export const dip: Strategy = {
  needs: () => [],
  decide(ctx) {
    const clipUsd = num(ctx, "clipUsd", 10000);
    const maxPositions = num(ctx, "maxPositions", 6);
    const dropPct = num(ctx, "dropPct", -5);
    const rsiMax = num(ctx, "rsiMax", 35);
    const takePct = num(ctx, "takePct", 6);
    const stopPct = num(ctx, "stopPct", -8);
    const maxDays = num(ctx, "maxDays", 10);

    const orders: Order[] = [];
    const exiting = new Set<string>();
    for (const p of stocks(ctx)) {
      if (!price(ctx, p.symbol)) continue;
      const pct = unrealizedPct(p);
      const days = p.meta.entryDate ? tradingDaysBetween(p.meta.entryDate, ctx.date) : 0;
      let reason: string | null = null;
      if (pct >= takePct) reason = `Take profit at ${fmtPct(pct)}`;
      else if (pct <= stopPct) reason = `Stop loss at ${fmtPct(pct)}`;
      else if (days >= maxDays) reason = `Time stop after ${days} trading days (${fmtPct(pct)})`;
      if (reason) {
        orders.push(sellAll(p, reason));
        exiting.add(p.symbol);
      }
    }

    const week = thisWeek(ctx);
    const seen = entries(ctx);
    for (const s of Object.keys(seen)) if (seen[s] !== week) delete seen[s];
    ctx.state.entries = seen;

    const held = new Set(stocks(ctx).map((p) => p.symbol));
    const slots = maxPositions - (held.size - exiting.size);
    if (slots <= 0) return orders;

    const candidates = ctx.profile.universe
      .filter((s) => !held.has(s) && !seen[s])
      .map((symbol) => {
        const q = ctx.quote(symbol);
        const rsi = ctx.rsi14(symbol);
        const drop = q ? q.changePct <= dropPct : false;
        const oversold = rsi != null && rsi < rsiMax;
        return { symbol, changePct: q?.changePct ?? 0, rsi, drop, oversold };
      })
      .filter((c) => c.drop || c.oversold)
      .sort((a, b) => a.changePct - b.changePct)
      .slice(0, slots);

    const budget = new Budget(ctx.buyingPower);
    for (const c of candidates) {
      const why = c.drop ? `Down ${fmtPct(c.changePct)} on the day` : `RSI ${c.rsi!.toFixed(0)} < ${rsiMax}`;
      const o = buyStock(ctx, c.symbol, clipUsd, budget, why);
      if (!o) continue;
      orders.push(o);
      seen[c.symbol] = week;
    }
    return orders;
  },
};
