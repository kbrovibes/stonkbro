import type { Order, Strategy, StrategyContext } from "../types";
import { Budget, buyStock, fmtPct, num } from "./helpers";

function weights(ctx: StrategyContext): Array<[string, number]> {
  const raw = ctx.profile.params.weights;
  if (!Array.isArray(raw)) return [["SPY", 60], ["QQQ", 30], ["IWM", 10]];
  return raw.map((w) => {
    const [symbol, pct] = String(w).split(":");
    return [symbol, Number(pct)] as [string, number];
  });
}

function clip(ctx: StrategyContext, budget: Budget, reason: string): Order[] {
  const usd = num(ctx, "clipUsd", 5000);
  const orders: Order[] = [];
  for (const [symbol, pct] of weights(ctx)) {
    const o = buyStock(ctx, symbol, (usd * pct) / 100, budget, reason);
    if (o) orders.push(o);
  }
  return orders;
}

export const dca: Strategy = {
  needs: () => [],
  decide(ctx) {
    const budget = new Budget(ctx.buyingPower);
    if (ctx.session === "open") return clip(ctx, budget, "Daily DCA clip");
    if (ctx.session === "close") {
      const spy = ctx.quote("SPY");
      if (spy && spy.changePct < num(ctx, "dipPct", -1)) {
        return clip(ctx, budget, `SPY ${fmtPct(spy.changePct)} on the day — extra clip`);
      }
    }
    return [];
  },
};
