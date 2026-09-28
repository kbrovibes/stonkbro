import type { ChainNeed, Order, Position, Strategy, StrategyContext } from "../types";
import { Budget, liquidUniverse, longOptions, num, price, sellAll, unrealizedPct } from "./helpers";

/**
 * Long calls only — never writes anything against what it holds. Two books
 * side by side: a small core of deep LEAPS (stock-replacement leverage) and
 * a rotating handful of shorter-dated calls on names actually breaking out.
 */

const leapsNeed = (ctx: StrategyContext, symbol: string): ChainNeed => ({
  symbol, minDte: num(ctx, "leapsMinDte", 365), maxDte: num(ctx, "leapsMaxDte", 550), targetDte: 450,
});
const swingNeed = (ctx: StrategyContext, symbol: string): ChainNeed => ({
  symbol, minDte: num(ctx, "swingMinDte", 30), maxDte: num(ctx, "swingMaxDte", 60), targetDte: 45,
});

function leapsOf(ctx: StrategyContext): Position[] {
  return longOptions(ctx, "call").filter((p) => p.expiry && ctx.dte(p.expiry) > 180);
}

function swingOf(ctx: StrategyContext): Position[] {
  return longOptions(ctx, "call").filter((p) => !p.expiry || ctx.dte(p.expiry) <= 180);
}

function candidates(ctx: StrategyContext): string[] {
  return liquidUniverse(ctx, ctx.profile.universe, num(ctx, "maxPrice", 400), 40, num(ctx, "minPrice", 20));
}

function breakoutCandidates(ctx: StrategyContext): string[] {
  const minReturn = num(ctx, "breakoutReturnPct", 8);
  return candidates(ctx).filter((s) => {
    const px = price(ctx, s);
    const sma50 = ctx.sma(s, 50);
    const ret20 = ctx.returnPct(s, 20);
    return px != null && sma50 != null && px > sma50 && ret20 != null && ret20 > minReturn;
  });
}

export const leapsTrader: Strategy = {
  needs(ctx) {
    const coreNames = num(ctx, "coreNames", 4);
    const swingNames = num(ctx, "swingNames", 4);
    const held = new Set([...leapsOf(ctx), ...swingOf(ctx)].map((p) => p.symbol));
    const needs: ChainNeed[] = [];

    const coreSlots = coreNames - leapsOf(ctx).length;
    if (coreSlots > 0) {
      for (const s of candidates(ctx).filter((s) => !held.has(s)).slice(0, coreSlots * 2)) needs.push(leapsNeed(ctx, s));
    }
    const swingSlots = swingNames - swingOf(ctx).length;
    if (swingSlots > 0) {
      for (const s of breakoutCandidates(ctx).filter((s) => !held.has(s)).slice(0, swingSlots * 2)) needs.push(swingNeed(ctx, s));
    }
    return needs;
  },
  decide(ctx) {
    const orders: Order[] = [];
    const budget = new Budget(ctx.buyingPower);
    const takePct = num(ctx, "takePct", 60);
    const stopPct = num(ctx, "stopPct", -40);
    const swingMinDteExit = num(ctx, "swingMinDteExit", 10);

    const keepLeaps: Position[] = [];
    for (const l of leapsOf(ctx)) {
      const delta = ctx.deltaOf(l);
      if (delta != null && delta < 0.55) {
        orders.push(sellAll(l, `LEAPS delta ${delta.toFixed(2)} fell under 0.55`));
        continue;
      }
      keepLeaps.push(l);
    }

    const keepSwings: Position[] = [];
    for (const s of swingOf(ctx)) {
      const upct = unrealizedPct(s);
      const dte = s.expiry ? ctx.dte(s.expiry) : 0;
      if (upct >= takePct) {
        orders.push(sellAll(s, `+${upct.toFixed(0)}% — taking profit on the swing call`));
      } else if (upct <= stopPct) {
        orders.push(sellAll(s, `${upct.toFixed(0)}% — cutting the swing call`));
      } else if (dte <= swingMinDteExit) {
        orders.push(sellAll(s, `${dte} DTE — closing the swing call before theta eats it`));
      } else {
        keepSwings.push(s);
      }
    }

    const held = new Set([...keepLeaps, ...keepSwings].map((p) => p.symbol));

    let coreSlots = num(ctx, "coreNames", 4) - keepLeaps.length;
    const maxLeapsUsd = num(ctx, "maxLeapsUsd", 12000);
    for (const symbol of candidates(ctx)) {
      if (coreSlots <= 0) break;
      if (held.has(symbol) || !price(ctx, symbol)) continue;
      const found = ctx.findOption({ ...leapsNeed(ctx, symbol), type: "call", targetDelta: num(ctx, "leapsDelta", 0.75) });
      if (!found || found.delta < 0.6) continue;
      const c = found.contract;
      const cost = c.mid * 100 + 0.65;
      if (cost > maxLeapsUsd || cost > budget.remaining) continue;
      budget.spend(cost);
      orders.push({
        symbol, kind: "call", action: "buy", qty: 1, strike: c.strike, expiry: c.expiry,
        reason: `Core LEAPS, ${found.delta.toFixed(2)}Δ, ${c.dte} DTE, $${Math.round(c.mid * 100).toLocaleString("en-US")} debit — stock-replacement leverage`,
      });
      held.add(symbol);
      coreSlots--;
    }

    let swingSlots = num(ctx, "swingNames", 4) - keepSwings.length;
    const maxSwingUsd = num(ctx, "maxSwingUsd", 6000);
    for (const symbol of breakoutCandidates(ctx)) {
      if (swingSlots <= 0) break;
      if (held.has(symbol) || !price(ctx, symbol)) continue;
      const found = ctx.findOption({ ...swingNeed(ctx, symbol), type: "call", targetDelta: num(ctx, "swingDelta", 0.55) });
      if (!found) continue;
      const c = found.contract;
      const cost = c.mid * 100 + 0.65;
      if (cost > maxSwingUsd || cost > budget.remaining) continue;
      budget.spend(cost);
      const ret20 = ctx.returnPct(symbol, 20);
      orders.push({
        symbol, kind: "call", action: "buy", qty: 1, strike: c.strike, expiry: c.expiry,
        reason: `Breakout swing call, ${found.delta.toFixed(2)}Δ, ${c.dte} DTE — 20d return ${ret20 != null ? `+${ret20.toFixed(0)}%` : "n/a"} above the 50-day, $${Math.round(cost).toLocaleString("en-US")} debit`,
      });
      held.add(symbol);
      swingSlots--;
    }

    return orders;
  },
};
