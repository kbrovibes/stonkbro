/**
 * Making room.
 *
 * A bot that wants a trade and cannot afford it used to log a rejection and
 * move on, which is not what a trader does. This layer gives every profile one
 * shared behaviour: when an order is refused for buying power, close the
 * weakest thing already on the book and try again.
 *
 * "Weakest" is the position with the worst unrealised return — between two
 * holdings, keep the one that is working. Two rules constrain the choice and
 * neither is negotiable:
 *
 *   1. Nothing is closed that would leave a short call uncovered. Shares
 *      backing a covered call and the long LEAPS under a PMCC are untouchable
 *      while the short call is open.
 *   2. Multi-leg structures close as a whole. Lifting one wing off a condor
 *      turns defined risk into open risk, which is the opposite of the point.
 */
import {
  closePartial,
  closingPrice,
  isOpen,
  multiplier,
  type BrokerState,
  type FillEnv,
} from "./broker";
import { OPTION_FEE, type Position, type Trade } from "./types";

/** A position, or a group of legs, that could be closed together. */
interface Candidate {
  legs: Position[];
  /** Worst unrealised return across the legs; lower closes first. */
  score: number;
  label: string;
}

function unrealizedPct(p: Position): number {
  const mark = p.meta.mark ?? p.avgPrice;
  if (p.avgPrice <= 0) return 0;
  const raw = (mark / p.avgPrice - 1) * 100;
  return p.side === "long" ? raw : -raw;
}

/** Symbols where selling stock or the long call would strand a short call. */
function coveringSymbols(positions: Position[]): Set<string> {
  const out = new Set<string>();
  for (const p of positions) {
    if (isOpen(p) && p.side === "short" && p.kind === "call") out.add(p.symbol);
  }
  return out;
}

function candidates(state: BrokerState, protectedIds: Set<string>): Candidate[] {
  const open = state.positions.filter(isOpen);
  const covering = coveringSymbols(open);
  const groups = new Map<string, Position[]>();
  const singles: Position[] = [];

  for (const p of open) {
    if (protectedIds.has(p.id)) continue;
    // Never strand a short call.
    if (covering.has(p.symbol) && p.side === "long" && (p.kind === "stock" || p.kind === "call")) continue;
    const group = typeof p.meta.group === "string" ? p.meta.group : null;
    if (group) {
      groups.set(group, [...(groups.get(group) ?? []), p]);
    } else {
      singles.push(p);
    }
  }

  const out: Candidate[] = singles.map((p) => ({
    legs: [p],
    score: unrealizedPct(p),
    label: `${p.symbol}${p.kind === "stock" ? "" : ` ${p.strike}${p.kind === "call" ? "C" : "P"}`}`,
  }));

  for (const [group, legs] of groups) {
    // A group is only closable whole; if any leg is protected, leave it alone.
    if (legs.some((l) => protectedIds.has(l.id))) continue;
    out.push({
      legs,
      score: Math.min(...legs.map(unrealizedPct)),
      label: `${legs[0].symbol} ${group}`,
    });
  }
  return out.sort((a, b) => a.score - b.score);
}

/** Buying power a candidate would release, net of what closing it costs. */
function netRelease(c: Candidate, env: FillEnv): number | null {
  let net = 0;
  for (const p of c.legs) {
    const price = closingPrice(p, env);
    if (price == null) return null;
    const gross = price * multiplier(p.kind) * p.qty;
    const fees = p.kind === "stock" ? 0 : OPTION_FEE * p.qty;
    net += p.side === "long" ? gross - fees : (p.meta.marginHeld ?? 0) - gross - fees;
  }
  return net;
}

/**
 * Close the single weakest closable position (or group) to free cash.
 * Returns the trades it made, or an empty array when nothing could be closed.
 */
export function makeRoom(state: BrokerState, env: FillEnv, protectedIds: Set<string>, why: string): Trade[] {
  for (const c of candidates(state, protectedIds)) {
    const release = netRelease(c, env);
    if (release == null || release <= 0) continue;
    const trades: Trade[] = [];
    for (const p of c.legs) {
      const price = closingPrice(p, env);
      if (price == null) continue;
      const fees = p.kind === "stock" ? 0 : OPTION_FEE * p.qty;
      const action = p.side === "long" ? "sell" : "buy";
      trades.push(
        closePartial(
          state,
          p,
          p.qty,
          price,
          fees,
          action,
          `Closed to free buying power for ${why} — weakest holding at ${unrealizedPct(p) >= 0 ? "+" : "−"}${Math.abs(unrealizedPct(p)).toFixed(1)}%`,
          env,
        ),
      );
    }
    if (trades.length > 0) return trades;
  }
  return [];
}

export const REJECTED_FOR_FUNDS = /buying power|margin requirement/i;
