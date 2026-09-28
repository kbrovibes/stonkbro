import { addDays, isWeekend } from "../dates";
import type { ChainNeed, Order, Position, Strategy, StrategyContext } from "../types";
import { Budget, fmtPct, num, price, sellAll, unrealizedPct } from "./helpers";

/**
 * One big, defined-risk options bet on every earnings report coming up in
 * the next few sessions. Direction comes from trend: a name with clear
 * momentum gets a single-sided call or put; anything ambiguous gets a
 * strangle instead, betting on the size of the move rather than its
 * direction. Every play is tracked in `state.earningsPlays` until it's
 * closed, so a bet survives across cron ticks without re-entering itself.
 */

interface EarningsPlay {
  symbol: string;
  earningsDate: string;
  timing: string;
  direction: "bullish" | "bearish" | "volatility";
  closeDate: string;
  opened: string;
}

function plays(ctx: StrategyContext): EarningsPlay[] {
  const raw = ctx.state.earningsPlays;
  return Array.isArray(raw) ? (raw as EarningsPlay[]) : [];
}

function savePlays(ctx: StrategyContext, list: EarningsPlay[]): void {
  ctx.state.earningsPlays = list;
}

function legsOf(ctx: StrategyContext, symbol: string): Position[] {
  return ctx.positions.filter((p) => p.symbol === symbol && p.side === "long" && (p.kind === "call" || p.kind === "put"));
}

/** `n` trading days after `date`, skipping weekends. */
function addTradingDays(date: string, n: number): string {
  let d = date;
  for (let added = 0; added < n; ) {
    d = addDays(d, 1);
    if (!isWeekend(d)) added++;
  }
  return d;
}

interface Candidate {
  symbol: string;
  earningsDate: string;
  timing: string;
  daysUntil: number;
}

function candidateEvents(ctx: StrategyContext): Candidate[] {
  const lookahead = num(ctx, "lookaheadDays", 5);
  const active = new Set(plays(ctx).map((p) => p.symbol));
  const out: Candidate[] = [];
  for (const symbol of ctx.profile.universe) {
    if (active.has(symbol)) continue;
    const ev = ctx.earnings(symbol);
    if (!ev || ev.daysUntil < 0 || ev.daysUntil > lookahead) continue;
    out.push({ symbol, earningsDate: ev.earningsDate, timing: ev.timing, daysUntil: ev.daysUntil });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

type Bias = "bullish" | "bearish" | "volatility";

function biasFor(ctx: StrategyContext, symbol: string): { bias: Bias; why: string } {
  const trend = num(ctx, "trendReturnPct", 5);
  const px = price(ctx, symbol);
  const sma50 = ctx.sma(symbol, 50);
  const ret20 = ctx.returnPct(symbol, 20);
  if (px == null || sma50 == null || ret20 == null) return { bias: "volatility", why: "no trend read" };
  const vsSma = ((px / sma50) - 1) * 100;
  const why = `20d ${fmtPct(ret20)}, ${fmtPct(vsSma)} vs the 50-day`;
  if (px > sma50 && ret20 > trend) return { bias: "bullish", why };
  if (px < sma50 && ret20 < -trend) return { bias: "bearish", why };
  return { bias: "volatility", why: `${why} — no clear side` };
}

/** ATM straddle on `expiry` as a % of spot — the move the market is pricing through the print. */
function impliedMovePct(ctx: StrategyContext, symbol: string, expiry: string): number | null {
  const spot = price(ctx, symbol);
  if (!spot) return null;
  const onExpiry = ctx.chain(symbol).filter((c) => c.expiry === expiry && c.mid > 0);
  const atm = (type: "call" | "put") =>
    onExpiry.filter((c) => c.type === type).sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot))[0];
  const call = atm("call");
  const put = atm("put");
  return call && put ? ((call.mid + put.mid) / spot) * 100 : null;
}

const TIMING: Record<string, string> = { before_market: "before the open", after_market: "after the close", unknown: "" };

function needWindow(ctx: StrategyContext, daysUntil: number): { minDte: number; maxDte: number; targetDte: number } {
  const minAfter = num(ctx, "minDteAfter", 1);
  const maxAfter = num(ctx, "maxDteAfter", 10);
  return { minDte: Math.max(0, daysUntil + minAfter), maxDte: daysUntil + maxAfter, targetDte: daysUntil + minAfter + 2 };
}

export const earningsSwing: Strategy = {
  needs(ctx) {
    return candidateEvents(ctx).map((ev): ChainNeed => ({ symbol: ev.symbol, ...needWindow(ctx, ev.daysUntil) }));
  },
  decide(ctx) {
    const orders: Order[] = [];
    const takePct = num(ctx, "takePct", 75);
    const stopPct = num(ctx, "stopPct", -50);
    const holdDaysAfter = num(ctx, "holdDaysAfter", 2);

    const remaining: EarningsPlay[] = [];
    for (const play of plays(ctx)) {
      const legs = legsOf(ctx, play.symbol);
      if (legs.length === 0) continue; // already settled/expired — drop it
      let keepPlay = false;
      for (const leg of legs) {
        const upct = unrealizedPct(leg);
        let reason: string | null = null;
        if (upct >= takePct) reason = `+${upct.toFixed(0)}% after ${play.symbol}'s print — taking the win`;
        else if (upct <= stopPct) reason = `${upct.toFixed(0)}% after ${play.symbol}'s print — cutting the loss`;
        else if (ctx.date >= play.closeDate) {
          reason = `Closing ${holdDaysAfter} trading day${holdDaysAfter === 1 ? "" : "s"} after the ${play.symbol} print, win or lose`;
        }
        if (reason) orders.push(sellAll(leg, reason));
        else keepPlay = true;
      }
      if (keepPlay) remaining.push(play);
    }

    const budget = new Budget(ctx.buyingPower);
    const sizePct = num(ctx, "sizePct", 8);
    const maxSizeUsd = num(ctx, "maxSizeUsd", 15000);

    for (const ev of candidateEvents(ctx)) {
      const { bias, why } = biasFor(ctx, ev.symbol);
      const window = needWindow(ctx, ev.daysUntil);
      const legTypes: Array<"call" | "put"> = bias === "bullish" ? ["call"] : bias === "bearish" ? ["put"] : ["call", "put"];
      const targetDelta = legTypes.length === 2 ? 0.3 : 0.45;
      const structure = bias === "bullish" ? "long call" : bias === "bearish" ? "long put" : "long strangle";
      const when = [ev.earningsDate, TIMING[ev.timing]].filter(Boolean).join(" ");
      const opened: Order[] = [];

      for (const type of legTypes) {
        const found = ctx.findOption({ symbol: ev.symbol, type, targetDelta, ...window });
        if (!found) continue;
        const c = found.contract;
        const perContract = c.mid * 100 + 0.65;
        const desiredUsd = Math.min(ctx.equity * (sizePct / 100), maxSizeUsd);
        let qty = Math.max(1, Math.floor(desiredUsd / perContract));
        while (qty > 1 && qty * perContract > budget.remaining) qty--;
        const cost = qty * perContract;
        if (cost > budget.remaining) continue;
        budget.spend(cost);
        const move = impliedMovePct(ctx, ev.symbol, c.expiry);
        const spot = price(ctx, ev.symbol) ?? 0;
        const breakeven = type === "call" ? c.strike + c.mid : c.strike - c.mid;
        const needed = spot > 0 ? ((breakeven / spot) - 1) * 100 : 0;
        opened.push({
          symbol: ev.symbol, kind: type, action: "buy", qty, strike: c.strike, expiry: c.expiry,
          reason: [
            `${ev.symbol} reports ${when} (${ev.daysUntil}d)`,
            `${structure}: ${why}`,
            move != null ? `market prices ±${move.toFixed(1)}% through ${c.expiry}` : null,
            `${found.delta.toFixed(2)}Δ ${type}, breakeven ${breakeven.toFixed(2)} (${fmtPct(needed)} from spot)`,
            `$${Math.round(cost).toLocaleString("en-US")} at risk, ${((cost / ctx.equity) * 100).toFixed(1)}% of equity`,
          ].filter(Boolean).join(" · "),
        });
      }

      if (opened.length === 0) continue;
      orders.push(...opened);
      remaining.push({
        symbol: ev.symbol, earningsDate: ev.earningsDate, timing: ev.timing, direction: bias,
        closeDate: addTradingDays(ev.earningsDate, holdDaysAfter),
        opened: ctx.date,
      });
    }

    savePlays(ctx, remaining);
    return orders;
  },
};
