import type { OptionContract } from "@/lib/market/types";
import { bsDelta, bsPrice, estimateDelta } from "./pricing";
import {
  OPTION_FEE,
  type Account,
  type MarketView,
  type Order,
  type Position,
  type PositionKind,
  type PositionMeta,
  type Session,
  type Side,
  type Trade,
  type TradeAction,
} from "./types";

export interface BrokerState {
  account: Account;
  positions: Position[];
}

export interface FillEnv {
  date: string;
  session: Session;
  ts: string;
  view: MarketView;
  allowMargin: boolean;
}

export const multiplier = (kind: PositionKind): number => (kind === "stock" ? 1 : 100);

const newId = (): string => crypto.randomUUID();

export function isOpen(p: Position): boolean {
  return p.status === "open" && p.qty > 0;
}

export function nakedPutMargin(spot: number, strike: number, premium: number, qty: number): number {
  const otm = Math.max(0, spot - strike);
  const perContract = Math.max(0.2 * spot - otm, 0.1 * strike) * 100 + premium * 100;
  return perContract * qty;
}

/* -- marks ------------------------------------------------------------- */

export function contractDelta(c: OptionContract, spot: number): number {
  if (typeof c.delta === "number" && Number.isFinite(c.delta)) return Math.abs(c.delta);
  return estimateDelta(c.type, spot, c.strike, c.dte);
}

function markOne(p: Position, view: MarketView): void {
  const spot = view.price(p.symbol);
  if (p.kind === "stock") {
    const mark = spot ?? p.meta.mark ?? p.avgPrice;
    p.meta.mark = mark;
    p.meta.markDelta = 1;
  } else {
    const c = p.strike != null && p.expiry ? view.option(p.symbol, p.kind, p.strike, p.expiry) : null;
    if (c && (c.bid > 0 || c.ask > 0)) {
      p.meta.mark = c.mid;
      p.meta.markDelta = spot ? contractDelta(c, spot) : (p.meta.markDelta ?? p.meta.entryDelta);
    } else if (spot && p.strike != null && p.expiry) {
      const t = view.dte(p.expiry) / 365;
      const iv = p.meta.iv ?? 0.4;
      p.meta.mark = bsPrice(p.kind, spot, p.strike, t, iv);
      p.meta.markDelta = bsDelta(p.kind, spot, p.strike, t, iv);
    } else {
      p.meta.mark = p.meta.mark ?? p.avgPrice;
    }
    if (p.side === "short" && p.kind === "put" && p.meta.marginMode === "naked" && spot && p.strike != null) {
      p.meta.marginHeld = nakedPutMargin(spot, p.strike, p.meta.mark ?? 0, p.qty);
    }
  }
  const sign = p.side === "long" ? 1 : -1;
  p.meta.markValue = sign * p.qty * (p.meta.mark ?? 0) * multiplier(p.kind);
}

export function markPositions(positions: Position[], view: MarketView): void {
  for (const p of positions) if (isOpen(p)) markOne(p, view);
}

export function positionValue(p: Position): number {
  return p.meta.markValue ?? (p.side === "long" ? 1 : -1) * p.qty * p.avgPrice * multiplier(p.kind);
}

export function positionsValue(positions: Position[]): number {
  return positions.filter(isOpen).reduce((s, p) => s + positionValue(p), 0);
}

export function optionMarginHeld(positions: Position[]): number {
  return positions
    .filter((p) => isOpen(p) && p.side === "short" && p.kind !== "stock")
    .reduce((s, p) => s + (p.meta.marginHeld ?? 0), 0);
}

export function equityOf(state: BrokerState): number {
  return state.account.cash + positionsValue(state.positions);
}

export function buyingPower(state: BrokerState, allowMargin: boolean): number {
  const line = allowMargin ? state.account.marginLimit : 0;
  return state.account.cash + line - optionMarginHeld(state.positions);
}

/** Cash borrowed, as a positive number. */
export function marginUsed(account: Account): number {
  return Math.max(0, -account.cash);
}

/* -- trades ------------------------------------------------------------ */

export function trade(
  env: FillEnv,
  profileId: string,
  fields: Partial<Trade> & Pick<Trade, "symbol" | "kind" | "action" | "qty" | "price" | "amount" | "reason">,
): Trade {
  return {
    id: newId(),
    profileId,
    ts: env.ts,
    tradeDate: env.date,
    session: env.session,
    strike: null,
    expiry: null,
    fees: 0,
    positionId: null,
    status: "filled",
    ...fields,
  };
}

function reject(env: FillEnv, profileId: string, o: Order, why: string): Trade {
  return trade(env, profileId, {
    symbol: o.symbol,
    kind: o.kind,
    action: "reject",
    qty: o.qty,
    price: 0,
    strike: o.strike ?? null,
    expiry: o.expiry ?? null,
    amount: 0,
    reason: `${why} — ${o.reason}`,
    status: "rejected",
  });
}

export function sameContract(p: Position, o: Order): boolean {
  return (
    p.symbol === o.symbol &&
    p.kind === o.kind &&
    (p.strike ?? null) === (o.strike ?? null) &&
    (p.expiry ?? null) === (o.expiry ?? null)
  );
}

export function findPosition(state: BrokerState, o: Order, side: Side): Position | undefined {
  if (o.positionId) return state.positions.find((p) => p.id === o.positionId && isOpen(p));
  return state.positions.find((p) => isOpen(p) && p.side === side && sameContract(p, o));
}

/** True when the order reduces an existing position rather than opening risk. */
export function isClosingOrder(state: BrokerState, o: Order): boolean {
  return !!findPosition(state, o, o.action === "buy" ? "short" : "long");
}

/** What one unit of this position would fill at right now, or null with no quote. */
export function closingPrice(p: Position, env: FillEnv): number | null {
  if (p.kind === "stock") {
    const px = env.view.price(p.symbol);
    return px && px > 0 ? px : null;
  }
  if (p.strike == null || !p.expiry) return null;
  const c = env.view.option(p.symbol, p.kind, p.strike, p.expiry);
  if (!c || (c.bid <= 0 && c.ask <= 0)) return null;
  const slip = 0.25 * Math.max(0, c.ask - c.bid);
  return p.side === "long" ? Math.max(0.01, c.mid - slip) : c.mid + slip;
}

function fillPrice(o: Order, env: FillEnv): { price: number; contract: OptionContract | null } | null {
  if (o.kind === "stock") {
    const price = env.view.price(o.symbol);
    return price && price > 0 ? { price, contract: null } : null;
  }
  if (o.strike == null || !o.expiry) return null;
  const c = env.view.option(o.symbol, o.kind, o.strike, o.expiry);
  if (!c || (c.bid <= 0 && c.ask <= 0)) return null;
  const spread = Math.max(0, c.ask - c.bid);
  const slip = 0.25 * spread;
  const price = o.action === "buy" ? c.mid + slip : Math.max(0.01, c.mid - slip);
  return { price, contract: c };
}

export function closePartial(
  state: BrokerState,
  p: Position,
  qty: number,
  price: number,
  fees: number,
  action: TradeAction,
  reason: string,
  env: FillEnv,
): Trade {
  const mult = multiplier(p.kind);
  const gross = price * mult * qty;
  const realized = (p.side === "long" ? price - p.avgPrice : p.avgPrice - price) * mult * qty - fees;
  const amount = p.side === "long" ? gross - fees : -(gross + fees);
  state.account.cash += amount;
  state.account.fees += fees;
  state.account.realizedPnl += realized;
  if (p.meta.marginHeld) p.meta.marginHeld = (p.meta.marginHeld * (p.qty - qty)) / p.qty;
  p.qty -= qty;
  p.realizedPnl += realized;
  if (p.qty <= 0) {
    p.qty = 0;
    p.status = "closed";
    p.closedAt = env.ts;
    p.closePrice = price;
    p.meta.markValue = 0;
    p.meta.marginHeld = 0;
  } else {
    p.meta.markValue = (p.side === "long" ? 1 : -1) * p.qty * (p.meta.mark ?? price) * mult;
  }
  return trade(env, p.profileId, {
    symbol: p.symbol,
    kind: p.kind,
    action,
    qty,
    price,
    strike: p.strike,
    expiry: p.expiry,
    amount,
    fees,
    reason,
    positionId: p.id,
  });
}

export function openPosition(
  state: BrokerState,
  o: Order,
  side: Side,
  price: number,
  contract: OptionContract | null,
  spot: number | null,
  env: FillEnv,
): Position {
  const existing = state.positions.find((p) => isOpen(p) && p.side === side && sameContract(p, o));
  if (existing) {
    existing.avgPrice = (existing.avgPrice * existing.qty + price * o.qty) / (existing.qty + o.qty);
    existing.qty += o.qty;
    existing.meta.marginHeld = (existing.meta.marginHeld ?? 0) + (o.meta?.marginHeld ?? 0);
    existing.meta.mark = price;
    existing.meta.markValue = (side === "long" ? 1 : -1) * existing.qty * price * multiplier(o.kind);
    return existing;
  }
  const meta: PositionMeta = {
    ...(o.meta ?? {}),
    entryDate: env.date,
    entrySpot: spot ?? undefined,
    mark: price,
    markValue: (side === "long" ? 1 : -1) * o.qty * price * multiplier(o.kind),
  };
  if (contract) {
    meta.iv = contract.iv ?? contract.impliedVolatility ?? meta.iv;
    meta.entryDelta = spot ? contractDelta(contract, spot) : undefined;
    meta.markDelta = meta.entryDelta;
  } else {
    meta.highClose = Math.max(meta.highClose ?? 0, price);
    meta.markDelta = 1;
  }
  const p: Position = {
    id: newId(),
    profileId: state.account.profileId,
    symbol: o.symbol,
    kind: o.kind,
    side,
    qty: o.qty,
    strike: o.strike ?? null,
    expiry: o.expiry ?? null,
    avgPrice: price,
    openedAt: env.ts,
    closedAt: null,
    closePrice: null,
    realizedPnl: 0,
    status: "open",
    meta,
  };
  state.positions.push(p);
  return p;
}

/** Long calls on `symbol` that outlive every open short call on it. */
function coveringCalls(state: BrokerState, symbol: string, shorts: Position[]): Position[] {
  return state.positions.filter(
    (p) => isOpen(p) && p.side === "long" && p.kind === "call" && p.symbol === symbol &&
      shorts.every((sc) => (p.expiry ?? "") >= (sc.expiry ?? "")),
  );
}

function openShortCalls(state: BrokerState, symbol: string): Position[] {
  return state.positions.filter(
    (p) => isOpen(p) && p.side === "short" && p.kind === "call" && p.symbol === symbol,
  );
}

function longShares(state: BrokerState, symbol: string): number {
  return state.positions
    .filter((p) => isOpen(p) && p.side === "long" && p.kind === "stock" && p.symbol === symbol)
    .reduce((s, p) => s + p.qty, 0);
}

/**
 * Would filling this order leave a short leg with nothing behind it?
 *
 * Strategies close the short leg before the cover, but that is an ordering
 * convention, and a convention is not a guarantee: if the short close is
 * rejected for any reason — most often for buying power — the order that
 * removes the cover would still fill and turn a defined position into an
 * open-ended one. Two shapes are refused here.
 *
 *   · Selling shares or the long call behind an open short call.
 *   · Selling one leg of a multi-leg group while a short leg of that same
 *     group is still open. That is what protects a condor's wings, where the
 *     stranded leg would be a short put rather than a short call.
 */
function wouldStrandShortLeg(state: BrokerState, o: Order, qty: number): boolean {
  if (o.action !== "sell") return false;
  const closing = findPosition(state, o, "long");
  if (!closing) return false;

  const group = typeof closing.meta.group === "string" ? closing.meta.group : null;
  if (group) {
    const shortLegsLeft = state.positions.some(
      (p) => isOpen(p) && p.side === "short" && p.meta.group === group,
    );
    if (shortLegsLeft) return true;
  }

  if (o.kind !== "stock" && o.kind !== "call") return false;
  const shorts = openShortCalls(state, o.symbol);
  if (shorts.length === 0) return false;

  const shares = longShares(state, o.symbol) - (o.kind === "stock" ? qty : 0);
  const calls = coveringCalls(state, o.symbol, shorts).reduce(
    (s, p) => s + p.qty - (o.kind === "call" && p.id === closing.id ? qty : 0),
    0,
  );
  return Math.floor(shares / 100) + calls < shorts.reduce((s, p) => s + p.qty, 0);
}

/**
 * Would writing this short call be uncovered?
 *
 * `marginMode: "covered"` declares a margin requirement of zero, so without
 * this the buying-power test has nothing to reject and a naked call opens for
 * free. A strategy that re-writes after a failed buy-to-close would then stack
 * a ratio spread one contract per session, and everything past the first
 * contract would be naked.
 *
 * Cover has to outlive the short it backs, so a long call only counts when it
 * expires no earlier than the longest-dated short on the book.
 */
function wouldWriteUncoveredCall(state: BrokerState, o: Order): boolean {
  if (o.action !== "sell" || o.kind !== "call") return false;
  if (findPosition(state, o, "long")) return false;

  const shorts = openShortCalls(state, o.symbol);
  const wanted = shorts.reduce((s, p) => s + p.qty, 0) + o.qty;
  const lastExpiry = [o.expiry ?? "", ...shorts.map((p) => p.expiry ?? "")].reduce((a, b) => (a > b ? a : b));
  const calls = state.positions
    .filter(
      (p) => isOpen(p) && p.side === "long" && p.kind === "call" && p.symbol === o.symbol &&
        (p.expiry ?? "") >= lastExpiry,
    )
    .reduce((s, p) => s + p.qty, 0);

  return Math.floor(longShares(state, o.symbol) / 100) + calls < wanted;
}

/** Fill one order against the state, or return a rejection trade. */
export function executeOrder(state: BrokerState, o: Order, env: FillEnv): Trade {
  const profileId = state.account.profileId;
  if (!Number.isInteger(o.qty) || o.qty < 1) return reject(env, profileId, o, "Quantity must be a whole number ≥ 1");
  const quote = fillPrice(o, env);
  if (!quote) return reject(env, profileId, o, "No quote");
  const { price, contract } = quote;
  const mult = multiplier(o.kind);
  const fees = o.kind === "stock" ? 0 : OPTION_FEE * o.qty;
  const closingSide: Side = o.action === "buy" ? "short" : "long";
  const closing = findPosition(state, o, closingSide);

  if (closing) {
    const qty = Math.min(o.qty, closing.qty);
    if (wouldStrandShortLeg(state, o, qty)) {
      return reject(env, profileId, o, "Would leave a short leg uncovered");
    }
    if (o.action === "buy") {
      const released = ((closing.meta.marginHeld ?? 0) * qty) / closing.qty;
      const cost = price * mult * qty + fees;
      if (cost > buyingPower(state, env.allowMargin) + released) {
        return reject(env, profileId, o, "Insufficient buying power to close");
      }
    }
    return closePartial(state, closing, qty, price, fees, o.action, o.reason, env);
  }

  const bp = buyingPower(state, env.allowMargin);
  const spot = env.view.price(o.symbol);
  if (o.action === "buy") {
    const cost = price * mult * o.qty + fees;
    if (cost > bp) return reject(env, profileId, o, `Insufficient buying power ($${Math.round(bp).toLocaleString()})`);
    state.account.cash -= cost;
    state.account.fees += fees;
    const p = openPosition(state, o, "long", price, contract, spot, env);
    return trade(env, profileId, {
      symbol: o.symbol, kind: o.kind, action: "buy", qty: o.qty, price,
      strike: o.strike ?? null, expiry: o.expiry ?? null, amount: -cost, fees,
      reason: o.reason, positionId: p.id,
    });
  }

  if (o.kind === "stock") return reject(env, profileId, o, "Short stock is not supported");
  if (wouldWriteUncoveredCall(state, o)) {
    return reject(env, profileId, o, "No shares or longer-dated long call to cover this short call");
  }
  const meta: PositionMeta = { ...(o.meta ?? {}) };
  if (meta.marginMode === "naked" && o.kind === "put" && spot && o.strike != null) {
    meta.marginHeld = nakedPutMargin(spot, o.strike, price, o.qty);
  }
  const required = meta.marginHeld ?? 0;
  if (required > bp) {
    return reject(env, profileId, o, `Margin requirement $${Math.round(required).toLocaleString()} exceeds buying power ($${Math.round(bp).toLocaleString()})`);
  }
  const proceeds = price * mult * o.qty - fees;
  state.account.cash += proceeds;
  state.account.fees += fees;
  const p = openPosition(state, { ...o, meta }, "short", price, contract, spot, env);
  return trade(env, profileId, {
    symbol: o.symbol, kind: o.kind, action: "sell", qty: o.qty, price,
    strike: o.strike ?? null, expiry: o.expiry ?? null, amount: proceeds, fees,
    reason: o.reason, positionId: p.id,
  });
}
