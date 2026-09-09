import type { DailyBar } from "@/lib/market/history";
import type { OptionContract } from "@/lib/market/types";
import { buyingPower, contractDelta, equityOf, isOpen, type BrokerState } from "./broker";
import { dteOn } from "./dates";
import { returnPct as retPct, rsi14 as rsi, sma as smaOf } from "./indicators";
import { findContract, type MarketData } from "./market";
import { bsDelta } from "./pricing";
import type { FindOptionQuery, FoundOption, Position, Profile, Session, StrategyContext } from "./types";

export interface ContextArgs {
  profile: Profile;
  state: BrokerState;
  data: MarketData;
  session: Session;
  date: string;
  isFirstSessionOfWeek: boolean;
  isFirstSessionOfMonth: boolean;
}

/** History closes with today's quote as the final bar. */
export function closesWithToday(bars: DailyBar[], date: string, price: number | undefined): number[] {
  const closes = bars.map((b) => b.close);
  if (price == null) return closes;
  if (bars.length > 0 && bars[bars.length - 1].date === date) closes[closes.length - 1] = price;
  else closes.push(price);
  return closes;
}

function scoreContract(c: OptionContract, delta: number, q: FindOptionQuery): number {
  const target = q.targetDte ?? (q.minDte + q.maxDte) / 2;
  return Math.abs(delta - q.targetDelta) * 10 + Math.abs(c.dte - target) / 100;
}

export function findOptionIn(data: MarketData, q: FindOptionQuery): FoundOption | null {
  const list = data.chains.get(q.symbol);
  const spot = data.quotes.get(q.symbol)?.price;
  if (!list || !spot) return null;
  let best: FoundOption | null = null;
  let bestScore = Infinity;
  for (const c of list) {
    if (c.type !== q.type || c.dte < q.minDte || c.dte > q.maxDte) continue;
    if (q.minStrike != null && c.strike < q.minStrike) continue;
    if (q.maxStrike != null && c.strike > q.maxStrike) continue;
    if (c.bid <= 0 && c.ask <= 0) continue;
    if (c.mid < 0.05) continue;
    const delta = contractDelta(c, spot);
    const score = scoreContract(c, delta, q);
    if (score < bestScore) {
      bestScore = score;
      best = { contract: c, delta };
    }
  }
  return best;
}

export function positionDelta(p: Position, data: MarketData): number | null {
  if (p.kind === "stock") return 1;
  if (p.strike == null || !p.expiry) return null;
  const spot = data.quotes.get(p.symbol)?.price;
  const c = findContract(data, p.symbol, p.kind, p.strike, p.expiry);
  if (c && spot) return contractDelta(c, spot);
  if (typeof p.meta.markDelta === "number") return p.meta.markDelta;
  if (!spot) return null;
  return bsDelta(p.kind, spot, p.strike, dteOn(p.expiry, data.date) / 365, p.meta.iv ?? 0.4);
}

export function buildContext(a: ContextArgs): StrategyContext {
  const { data, state, profile } = a;
  const closeCache = new Map<string, number[]>();
  const closes = (symbol: string): number[] => {
    let c = closeCache.get(symbol);
    if (!c) {
      c = closesWithToday(data.histories.get(symbol) ?? [], a.date, data.quotes.get(symbol)?.price);
      closeCache.set(symbol, c);
    }
    return c;
  };

  return {
    profile,
    account: state.account,
    positions: state.positions.filter(isOpen),
    state: state.account.state,
    equity: equityOf(state),
    cash: state.account.cash,
    buyingPower: buyingPower(state, profile.margin),
    session: a.session,
    date: a.date,
    isFirstSessionOfWeek: a.isFirstSessionOfWeek,
    isFirstSessionOfMonth: a.isFirstSessionOfMonth,
    quote: (symbol) => data.quotes.get(symbol),
    history: (symbol) => data.histories.get(symbol) ?? [],
    sma: (symbol, n) => smaOf(closes(symbol), n),
    rsi14: (symbol) => rsi(closes(symbol)),
    returnPct: (symbol, days) => retPct(closes(symbol), days),
    findOption: (q) => findOptionIn(data, q),
    optionQuote: (symbol, type, strike, expiry) => findContract(data, symbol, type, strike, expiry),
    deltaOf: (p) => positionDelta(p, data),
    chain: (symbol) => data.chains.get(symbol) ?? [],
    dte: (expiry) => dteOn(expiry, a.date),
  };
}
