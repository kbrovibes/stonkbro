/**
 * One profile, one session — no I/O except the chain fetches the strategy
 * asks for. The runner wraps this with persistence; the scratch harness
 * calls it directly with in-memory state.
 */
import {
  equityOf,
  executeOrder,
  isClosingOrder,
  isOpen,
  marginUsed,
  markPositions,
  optionMarginHeld,
  positionsValue,
  type BrokerState,
  type FillEnv,
} from "./broker";
import { makeRoom, REJECTED_FOR_FUNDS } from "./funding";
import { chargeInterest, settleExpiries } from "./settlement";
import { buildContext } from "./context";
import { loadChains, makeView, type HeldContract, type MarketData } from "./market";
import { strategyFor } from "./strategies";
import {
  START_CASH,
  type MarkedPosition,
  type Order,
  type Position,
  type Profile,
  type Session,
  type Snapshot,
  type Trade,
} from "./types";

export interface ProfileRunInput {
  profile: Profile;
  state: BrokerState;
  data: MarketData;
  session: Session;
  date: string;
  ts: string;
  isFirstSessionOfWeek: boolean;
  isFirstSessionOfMonth: boolean;
  /** False re-marks without settling, deciding, or charging interest. */
  trade: boolean;
}

export interface ProfileRunResult {
  orders: Order[];
  trades: Trade[];
  equity: number;
}

function heldContracts(positions: Position[]): HeldContract[] {
  const seen = new Set<string>();
  const out: HeldContract[] = [];
  for (const p of positions) {
    if (!isOpen(p) || p.kind === "stock" || !p.expiry || p.strike == null) continue;
    const key = `${p.symbol}:${p.kind}:${p.strike}:${p.expiry}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ symbol: p.symbol, expiry: p.expiry, kind: p.kind, strike: p.strike });
  }
  return out;
}

export async function runProfile(input: ProfileRunInput): Promise<ProfileRunResult> {
  const { profile, state, data } = input;
  const strategy = strategyFor(profile.id);
  if (!strategy) throw new Error(`No strategy registered for ${profile.id}`);

  const contextArgs = {
    profile, state, data,
    session: input.session, date: input.date,
    isFirstSessionOfWeek: input.isFirstSessionOfWeek,
    isFirstSessionOfMonth: input.isFirstSessionOfMonth,
  };

  markPositions(state.positions, makeView(data));
  const needs = input.trade ? strategy.needs(buildContext(contextArgs)) : [];
  await loadChains(data, needs, heldContracts(state.positions));

  const view = makeView(data);
  markPositions(state.positions, view);
  const env: FillEnv = { date: input.date, session: input.session, ts: input.ts, view, allowMargin: profile.margin };

  const trades: Trade[] = [];
  let orders: Order[] = [];
  if (input.trade) {
    if (input.session === "close") trades.push(...settleExpiries(state, env));
    orders = strategy.decide(buildContext(contextArgs));

    // Closes before opens: a batch that sells to fund a buy must sell first.
    const closing = new Map(orders.map((o) => [o, isClosingOrder(state, o)]));
    const ordered = [...orders].sort((a, b) => Number(closing.get(b)) - Number(closing.get(a)));
    const protectedIds = new Set(
      ordered.map((o) => o.positionId).filter((id): id is string => typeof id === "string"),
    );

    for (const o of ordered) {
      let filled = executeOrder(state, o, env);
      for (let attempt = 0; attempt < 3; attempt++) {
        if (filled.status !== "rejected" || !REJECTED_FOR_FUNDS.test(filled.reason)) break;
        const freed = makeRoom(state, env, protectedIds, `${o.symbol} — ${o.reason}`);
        if (freed.length === 0) break;
        trades.push(...freed);
        markPositions(state.positions, view);
        filled = executeOrder(state, o, env);
      }
      trades.push(filled);
    }
    markPositions(state.positions, view);
    if (input.session === "close") {
      const interest = chargeInterest(state, env);
      if (interest) trades.push(interest);
    }
  }
  return { orders, trades, equity: equityOf(state) };
}

export function markedPositions(positions: Position[]): MarkedPosition[] {
  return positions.filter(isOpen).map((p) => {
    const mult = p.kind === "stock" ? 1 : 100;
    const mark = p.meta.mark ?? p.avgPrice;
    const cost = p.avgPrice * p.qty * mult;
    const pnl = (p.side === "long" ? mark - p.avgPrice : p.avgPrice - mark) * p.qty * mult;
    return {
      id: p.id,
      symbol: p.symbol,
      kind: p.kind,
      side: p.side,
      qty: p.qty,
      strike: p.strike,
      expiry: p.expiry,
      avgPrice: p.avgPrice,
      mark,
      value: p.meta.markValue ?? 0,
      pnl,
      pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
      delta: p.meta.markDelta ?? null,
      openedAt: p.openedAt,
    };
  });
}

export function buildSnapshot(
  state: BrokerState,
  session: Session,
  date: string,
  previousCloseEquity: number | null,
): Snapshot {
  const equity = equityOf(state);
  const base = previousCloseEquity ?? START_CASH;
  return {
    profileId: state.account.profileId,
    snapDate: date,
    session,
    equity,
    cash: state.account.cash,
    marginUsed: marginUsed(state.account) + optionMarginHeld(state.positions),
    positionsValue: positionsValue(state.positions),
    dayPnl: equity - base,
    totalPnl: equity - START_CASH,
    totalReturnPct: ((equity - START_CASH) / START_CASH) * 100,
    positions: markedPositions(state.positions),
  };
}
