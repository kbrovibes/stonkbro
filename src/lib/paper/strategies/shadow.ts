import type { Order, Strategy, StrategyContext } from "../types";
import { Budget, buyStock, fmtPct, num, price, stocks } from "./helpers";

function basketChangePct(ctx: StrategyContext): number | null {
  const moves = ctx.profile.universe.map((s) => ctx.quote(s)?.changePct).filter((c): c is number => c != null);
  if (moves.length === 0) return null;
  return moves.reduce((a, b) => a + b, 0) / moves.length;
}

/** Sell across the basket, pro rata by value, until `usd` is raised. */
function raise(ctx: StrategyContext, usd: number, reason: string): Order[] {
  const held = stocks(ctx).filter((p) => price(ctx, p.symbol));
  const total = held.reduce((s, p) => s + p.qty * price(ctx, p.symbol)!, 0);
  if (total <= 0) return [];
  const orders: Order[] = [];
  for (const p of held) {
    const px = price(ctx, p.symbol)!;
    const share = (p.qty * px) / total;
    const qty = Math.min(p.qty, Math.ceil((usd * share) / px));
    if (qty >= 1) orders.push({ symbol: p.symbol, kind: "stock", action: "sell", qty, positionId: p.id, reason });
  }
  return orders;
}

function rebalance(ctx: StrategyContext, reason: string): Order[] {
  const names = ctx.profile.universe.filter((s) => price(ctx, s));
  if (names.length === 0) return [];
  const target = ctx.equity / names.length;
  const sells: Order[] = [];
  const wants: Array<{ symbol: string; usd: number }> = [];
  const budget = new Budget(ctx.buyingPower);
  for (const symbol of names) {
    const px = price(ctx, symbol)!;
    const held = stocks(ctx, symbol).reduce((s, p) => s + p.qty, 0);
    const diff = target - held * px;
    if (diff < -px) {
      const qty = Math.floor(-diff / px);
      sells.push({ symbol, kind: "stock", action: "sell", qty, reason: `${reason} — trim to equal weight` });
      budget.add(qty * px);
    } else if (diff > px) wants.push({ symbol, usd: diff });
  }
  const buys: Order[] = [];
  for (const w of wants) {
    const o = buyStock(ctx, w.symbol, w.usd, budget, `${reason} — equal weight`);
    if (o) buys.push(o);
  }
  return [...sells, ...buys];
}

export const shadow: Strategy = {
  needs: () => [],
  decide(ctx) {
    const last = typeof ctx.state.lastRebalanceEquity === "number" ? ctx.state.lastRebalanceEquity : null;
    const takePct = num(ctx, "takePct", 10);
    const dipPct = num(ctx, "dipPct", -3);
    const addPct = num(ctx, "addPct", 25);

    if (last != null && ctx.equity >= last * (1 + takePct / 100) && ctx.cash < 0) {
      ctx.state.lastRebalanceEquity = ctx.equity;
      return raise(ctx, -ctx.cash, `Equity ${fmtPct((ctx.equity / last - 1) * 100)} since the last rebalance — paying off margin`);
    }

    if (ctx.isFirstSessionOfMonth || stocks(ctx).length === 0) {
      const orders = rebalance(ctx, ctx.isFirstSessionOfMonth ? "Monthly rebalance" : "Initial allocation");
      if (orders.length > 0) ctx.state.lastRebalanceEquity = ctx.equity;
      return orders;
    }

    const move = basketChangePct(ctx);
    if (move != null && move < dipPct && ctx.state.lastAddDate !== ctx.date) {
      ctx.state.lastAddDate = ctx.date;
      const names = ctx.profile.universe.filter((s) => price(ctx, s));
      const budget = new Budget(ctx.buyingPower);
      const per = (ctx.equity * addPct) / 100 / names.length;
      const orders: Order[] = [];
      for (const symbol of names) {
        const o = buyStock(ctx, symbol, per, budget, `Basket ${fmtPct(move)} on the day — adding ${addPct}% of equity on margin`);
        if (o) orders.push(o);
      }
      return orders;
    }
    return [];
  },
};
