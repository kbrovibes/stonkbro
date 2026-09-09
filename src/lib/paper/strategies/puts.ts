import { nakedPutMargin } from "../broker";
import type { ChainNeed, Order, Strategy, StrategyContext } from "../types";
import { Budget, liquidUniverse, num, optLabel, price, sellAll, shortOptions, stocks } from "./helpers";

/* -- Naked put seller ---------------------------------------------------- */

function putUniverse(ctx: StrategyContext): string[] {
  return liquidUniverse(ctx, ctx.profile.universe, num(ctx, "maxPrice", 400), num(ctx, "universeSize", 25));
}

const PUT_NEED = (ctx: StrategyContext, symbol: string): ChainNeed => ({
  symbol,
  minDte: num(ctx, "minDte", 21),
  maxDte: num(ctx, "maxDte", 45),
  targetDte: 35,
});

/** Symbols whose put we will close this session, and why. */
function putExits(ctx: StrategyContext): Array<{ order: Order; reopen: boolean }> {
  const out: Array<{ order: Order; reopen: boolean }> = [];
  for (const p of shortOptions(ctx, "put")) {
    if (!p.expiry || p.strike == null) continue;
    const mark = p.meta.mark ?? p.avgPrice;
    const dte = ctx.dte(p.expiry);
    const delta = ctx.deltaOf(p) ?? 0;
    const label = optLabel(p.strike, "put", p.expiry);
    if (mark <= p.avgPrice * 0.5) out.push({ order: sellAll(p, `Took 50% of the credit on ${label}`), reopen: false });
    else if (dte <= 21) out.push({ order: sellAll(p, `${dte} DTE — closing ${label}`), reopen: false });
    else if (delta > 0.5) out.push({ order: sellAll(p, `Delta ${delta.toFixed(2)} > 0.50 on ${label} — rolling`), reopen: true });
  }
  return out;
}

export const putSeller: Strategy = {
  needs(ctx) {
    const target = num(ctx, "targetPositions", 8);
    const open = shortOptions(ctx, "put");
    const rolling = open.filter((p) => (p.meta.markDelta ?? 0) > 0.5).map((p) => p.symbol);
    const slots = target - open.length + rolling.length;
    if (slots <= 0) return [];
    const held = new Set(open.map((p) => p.symbol));
    const fresh = putUniverse(ctx).filter((s) => !held.has(s)).slice(0, slots * 2);
    return [...new Set([...rolling, ...fresh])].map((s) => PUT_NEED(ctx, s));
  },
  decide(ctx) {
    const target = num(ctx, "targetPositions", 8);
    const minDelta = num(ctx, "minDelta", 0.15);
    const maxDelta = num(ctx, "maxDelta", 0.25);
    const notional = num(ctx, "notionalUsd", 10000);

    const exits = putExits(ctx);
    const orders = exits.map((e) => e.order);
    for (const s of stocks(ctx)) orders.push(sellAll(s, "Liquidating assigned shares — not part of the plan"));
    const stillOpen = new Set(
      shortOptions(ctx, "put").filter((p) => !exits.some((e) => e.order.positionId === p.id)).map((p) => p.symbol),
    );
    const slots = target - stillOpen.size;
    if (slots <= 0) return orders;

    // Under the floor the book only shrinks. Exits above still run; nothing new opens.
    const floor = num(ctx, "equityFloor", 0);
    if (floor > 0 && ctx.equity <= floor) return orders;

    const reopen = exits.filter((e) => e.reopen).map((e) => e.order.symbol);
    const candidates = [...new Set([...reopen, ...putUniverse(ctx)])].filter((s) => !stillOpen.has(s));
    const released = shortOptions(ctx, "put")
      .filter((p) => exits.some((e) => e.order.positionId === p.id))
      .reduce((s, p) => s + (p.meta.marginHeld ?? 0) - (p.meta.mark ?? p.avgPrice) * 100 * p.qty, 0);
    const budget = new Budget(ctx.buyingPower + Math.max(0, released));
    let opened = 0;
    for (const symbol of candidates) {
      if (opened >= slots) break;
      const spot = price(ctx, symbol);
      if (!spot) continue;
      const found = ctx.findOption({ ...PUT_NEED(ctx, symbol), type: "put", targetDelta: 0.2 });
      if (!found || found.delta < minDelta || found.delta > maxDelta) continue;
      const c = found.contract;
      const qty = Math.max(1, Math.floor(notional / (c.strike * 100)));
      const margin = nakedPutMargin(spot, c.strike, c.mid, qty);
      if (!budget.spend(margin)) continue;
      orders.push({
        symbol, kind: "put", action: "sell", qty, strike: c.strike, expiry: c.expiry,
        reason: `Sold ${found.delta.toFixed(2)}Δ put, ${c.dte} DTE, ${(c.mid / c.strike * 365 / c.dte * 100).toFixed(0)}% annualised`,
        meta: { marginMode: "naked", marginHeld: margin },
      });
      opened++;
    }
    return orders;
  },
};

/* -- The Wheel ------------------------------------------------------------- */

function wheelNames(ctx: StrategyContext): string[] {
  const locked = ctx.state.names;
  if (Array.isArray(locked) && locked.length > 0) return locked as string[];
  const names = liquidUniverse(ctx, putUniverse(ctx), num(ctx, "maxPrice", 200), num(ctx, "names", 5));
  if (names.length > 0) ctx.state.names = names;
  return names;
}

export const wheel: Strategy = {
  needs(ctx) {
    const needs: ChainNeed[] = [];
    for (const symbol of wheelNames(ctx)) {
      const shares = stocks(ctx, symbol);
      const hasPut = shortOptions(ctx, "put", symbol).length > 0;
      const hasCall = shortOptions(ctx, "call", symbol).length > 0;
      if (shares.length > 0 && !hasCall) {
        needs.push({ symbol, minDte: num(ctx, "callMinDte", 21), maxDte: num(ctx, "callMaxDte", 40), targetDte: 30 });
      } else if (shares.length === 0 && !hasPut) {
        needs.push({ symbol, minDte: num(ctx, "putMinDte", 30), maxDte: num(ctx, "putMaxDte", 45), targetDte: 35 });
      }
    }
    return needs;
  },
  decide(ctx) {
    const delta = num(ctx, "delta", 0.3);
    const orders: Order[] = [];
    const budget = new Budget(ctx.buyingPower);
    for (const symbol of wheelNames(ctx)) {
      const shares = stocks(ctx, symbol);
      const hasPut = shortOptions(ctx, "put", symbol).length > 0;
      const hasCall = shortOptions(ctx, "call", symbol).length > 0;
      if (shares.length > 0) {
        if (hasCall) continue;
        const lots = Math.floor(shares.reduce((s, p) => s + p.qty, 0) / 100);
        if (lots < 1) continue;
        const cost = shares[0].avgPrice;
        const found = ctx.findOption({
          symbol, type: "call", targetDelta: delta, minStrike: cost,
          minDte: num(ctx, "callMinDte", 21), maxDte: num(ctx, "callMaxDte", 40), targetDte: 30,
        });
        if (!found || Math.abs(found.delta - delta) > 0.12) continue;
        const c = found.contract;
        orders.push({
          symbol, kind: "call", action: "sell", qty: lots, strike: c.strike, expiry: c.expiry,
          reason: `Covered call ${found.delta.toFixed(2)}Δ above ${cost.toFixed(2)} cost, ${c.dte} DTE`,
          meta: { marginMode: "covered", marginHeld: 0 },
        });
      } else if (!hasPut) {
        const found = ctx.findOption({
          symbol, type: "put", targetDelta: delta,
          minDte: num(ctx, "putMinDte", 30), maxDte: num(ctx, "putMaxDte", 45), targetDte: 35,
        });
        if (!found || Math.abs(found.delta - delta) > 0.12) continue;
        const c = found.contract;
        const collateral = c.strike * 100;
        if (!budget.spend(collateral)) continue;
        orders.push({
          symbol, kind: "put", action: "sell", qty: 1, strike: c.strike, expiry: c.expiry,
          reason: `Cash-secured put ${found.delta.toFixed(2)}Δ, ${c.dte} DTE, $${collateral.toLocaleString("en-US")} collateral`,
          meta: { marginMode: "cash-secured", marginHeld: collateral },
        });
      }
    }
    return orders;
  },
};
