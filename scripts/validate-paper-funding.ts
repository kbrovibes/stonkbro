#!/usr/bin/env tsx
/**
 * Proves the buying-power layer: a bot short of cash closes its weakest
 * holding to fund a better one, instead of logging a rejection.
 *
 * The August backfill never ran a profile out of buying power, so this is the
 * only evidence that the behaviour works. Four scenarios, three of them about
 * what must NOT be closed.
 *
 * Run: npx tsx scripts/validate-paper-funding.ts
 */
import type { OptionContract } from "../src/lib/market/types";
import { executeOrder, type BrokerState, type FillEnv } from "../src/lib/paper/broker";
import { makeRoom } from "../src/lib/paper/funding";
import { MARGIN_LIMIT, type Account, type Position, type PositionMeta } from "../src/lib/paper/types";

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
  console.log(`${ok ? "  ok  " : "FAIL  "}${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const prices: Record<string, number> = { WEAK: 88, STRONG: 108, COVER: 50, LEAP: 100 };

const env = (): FillEnv => ({
  date: "2026-08-14",
  session: "close",
  ts: "2026-08-14T20:00:00.000Z",
  allowMargin: false,
  view: {
    price: (s) => prices[s] ?? null,
    option: (symbol, type, strike, expiry): OptionContract | null => {
      const spot = prices[symbol];
      if (!spot) return null;
      const mid = Math.max(0.05, type === "call" ? spot - strike + 2 : strike - spot + 2);
      return {
        strike, expiry, dte: 20, type,
        bid: mid - 0.05, ask: mid + 0.05, mid, lastPrice: mid,
        volume: 100, openInterest: 100, impliedVolatility: 0.4, iv: 0.4,
        inTheMoney: type === "call" ? spot > strike : spot < strike, delta: 0.4,
      };
    },
    dte: () => 20,
  },
});

function account(cash: number): Account {
  return { profileId: "test", cash, marginLimit: MARGIN_LIMIT, realizedPnl: 0, fees: 0, interest: 0, startedOn: "2026-08-01", state: {} };
}

let seq = 0;
function stock(symbol: string, qty: number, avgPrice: number, meta: PositionMeta = {}): Position {
  const mark = prices[symbol];
  return {
    id: `p${++seq}`, profileId: "test", symbol, kind: "stock", side: "long", qty,
    strike: null, expiry: null, avgPrice, openedAt: "2026-08-01T13:35:00.000Z",
    closedAt: null, closePrice: null, realizedPnl: 0, status: "open",
    meta: { ...meta, mark, markValue: qty * mark },
  };
}

function shortCall(symbol: string, strike: number, meta: PositionMeta = {}): Position {
  return {
    id: `p${++seq}`, profileId: "test", symbol, kind: "call", side: "short", qty: 1,
    strike, expiry: "2026-09-04", avgPrice: 3, openedAt: "2026-08-01T13:35:00.000Z",
    closedAt: null, closePrice: null, realizedPnl: 0, status: "open",
    meta: { ...meta, mark: 4, markValue: -400, marginHeld: 0 },
  };
}

console.log("1. The weakest holding funds the better idea");
{
  const state: BrokerState = {
    account: account(100),
    positions: [stock("WEAK", 100, 100), stock("STRONG", 100, 100)],
  };
  const e = env();
  const rejected = executeOrder(state, { symbol: "LEAP", kind: "stock", action: "buy", qty: 50, reason: "high conviction entry" }, e);
  check("order is rejected before any room is made", rejected.status === "rejected", rejected.reason);

  const freed = makeRoom(state, e, new Set(), "LEAP — high conviction entry");
  check("makeRoom closed exactly one position", freed.length === 1);
  check("it closed WEAK, not STRONG", freed[0]?.symbol === "WEAK", `closed ${freed[0]?.symbol}`);
  check("the reason names the funding", /free buying power for LEAP/.test(freed[0]?.reason ?? ""), freed[0]?.reason);
  check("every freed trade carries a reason", freed.every((t) => t.reason.trim().length > 0));

  const filled = executeOrder(state, { symbol: "LEAP", kind: "stock", action: "buy", qty: 50, reason: "high conviction entry" }, e);
  check("the funded order then fills", filled.status === "filled", filled.reason);
  check("STRONG is untouched", state.positions.find((p) => p.symbol === "STRONG")?.status === "open");
}

console.log("\n2. Shares backing a covered call are never sold");
{
  const state: BrokerState = {
    account: account(0),
    positions: [stock("COVER", 100, 60), shortCall("COVER", 55), stock("STRONG", 100, 100)],
  };
  const freed = makeRoom(state, env(), new Set(), "anything");
  check("did not sell the covering shares", !freed.some((t) => t.symbol === "COVER" && t.kind === "stock"), freed.map((t) => t.symbol).join(","));
  check("closed the uncovered holding instead", freed.some((t) => t.symbol === "STRONG"));
  check("the short call is still open", state.positions.find((p) => p.kind === "call")?.status === "open");
}

console.log("\n3. A defined-risk group closes whole or not at all");
{
  const legs = [
    { ...stock("WEAK", 100, 100), meta: { mark: 88, markValue: 8800, group: "condor-1" } },
    { ...stock("STRONG", 100, 100), meta: { mark: 108, markValue: 10800, group: "condor-1" } },
  ] as Position[];
  const state: BrokerState = { account: account(0), positions: legs };
  const freed = makeRoom(state, env(), new Set(), "anything");
  check("both legs closed together", freed.length === 2, `${freed.length} leg(s)`);
  check("no leg left open", state.positions.every((p) => p.status === "closed"));
}

console.log("\n4. Nothing closable means nothing is closed");
{
  const state: BrokerState = { account: account(0), positions: [stock("COVER", 100, 60), shortCall("COVER", 55)] };
  const freed = makeRoom(state, env(), new Set(), "anything");
  check("no trades invented", freed.length === 0, `${freed.length} trade(s)`);
}

console.log("\n5. The broker refuses to strand a short call, whatever the strategy asks");
{
  const shares = stock("COVER", 100, 40);
  const call = shortCall("COVER", 55);
  const state: BrokerState = { account: account(50_000), positions: [shares, call] };
  const e = env();

  const sellCover = executeOrder(
    state,
    { symbol: "COVER", kind: "stock", action: "sell", qty: 100, positionId: shares.id, reason: "strategy wants out" },
    e,
  );
  check("selling the covering shares is rejected", sellCover.status === "rejected", sellCover.reason);
  check("the rejection says why", /uncovered/i.test(sellCover.reason), sellCover.reason);
  check("the shares are still there", state.positions.find((p) => p.kind === "stock")?.status === "open");

  const closeCall = executeOrder(
    state,
    { symbol: "COVER", kind: "call", action: "buy", qty: 1, strike: 55, expiry: "2026-09-04", positionId: call.id, reason: "closing the short leg first" },
    e,
  );
  check("closing the short call first is allowed", closeCall.status === "filled", closeCall.reason);

  const after = executeOrder(
    state,
    { symbol: "COVER", kind: "stock", action: "sell", qty: 100, positionId: shares.id, reason: "now unencumbered" },
    e,
  );
  check("and then the shares can be sold", after.status === "filled", after.reason);
}

console.log(failures === 0 ? "\nAll funding checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
