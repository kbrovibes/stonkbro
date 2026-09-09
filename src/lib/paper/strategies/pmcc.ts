import type { ChainNeed, Order, Position, Strategy, StrategyContext } from "../types";
import { Budget, liquidUniverse, longOptions, num, optLabel, price, sellAll, shortOptions } from "./helpers";

const leapsNeed = (ctx: StrategyContext, symbol: string): ChainNeed => ({
  symbol, minDte: num(ctx, "leapsMinDte", 365), maxDte: num(ctx, "leapsMaxDte", 550), targetDte: 450,
});
const shortNeed = (ctx: StrategyContext, symbol: string): ChainNeed => ({
  symbol, minDte: num(ctx, "shortMinDte", 21), maxDte: num(ctx, "shortMaxDte", 45), targetDte: 30,
});

function candidates(ctx: StrategyContext): string[] {
  return liquidUniverse(ctx, ctx.profile.universe, num(ctx, "maxPrice", 400), 40, num(ctx, "minPrice", 30));
}

function leapsOf(ctx: StrategyContext): Position[] {
  return longOptions(ctx, "call").filter((p) => p.expiry && ctx.dte(p.expiry) > 180);
}

function shortCallOf(ctx: StrategyContext, symbol: string): Position | undefined {
  return shortOptions(ctx, "call", symbol)[0];
}

function shortCallShouldClose(ctx: StrategyContext, p: Position): string | null {
  if (!p.expiry || p.strike == null) return null;
  const mark = p.meta.mark ?? p.avgPrice;
  const dte = ctx.dte(p.expiry);
  const label = optLabel(p.strike, "call", p.expiry);
  if (mark <= p.avgPrice * 0.5) return `Short call ${label} at 50% profit`;
  if (dte <= 7) return `Short call ${label} at ${dte} DTE`;
  return null;
}

function sellShort(ctx: StrategyContext, symbol: string, leapsStrike: number, debit: number, qty: number): Order | null {
  const found = ctx.findOption({
    ...shortNeed(ctx, symbol),
    type: "call", targetDelta: num(ctx, "shortDelta", 0.25), minStrike: leapsStrike + debit,
  });
  if (!found || found.delta < 0.1) return null;
  const c = found.contract;
  return {
    symbol, kind: "call", action: "sell", qty, strike: c.strike, expiry: c.expiry,
    reason: `Short ${found.delta.toFixed(2)}Δ call ${c.dte} DTE above LEAPS strike + debit (${(leapsStrike + debit).toFixed(0)})`,
    meta: { marginMode: "covered", marginHeld: 0 },
  };
}

export const pmcc: Strategy = {
  needs(ctx) {
    const names = num(ctx, "names", 5);
    const needs: ChainNeed[] = [];
    const held = leapsOf(ctx);
    const heldSymbols = new Set(held.map((p) => p.symbol));
    for (const l of held) {
      const sc = shortCallOf(ctx, l.symbol);
      if (!sc || shortCallShouldClose(ctx, sc)) needs.push(shortNeed(ctx, l.symbol));
    }
    const slots = names - held.length;
    if (slots > 0) {
      for (const s of candidates(ctx).filter((s) => !heldSymbols.has(s)).slice(0, slots * 2)) {
        needs.push(leapsNeed(ctx, s), shortNeed(ctx, s));
      }
    }
    return needs;
  },
  decide(ctx) {
    const names = num(ctx, "names", 5);
    const maxLeapsUsd = num(ctx, "maxLeapsUsd", 15000);
    const orders: Order[] = [];
    const budget = new Budget(ctx.buyingPower);
    const keep: Position[] = [];

    for (const l of leapsOf(ctx)) {
      const delta = ctx.deltaOf(l);
      const sc = shortCallOf(ctx, l.symbol);
      if (delta != null && delta < 0.55) {
        if (sc) orders.push(sellAll(sc, `Closing short call with the LEAPS (delta ${delta.toFixed(2)})`));
        orders.push(sellAll(l, `LEAPS delta ${delta.toFixed(2)} fell under 0.55`));
        continue;
      }
      keep.push(l);
      let needsShort = !sc;
      if (sc) {
        const why = shortCallShouldClose(ctx, sc);
        if (why) {
          orders.push(sellAll(sc, why));
          budget.add(-(sc.meta.mark ?? sc.avgPrice) * 100 * sc.qty);
          needsShort = true;
        }
      }
      if (needsShort && l.strike != null) {
        const o = sellShort(ctx, l.symbol, l.strike, l.avgPrice, l.qty);
        if (o) orders.push(o);
      }
    }

    const heldSymbols = new Set(keep.map((p) => p.symbol));
    let slots = names - keep.length;
    for (const symbol of candidates(ctx)) {
      if (slots <= 0) break;
      if (heldSymbols.has(symbol) || !price(ctx, symbol)) continue;
      const found = ctx.findOption({ ...leapsNeed(ctx, symbol), type: "call", targetDelta: num(ctx, "leapsDelta", 0.75) });
      if (!found || found.delta < 0.6) continue;
      const c = found.contract;
      const cost = c.mid * 100 + 0.65;
      if (cost > maxLeapsUsd || !budget.spend(cost)) continue;
      orders.push({
        symbol, kind: "call", action: "buy", qty: 1, strike: c.strike, expiry: c.expiry,
        reason: `LEAPS ${found.delta.toFixed(2)}Δ call, ${c.dte} DTE, $${Math.round(c.mid * 100).toLocaleString("en-US")} debit`,
      });
      const short = sellShort(ctx, symbol, c.strike, c.mid, 1);
      if (short) orders.push(short);
      slots--;
    }
    return orders;
  },
};
