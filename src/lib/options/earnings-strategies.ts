/**
 * The four earnings structures offered for a report. Pure: takes one expiry's
 * chain plus the setup read, returns fully-priced plans with the reasoning
 * written out. Ranked on the question the page answers — what does each one
 * do on a 5–10% move, closed the session after the print.
 */
import type { OptionContract } from "@/lib/market/types";
import {
  contractIv, evaluate, expiryExtremes, liquid, makeLeg, nearest, netPremium,
  COMMISSION, type Evaluation, type ExitModel, type Leg, type VolSplit,
} from "./earnings-model";

export type Bias = "bullish" | "bearish" | "neutral";
export type IvRegime = "rich" | "fair" | "cheap" | "unknown";
export type StrategyId =
  | "long_call" | "long_put"
  | "bull_call_spread" | "bear_put_spread"
  | "bull_put_spread" | "bear_call_spread"
  | "iron_condor" | "long_straddle" | "long_strangle";

export interface PlayContext {
  symbol: string;
  spot: number;
  earningsDate: string;
  /** "after the close", "before the open", or "" when the feed doesn't say. */
  timingLabel: string;
  entryDate: string;
  exitDate: string;
  expiry: string;
  bias: Bias;
  biasScore: number;
  /** Short, already-worded reasons behind the bias. */
  drivers: string[];
  impliedMovePct: number;
  histAvgMovePct: number | null;
  regime: IvRegime;
  vol: VolSplit;
}

export interface StrategyPlan extends Evaluation {
  id: StrategyId;
  name: string;
  kind: "debit" | "credit";
  stance: string;
  legs: Leg[];
  /** Per share: positive = debit, negative = credit. */
  netPremium: number;
  /** Cash out (debit) or in (credit) to open one unit, commissions included. */
  openCash: number;
  capitalAtRisk: number;
  maxGainAtExpiry: number | null;
  maxLossAtExpiry: number;
  /** Weighted average P&L across the 5–10% band ÷ capital at risk. */
  fitScore: number;
  bestFit: boolean;
  summary: string;
  contract: string[];
  why: string[];
  wins: string[];
  loses: string[];
  exitPlan: string;
  warnings: string[];
}

const NAMES: Record<StrategyId, { name: string; stance: string }> = {
  long_call: { name: "Long call", stance: "Bullish · uncapped" },
  long_put: { name: "Long put", stance: "Bearish · uncapped" },
  bull_call_spread: { name: "Bull call spread", stance: "Bullish · defined risk" },
  bear_put_spread: { name: "Bear put spread", stance: "Bearish · defined risk" },
  bull_put_spread: { name: "Bull put credit spread", stance: "Bullish-to-flat · sells the crush" },
  bear_call_spread: { name: "Bear call credit spread", stance: "Bearish-to-flat · sells the crush" },
  iron_condor: { name: "Iron condor", stance: "Neutral · sells the crush" },
  long_straddle: { name: "Long straddle", stance: "Big move either way" },
  long_strangle: { name: "Long strangle", stance: "Bigger move either way, cheaper" },
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const usd = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
const signedUsd = (n: number) => `${n < 0 ? "−" : "+"}${usd(n)}`;
const px = (n: number) => `$${n.toFixed(2)}`;
const pctFrom = (price: number, spot: number) => {
  const p = (price / spot - 1) * 100;
  return `${p < 0 ? "−" : "+"}${Math.abs(p).toFixed(1)}%`;
};
const strike = (k: number) => `$${Number.isInteger(k) ? k : k.toFixed(1)}`;
const rangeText = (r: { min: number; max: number }) =>
  Math.abs(r.max - r.min) < 5 ? signedUsd(r.min) : `${signedUsd(r.min)} to ${signedUsd(r.max)}`;

function shortExpiry(expiry: string): string {
  return new Date(`${expiry}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/* -- strike selection -------------------------------------------------- */

interface Picker {
  chain: OptionContract[];
  spot: number;
  move: number;
  wing: number;
}

function strikeStep(chain: OptionContract[], spot: number): number {
  const ks = [...new Set(chain.map((c) => c.strike))].sort((a, b) => Math.abs(a - spot) - Math.abs(b - spot)).slice(0, 8).sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < ks.length; i++) step = Math.min(step, ks[i] - ks[i - 1]);
  return Number.isFinite(step) ? step : spot * 0.01;
}

/** Protective wing on `dir` side of `from`, at least one wing-width away. */
function wing(p: Picker, type: "call" | "put", from: number, dir: 1 | -1): OptionContract | null {
  const target = from + dir * p.wing;
  let best: OptionContract | null = null;
  for (const c of p.chain) {
    if (c.type !== type || dir * (c.strike - from) < p.wing * 0.999) continue;
    if (!best || Math.abs(c.strike - target) < Math.abs(best.strike - target)) best = c;
  }
  return best;
}

type Structure = Array<["buy" | "sell", OptionContract | null]>;

function structureFor(id: StrategyId, p: Picker): Structure | null {
  const { chain, spot, move } = p;
  const atmCall = nearest(chain, "call", spot);
  const atmPut = nearest(chain, "put", spot);
  const target = clamp(move, 0.06, 0.1);
  switch (id) {
    case "long_call":
      return [["buy", atmCall]];
    case "long_put":
      return [["buy", atmPut]];
    case "bull_call_spread": {
      const short = nearest(chain, "call", spot * (1 + target));
      return atmCall && short && short.strike > atmCall.strike ? [["buy", atmCall], ["sell", short]] : null;
    }
    case "bear_put_spread": {
      const short = nearest(chain, "put", spot * (1 - target));
      return atmPut && short && short.strike < atmPut.strike ? [["buy", atmPut], ["sell", short]] : null;
    }
    case "bull_put_spread": {
      const short = nearest(chain, "put", spot * (1 - move));
      if (!short || short.strike >= spot) return null;
      return [["sell", short], ["buy", wing(p, "put", short.strike, -1)]];
    }
    case "bear_call_spread": {
      const short = nearest(chain, "call", spot * (1 + move));
      if (!short || short.strike <= spot) return null;
      return [["sell", short], ["buy", wing(p, "call", short.strike, 1)]];
    }
    case "iron_condor": {
      const put = structureFor("bull_put_spread", p);
      const call = structureFor("bear_call_spread", p);
      return put && call ? [...put, ...call] : null;
    }
    case "long_straddle": {
      if (!atmCall) return null;
      const put = chain.find((c) => c.type === "put" && c.strike === atmCall.strike) ?? null;
      return [["buy", atmCall], ["buy", put]];
    }
    case "long_strangle": {
      const call = nearest(chain, "call", spot * (1 + move / 2));
      const put = nearest(chain, "put", spot * (1 - move / 2));
      if (!call || !put || call.strike <= spot || put.strike >= spot) return null;
      return [["buy", call], ["buy", put]];
    }
  }
}

/* -- the words --------------------------------------------------------- */

function biasLine(ctx: PlayContext): string {
  const score = `${ctx.biasScore >= 0 ? "+" : "−"}${Math.abs(ctx.biasScore).toFixed(2)}`;
  const because = ctx.drivers.slice(0, 3).join("; ");
  const lean = ctx.bias === "neutral" ? "no clear lean" : `lean ${ctx.bias}`;
  return `Trend, momentum and news ${lean} (score ${score} on −1…+1)${because ? `: ${because}` : ""}.`;
}

function moveLine(ctx: PlayContext): string {
  const hist = ctx.histAvgMovePct != null ? ` vs ~${ctx.histAvgMovePct.toFixed(1)}% average on its last reports` : "";
  return `Options price a ±${ctx.impliedMovePct.toFixed(1)}% move through ${shortExpiry(ctx.expiry)}${hist}.`;
}

function regimeLine(ctx: PlayContext, buyer: boolean): string | null {
  if (ctx.regime === "cheap") {
    return buyer
      ? "Premium looks cheap next to past reactions — the setup favors buying options."
      : "Premium looks cheap next to past reactions, so there's less crush to harvest than usual.";
  }
  if (ctx.regime === "rich") {
    return buyer
      ? "Caution: premium is rich next to past reactions — you're paying up, and the crush hits hardest here."
      : "Premium is rich next to past reactions — that's when selling the crush pays best.";
  }
  return null;
}

function crushLine(ctx: PlayContext): string {
  const { frontIv, baseIv, method } = ctx.vol;
  const how = method === "term-structure" ? "from the gap to the next expiry" : method === "realized-vol" ? "from realized volatility" : "— no estimate available";
  return `IV is modeled dropping from ${(frontIv * 100).toFixed(0)}% to ~${(baseIv * 100).toFixed(0)}% once the report is out (${how}).`;
}

function winsText(plan: StrategyPlan, ctx: PlayContext): string[] {
  const { breakevens: be, spot } = { breakevens: plan.breakevens, spot: ctx.spot };
  const flat = plan.scenarios.find((s) => s.movePct === 0)?.pnl ?? 0;
  const up10 = plan.scenarios.find((s) => s.movePct === 10)?.pnl ?? 0;
  const out: string[] = [];
  if (be.length === 1) {
    out.push(`Profitable at exit ${up10 > 0 ? "above" : "below"} ${px(be[0])} (${pctFrom(be[0], spot)} from ${px(spot)}).`);
  } else if (be.length >= 2) {
    const lo = be[0];
    const hi = be[be.length - 1];
    out.push(flat < 0
      ? `Profitable at exit below ${px(lo)} or above ${px(hi)} (${pctFrom(lo, spot)} / ${pctFrom(hi, spot)}).`
      : `Profitable at exit between ${px(lo)} and ${px(hi)} (${pctFrom(lo, spot)} / ${pctFrom(hi, spot)}).`);
  } else {
    out.push(flat < 0 ? "Loses money across the whole ±30% range at exit — the crush outweighs any move." : "Profitable across the whole modeled range at exit.");
  }
  out.push(`On a 5–10% move up: ${rangeText(plan.band.up)}. Down 5–10%: ${rangeText(plan.band.down)}.`);
  return out;
}

function losesText(plan: StrategyPlan, ctx: PlayContext): string[] {
  const flat = plan.scenarios.find((s) => s.movePct === 0)?.pnl ?? 0;
  const out = [flat < 0
    ? `If ${ctx.symbol} barely moves, the IV crush alone costs about ${usd(flat)}.`
    : `If ${ctx.symbol} barely moves, the crush works for you: about ${signedUsd(flat)}.`];
  out.push(plan.kind === "debit"
    ? `Most you can lose is the ${usd(plan.maxLossAtExpiry)} paid${plan.legs.length === 1 ? " — the premium" : ""}.`
    : `Most you can lose is ${usd(plan.maxLossAtExpiry)} (spread width minus the credit), if a short strike ends deep in the money.`);
  return out;
}

function whyText(id: StrategyId, plan: StrategyPlan, ctx: PlayContext): string[] {
  const sym = ctx.symbol;
  const buy = plan.legs.filter((l) => l.action === "buy");
  const sell = plan.legs.filter((l) => l.action === "sell");
  const lines: Array<string | null> = [];
  switch (id) {
    case "long_call":
    case "long_put": {
      const dir = id === "long_call" ? "above" : "below";
      lines.push(biasLine(ctx), moveLine(ctx));
      lines.push(`The at-the-money ${id === "long_call" ? "call" : "put"} is the purest bet: every dollar ${sym} moves ${dir} breakeven is yours, with no cap if the move runs past 10%.`);
      lines.push(regimeLine(ctx, true));
      break;
    }
    case "bull_call_spread":
    case "bear_put_spread": {
      const saved = sell[0] ? sell[0].fill * 100 : 0;
      lines.push(biasLine(ctx));
      lines.push(`Selling the ${strike(sell[0]?.strike ?? 0)} ${sell[0]?.type} pays ${usd(saved)} of the ${strike(buy[0]?.strike ?? 0)} ${buy[0]?.type}, so the crush does far less damage — in exchange, gains stop at ${strike(sell[0]?.strike ?? 0)} (${pctFrom(sell[0]?.strike ?? ctx.spot, ctx.spot)}).`);
      lines.push("That cap sits inside the 5–10% zone you're targeting, so the move you expect captures most of the spread's value.");
      lines.push(regimeLine(ctx, true));
      break;
    }
    case "bull_put_spread":
    case "bear_call_spread": {
      const side = id === "bull_put_spread" ? "down" : "up";
      lines.push(biasLine(ctx));
      lines.push(`You collect ${usd(-plan.openCash)} up front and win if ${sym} goes your way, stays flat, or moves ${side} less than the ${strike(sell[0]?.strike ?? 0)} short strike — the crush works for you instead of against you.`);
      lines.push(`The short strike sits at the edge of the market's expected move (${pctFrom(sell[0]?.strike ?? ctx.spot, ctx.spot)}).`);
      lines.push(regimeLine(ctx, false));
      break;
    }
    case "iron_condor": {
      const shorts = sell.map((l) => l.strike).sort((a, b) => a - b);
      lines.push(`Market-neutral: collects ${usd(-plan.openCash)} and keeps it if ${sym} stays between ${strike(shorts[0])} and ${strike(shorts[1])} — both short strikes sit at the ±${ctx.impliedMovePct.toFixed(1)}% expected move.`);
      lines.push(regimeLine(ctx, false) ?? moveLine(ctx));
      lines.push("Included as the counter-case: a 5–10% move is exactly where this trade loses, so it only makes sense if you think the market is over-pricing the print.");
      break;
    }
    case "long_straddle":
    case "long_strangle": {
      lines.push(`No direction needed — ${id === "long_straddle" ? `owns both the ${strike(buy[0]?.strike ?? 0)} call and put` : `owns the ${strike(buy.find((l) => l.type === "put")?.strike ?? 0)} put and the ${strike(buy.find((l) => l.type === "call")?.strike ?? 0)} call`} and pays off on a big move either way.`);
      lines.push(moveLine(ctx));
      if (id === "long_strangle") lines.push("Cheaper than the straddle because both strikes are out of the money, but it needs a bigger move to pay.");
      lines.push(ctx.bias === "neutral" ? biasLine(ctx) : `Useful if you trust the size of the move more than the ${ctx.bias} lean.`);
      lines.push(regimeLine(ctx, true));
      break;
    }
  }
  lines.push(crushLine(ctx));
  return lines.filter((l): l is string => !!l);
}

function summaryText(id: StrategyId, plan: StrategyPlan): string {
  const ks = (legs: Leg[]) => legs.map((l) => strike(l.strike)).join("/");
  const puts = plan.legs.filter((l) => l.type === "put").sort((a, b) => a.strike - b.strike);
  const calls = plan.legs.filter((l) => l.type === "call").sort((a, b) => a.strike - b.strike);
  const cash = plan.kind === "debit" ? `for ${usd(plan.openCash)}` : `for a ${usd(-plan.openCash)} credit`;
  switch (id) {
    case "long_call": return `Buy the ${ks(calls)} call ${cash}.`;
    case "long_put": return `Buy the ${ks(puts)} put ${cash}.`;
    case "bull_call_spread": return `Buy the ${ks(calls)} call spread ${cash}.`;
    case "bear_put_spread": return `Buy the ${ks([...puts].reverse())} put spread ${cash}.`;
    case "bull_put_spread": return `Sell the ${ks([...puts].reverse())} put spread ${cash}.`;
    case "bear_call_spread": return `Sell the ${ks(calls)} call spread ${cash}.`;
    case "iron_condor": return `Sell the ${ks(puts)} · ${ks(calls)} iron condor ${cash}.`;
    case "long_straddle": return `Buy the ${ks(calls)} straddle ${cash}.`;
    case "long_strangle": return `Buy the ${ks(puts)} put + ${ks(calls)} call strangle ${cash}.`;
  }
}

function contractLine(ctx: PlayContext, l: Leg): string {
  const greeks = [
    `IV ${(l.iv * 100).toFixed(0)}%`,
    l.delta != null ? `Δ ${Math.abs(l.delta).toFixed(2)}` : null,
    `OI ${l.openInterest.toLocaleString("en-US")}`,
  ].filter(Boolean).join(" · ");
  return `${l.action === "buy" ? "Buy" : "Sell"} ${l.qty} ${ctx.symbol} ${shortExpiry(l.expiry)} ${strike(l.strike)} ${l.type} @ ~${px(l.fill)} (bid ${px(l.bid)} / ask ${px(l.ask)} · ${greeks})`;
}

function warningsFor(plan: StrategyPlan, ctx: PlayContext): string[] {
  const out: string[] = [];
  for (const l of plan.legs) {
    const width = l.mid > 0 ? (l.ask - l.bid) / l.mid : 1;
    if (width > 0.15) out.push(`Wide market on the ${strike(l.strike)} ${l.type} (${px(l.bid)} / ${px(l.ask)}) — work a limit near the mid.`);
    if (l.openInterest < 100) out.push(`Thin open interest (${l.openInterest}) on the ${strike(l.strike)} ${l.type}.`);
  }
  if (plan.kind === "credit") out.push("Short legs can be assigned early if they go deep in the money — close the spread rather than hold it into expiry.");
  if (ctx.vol.method !== "term-structure") out.push("No clean second expiry to measure the crush against — post-earnings IV is estimated, so treat the P&L as a rougher guide.");
  return [...new Set(out)];
}

/* -- assembly ---------------------------------------------------------- */

function build(id: StrategyId, ctx: PlayContext, p: Picker, exit: ExitModel, tNow: number): StrategyPlan | null {
  const s = structureFor(id, p);
  if (!s || s.some(([, c]) => !c)) return null;
  const legs: Leg[] = [];
  for (const [action, c] of s as Array<["buy" | "sell", OptionContract]>) {
    const iv = contractIv(c, ctx.spot, tNow);
    if (iv == null) return null;
    legs.push(makeLeg(action, c, iv));
  }
  const premium = netPremium(legs);
  const kind = premium >= 0 ? "debit" : "credit";
  const openCash = premium * 100 + (kind === "debit" ? 1 : -1) * legs.length * COMMISSION;
  const extremes = expiryExtremes(legs, ctx.spot);
  const capitalAtRisk = kind === "debit" ? openCash : extremes.maxLoss;
  if (!(capitalAtRisk > 0)) return null;
  const ev = evaluate(legs, exit);

  const lean = ctx.bias === "bullish" ? [0.7, 0.3] : ctx.bias === "bearish" ? [0.3, 0.7] : [0.5, 0.5];
  const fitScore = (lean[0] * ev.band.up.avg + lean[1] * ev.band.down.avg) / capitalAtRisk;

  const plan: StrategyPlan = {
    ...ev, id, ...NAMES[id], kind, legs, netPremium: premium, openCash, capitalAtRisk,
    maxGainAtExpiry: extremes.maxGain, maxLossAtExpiry: extremes.maxLoss, fitScore, bestFit: false,
    summary: "", contract: [], why: [], wins: [], loses: [], warnings: [],
    exitPlan: `Open before the close on ${shortExpiry(ctx.entryDate)} — ${ctx.symbol} reports ${ctx.timingLabel ? `${ctx.timingLabel} ` : ""}on ${shortExpiry(ctx.earningsDate)}. Close it on ${shortExpiry(ctx.exitDate)}, the first session after the report, win or lose. Don't carry it into the ${shortExpiry(ctx.expiry)} expiry.`,
  };
  plan.summary = summaryText(id, plan);
  plan.contract = legs.map((l) => contractLine(ctx, l));
  plan.why = whyText(id, plan, ctx);
  plan.wins = winsText(plan, ctx);
  plan.loses = losesText(plan, ctx);
  plan.warnings = warningsFor(plan, ctx);
  return plan;
}

function lineup(ctx: PlayContext): StrategyId[] {
  const vol: StrategyId = ctx.regime === "rich" ? "iron_condor" : "long_strangle";
  if (ctx.bias === "bullish") return ["long_call", "bull_call_spread", "bull_put_spread", vol];
  if (ctx.bias === "bearish") return ["long_put", "bear_put_spread", "bear_call_spread", vol];
  return ["long_straddle", "long_strangle", "iron_condor", ctx.biasScore >= 0 ? "bull_call_spread" : "bear_put_spread"];
}

const BACKUPS: StrategyId[] = ["long_straddle", "long_strangle", "iron_condor", "bull_call_spread", "bear_put_spread", "long_call", "long_put"];

/** Four structures for the report, best fit first. */
export function buildStrategies(ctx: PlayContext, frontChain: OptionContract[], exit: ExitModel, tNow: number): StrategyPlan[] {
  // Prefer strikes people actually trade; fall back to anything quoted on thin chains.
  const quoted = liquid(frontChain);
  const traded = quoted.filter((c) => c.openInterest >= 50);
  const enough = (t: "call" | "put") => traded.filter((c) => c.type === t).length >= 6;
  const chain = enough("call") && enough("put") ? traded : quoted;
  const move = clamp(ctx.impliedMovePct / 100, 0.03, 0.25);
  const picker: Picker = { chain, spot: ctx.spot, move, wing: Math.max(ctx.spot * 0.025, strikeStep(chain, ctx.spot)) };

  const plans: StrategyPlan[] = [];
  for (const id of [...lineup(ctx), ...BACKUPS]) {
    if (plans.length >= 4) break;
    if (plans.some((p) => p.id === id)) continue;
    const plan = build(id, ctx, picker, exit, tNow);
    if (plan) plans.push(plan);
  }
  plans.sort((a, b) => b.fitScore - a.fitScore);
  if (plans[0]) plans[0].bestFit = true;
  return plans;
}
