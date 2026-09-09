import type { OptionContract } from "@/lib/market/types";
import type { Order, Position, Strategy, StrategyContext } from "../types";
import { num, price, sellAll } from "./helpers";

const SYMBOL = "SPY";

function legs(ctx: StrategyContext): Position[] {
  return ctx.positions.filter((p) => p.symbol === SYMBOL && p.kind !== "stock" && p.meta.group);
}

/** Cost to close the condor per share: short marks minus long marks. */
function closeCost(group: Position[]): number {
  return group.reduce((s, p) => s + (p.side === "short" ? 1 : -1) * (p.meta.mark ?? p.avgPrice), 0);
}

/** The wing at least `width` away from the short strike, nearest to it. */
function wing(ctx: StrategyContext, short: OptionContract, width: number): OptionContract | null {
  const wingward = short.type === "put" ? -1 : 1;
  const candidates = ctx
    .chain(SYMBOL)
    .filter((c) => c.type === short.type && c.expiry === short.expiry && (c.strike - short.strike) * wingward >= width - 1e-6)
    .sort((a, b) => Math.abs(a.strike - short.strike) - Math.abs(b.strike - short.strike));
  return candidates[0] ?? null;
}

function findShort(ctx: StrategyContext, type: "call" | "put", minDte: number, maxDte: number, expiry?: string) {
  const found = ctx.findOption({ symbol: SYMBOL, type, targetDelta: num(ctx, "delta", 0.15), minDte, maxDte, targetDte: 8 });
  if (!found || (expiry && found.contract.expiry !== expiry)) return null;
  return found;
}

function openCondor(ctx: StrategyContext): Order[] {
  const width = num(ctx, "width", 5);
  const minDte = num(ctx, "minDte", 7);
  const maxDte = num(ctx, "maxDte", 10);
  let sp = findShort(ctx, "put", minDte, maxDte);
  let fallback = false;
  if (!sp) {
    sp = findShort(ctx, "put", minDte, 24);
    fallback = true;
  }
  if (!sp) return [];
  const expiry = sp.contract.expiry;
  const dte = sp.contract.dte;
  const sc = findShort(ctx, "call", dte, dte, expiry);
  if (!sc) return [];
  const lp = wing(ctx, sp.contract, width);
  const lc = wing(ctx, sc.contract, width);
  if (!lp || !lc || sc.contract.strike <= sp.contract.strike) return [];

  const credit = sp.contract.mid + sc.contract.mid - lp.mid - lc.mid;
  const widest = Math.max(sp.contract.strike - lp.strike, lc.strike - sc.contract.strike);
  const maxLoss = (widest - credit) * 100;
  if (credit <= 0 || maxLoss <= 0) return [];
  const qty = Math.floor((ctx.equity * num(ctx, "riskPct", 2)) / 100 / maxLoss);
  if (qty < 1) return [];
  if (qty * (lp.mid + lc.mid) * 100 + maxLoss * qty > ctx.buyingPower) return [];

  const group = `condor-${ctx.date}`;
  const why = `${dte} DTE${fallback ? " (nearest weekly)" : ""}, ${credit.toFixed(2)} credit, max loss $${Math.round(maxLoss * qty).toLocaleString("en-US")}`;
  const leg = (c: OptionContract, action: "buy" | "sell", extra: Order["meta"]): Order => ({
    symbol: SYMBOL, kind: c.type, action, qty, strike: c.strike, expiry: c.expiry,
    reason: `${action === "sell" ? "Short" : "Long"} ${c.strike}${c.type === "call" ? "C" : "P"} — condor ${why}`,
    meta: { group, groupCredit: credit, ...extra },
  });
  return [
    leg(lp, "buy", { marginMode: "none" }),
    leg(lc, "buy", { marginMode: "none" }),
    leg(sp.contract, "sell", { marginMode: "spread", marginHeld: maxLoss * qty }),
    leg(sc.contract, "sell", { marginMode: "spread", marginHeld: 0 }),
  ];
}

export const condor: Strategy = {
  needs(ctx) {
    if (legs(ctx).length > 0 || !ctx.isFirstSessionOfWeek) return [];
    return [{ symbol: SYMBOL, minDte: num(ctx, "minDte", 7), maxDte: 24, targetDte: 8 }];
  },
  decide(ctx) {
    if (!price(ctx, SYMBOL)) return [];
    const open = legs(ctx);
    if (open.length > 0) {
      const credit = open[0].meta.groupCredit ?? 0;
      const cost = closeCost(open);
      let why: string | null = null;
      if (credit > 0 && cost <= credit * num(ctx, "takeProfit", 0.5)) why = `Condor at ${Math.round((cost / credit) * 100)}% of the ${credit.toFixed(2)} credit — taking profit`;
      else if (credit > 0 && cost >= credit * num(ctx, "stopLoss", 2)) why = `Condor at ${(cost / credit).toFixed(1)}× the ${credit.toFixed(2)} credit — cutting the loss`;
      if (!why) return [];
      const shorts = open.filter((p) => p.side === "short").map((p) => sellAll(p, why!));
      const longs = open.filter((p) => p.side === "long").map((p) => sellAll(p, why!));
      return [...shorts, ...longs];
    }
    if (!ctx.isFirstSessionOfWeek) return [];
    return openCondor(ctx);
  },
};
