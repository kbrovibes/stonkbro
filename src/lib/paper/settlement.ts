import { intrinsic } from "./pricing";
import { MARGIN_APR, type Position, type PositionMeta, type Trade } from "./types";
import { closePartial, isOpen, marginUsed, openPosition, trade, type BrokerState, type FillEnv } from "./broker";

function addShares(state: BrokerState, symbol: string, qty: number, price: number, meta: PositionMeta, env: FillEnv): Position {
  return openPosition(
    state,
    { symbol, kind: "stock", action: "buy", qty, reason: "assignment", meta },
    "long",
    price,
    null,
    price,
    env,
  );
}

function settleOne(state: BrokerState, p: Position, spot: number, env: FillEnv): Trade[] {
  const strike = p.strike as number;
  const intr = intrinsic(p.kind as "call" | "put", spot, strike);
  const label = `${p.symbol} ${strike}${p.kind === "call" ? "C" : "P"} ${p.expiry}`;
  const out: Trade[] = [];

  if (p.side === "long") {
    if (intr > 0) out.push(closePartial(state, p, p.qty, intr, 0, "settle", `Expired ITM: ${label} settled at intrinsic`, env));
    else out.push(closePartial(state, p, p.qty, 0, 0, "expire", `Expired worthless: ${label}`, env));
    return out;
  }

  if (intr <= 0) {
    out.push(closePartial(state, p, p.qty, 0, 0, "expire", `Expired worthless: ${label} (premium kept)`, env));
    return out;
  }

  if (p.kind === "put" && p.meta.marginMode !== "spread") {
    const shares = p.qty * 100;
    const putId = p.id;
    out.push(closePartial(state, p, p.qty, 0, 0, "assign", `Assigned: bought ${shares} ${p.symbol} @ ${strike}`, env));
    state.account.cash -= strike * shares;
    addShares(state, p.symbol, shares, strike, { assignedFrom: putId, assignedOn: env.date }, env);
    out[out.length - 1].amount = -strike * shares;
    out[out.length - 1].price = strike;
    return out;
  }

  const shares = p.qty * 100;
  const stock = p.kind === "call"
    ? state.positions.find((s) => isOpen(s) && s.symbol === p.symbol && s.kind === "stock" && s.qty >= shares)
    : undefined;
  if (stock) {
    out.push(closePartial(state, p, p.qty, 0, 0, "called_away", `Called away: sold ${shares} ${p.symbol} @ ${strike}`, env));
    const t = closePartial(state, stock, shares, strike, 0, "called_away", `Shares called away at ${strike} (${label})`, env);
    out.push(t);
    return out;
  }
  out.push(closePartial(state, p, p.qty, intr, 0, "settle", `Expired ITM: ${label} cash-settled at intrinsic`, env));
  return out;
}

/** Settle every open option expiring on or before `env.date`. */
export function settleExpiries(state: BrokerState, env: FillEnv): Trade[] {
  const trades: Trade[] = [];
  for (const p of [...state.positions]) {
    if (!isOpen(p) || p.kind === "stock" || !p.expiry || p.expiry > env.date) continue;
    const spot = env.view.price(p.symbol) ?? p.meta.entrySpot;
    if (!spot) continue;
    trades.push(...settleOne(state, p, spot, env));
  }
  return trades;
}

/** Daily margin interest on borrowed cash. Null when nothing is borrowed. */
export function chargeInterest(state: BrokerState, env: FillEnv): Trade | null {
  const borrowed = marginUsed(state.account);
  if (borrowed <= 0) return null;
  const interest = (borrowed * MARGIN_APR) / 365;
  state.account.cash -= interest;
  state.account.interest += interest;
  return trade(env, state.account.profileId, {
    symbol: "CASH",
    kind: "cash",
    action: "interest",
    qty: 0,
    price: 0,
    amount: -interest,
    reason: `Margin interest on $${Math.round(borrowed).toLocaleString()} at 8% APR`,
  });
}
