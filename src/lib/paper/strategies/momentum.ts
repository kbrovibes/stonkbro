import type { Order, Position, Strategy, StrategyContext } from "../types";
import { Budget, buyStock, fmtPct, num, price, sellAll, stocks, unrealizedPct } from "./helpers";

function signal(ctx: StrategyContext, symbol: string): { ok: boolean; ret20: number } {
  const px = price(ctx, symbol);
  const sma50 = ctx.sma(symbol, 50);
  const sma200 = ctx.sma(symbol, 200);
  const ret20 = ctx.returnPct(symbol, 20);
  if (!px || sma50 == null || sma200 == null || ret20 == null) return { ok: false, ret20: 0 };
  return { ok: px > sma50 && px > sma200 && ret20 > 0, ret20 };
}

function exits(ctx: StrategyContext, trailPct: number): Order[] {
  const orders: Order[] = [];
  for (const p of stocks(ctx)) {
    const px = price(ctx, p.symbol);
    if (!px) continue;
    if (ctx.session === "close") p.meta.highClose = Math.max(p.meta.highClose ?? p.avgPrice, px);
    const high = p.meta.highClose ?? p.avgPrice;
    const offHigh = (px / high - 1) * 100;
    if (offHigh <= -trailPct) {
      orders.push(sellAll(p, `Trailing stop: ${fmtPct(offHigh)} from the ${high.toFixed(2)} high`));
      continue;
    }
    const sma50 = ctx.sma(p.symbol, 50);
    if (ctx.session === "close" && sma50 != null && px < sma50) {
      orders.push(sellAll(p, `Closed below the 50-day SMA (${sma50.toFixed(2)})`));
    }
  }
  return orders;
}

/** Sell the weakest names until the borrowed balance is covered. */
function deleverage(ctx: StrategyContext, floor: number, exiting: Set<string>): Order[] {
  if (ctx.equity >= floor || ctx.cash >= 0) return [];
  let need = -ctx.cash;
  const orders: Order[] = [];
  const weakest = stocks(ctx)
    .filter((p) => !exiting.has(p.id))
    .sort((a, b) => unrealizedPct(a) - unrealizedPct(b));
  for (const p of weakest) {
    if (need <= 0) break;
    const px = price(ctx, p.symbol) ?? p.avgPrice;
    orders.push(sellAll(p, `Equity under $${floor.toLocaleString("en-US")} — selling weakest (${fmtPct(unrealizedPct(p))}) to cut borrowing`));
    need -= p.qty * px;
  }
  return orders;
}

export function momentum(): Strategy {
  return {
    needs: () => [],
    decide(ctx) {
      const maxPositions = num(ctx, "maxPositions", 8);
      const weightPct = num(ctx, "weightPct", 12.5);
      const trailPct = num(ctx, "trailPct", 8);
      const floor = num(ctx, "equityFloor", 0);

      const orders = exits(ctx, trailPct);
      const exiting = new Set(orders.map((o) => o.positionId).filter((id): id is string => !!id));
      if (floor > 0) {
        const d = deleverage(ctx, floor, exiting);
        for (const o of d) exiting.add(o.positionId!);
        orders.push(...d);
      }
      if (ctx.session !== "open") return orders;

      const held = new Set(stocks(ctx).filter((p: Position) => !exiting.has(p.id)).map((p) => p.symbol));
      const slots = maxPositions - held.size;
      if (slots <= 0) return orders;

      const candidates = ctx.profile.universe
        .filter((s) => !held.has(s))
        .map((symbol) => ({ symbol, ...signal(ctx, symbol) }))
        .filter((c) => c.ok)
        .sort((a, b) => b.ret20 - a.ret20)
        .slice(0, slots);

      const budget = new Budget(ctx.buyingPower);
      const size = (ctx.equity * weightPct) / 100;
      for (const c of candidates) {
        const o = buyStock(ctx, c.symbol, size, budget, `Above 50/200-day SMA, ${fmtPct(c.ret20)} over 20d`);
        if (o) orders.push(o);
      }
      return orders;
    },
  };
}
