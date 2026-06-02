#!/usr/bin/env tsx
/**
 * Fixture-based validation for the reverse-walk reconstruction.
 *
 * Builds the NBIS/CRWV scenario from docs/hindsight-reverse-walk-example.html
 * as synthetic SnapTrade txns and asserts the reverse-walker produces the
 * expected snapshot state for each month-end date. Also verifies that
 * reconcileSnapshot agrees with the reverse walk (it should, by construction
 * — if it ever disagrees, that's a code-path divergence bug).
 *
 * Run: npx tsx scripts/validate-hindsight-reverse-walk.ts
 */

import {
  reconstructStockPositionsAtReverse,
  reconstructCashAtReverse,
  reconstructStockCostBasisAtReverse,
  reconcileSnapshot,
  type CostBasisAnchor,
} from "../src/lib/time-machine/reconstruct";
import type { SnapTradeTxn } from "../src/lib/time-machine/types";

// ─── Fixture: build the scenario ─────────────────────────────────────────
// Account opens Jan 1 2026 with 100 NBIS + 100 CRWV (transfer-in, NOT in feed).
// Feed begins Feb 1: BUY 10 NBIS + SELL 10 CRWV on the 1st of each month
// through May 1. Today = May 31 2026.

function makeBuy(date: string, symbol: string, units: number, price: number): SnapTradeTxn {
  return {
    trade_date: date + "T12:00:00Z",
    type: "BUY",
    units,
    price,
    amount: -units * price,
    symbol: { symbol: { symbol } },
  };
}
function makeSell(date: string, symbol: string, units: number, price: number): SnapTradeTxn {
  return {
    trade_date: date + "T12:00:00Z",
    type: "SELL",
    units,
    price,
    amount: units * price,
    symbol: { symbol: { symbol } },
  };
}

const txns: SnapTradeTxn[] = [
  makeBuy("2026-02-01", "NBIS", 10, 35),
  makeSell("2026-02-01", "CRWV", 10, 60),
  makeBuy("2026-03-01", "NBIS", 10, 45),
  makeSell("2026-03-01", "CRWV", 10, 70),
  makeBuy("2026-04-01", "NBIS", 10, 40),
  makeSell("2026-04-01", "CRWV", 10, 80),
  makeBuy("2026-05-01", "NBIS", 10, 50),
  makeSell("2026-05-01", "CRWV", 10, 100),
];

// Today's anchor: 140 NBIS + 60 CRWV.
const todayUnits = new Map<string, number>([
  ["NBIS", 140],
  ["CRWV", 60],
]);

// Cost basis anchor (today) — broker convention: SELLs reduce total cost
// basis proportionally (avg-cost × units sold), so the broker reports the
// COST BASIS OF REMAINING UNITS, not the original transfer-in cost.
//
// NBIS: 100×$30 + 10×$35 + 10×$45 + 10×$40 + 10×$50 = $4,700 across 140 sh
// CRWV: 100×$55 − (4 × 10 × $55) = $5,500 − $2,200 = $3,300 across 60 sh
//       (no BUYs after open, so avg cost stays $55 throughout)
const todayCostBasis = new Map<string, CostBasisAnchor>([
  ["NBIS", { units: 140, totalCost: 4700 }],
  ["CRWV", { units: 60, totalCost: 3300 }],
]);

// Cash anchor today (illustrative — match the chain so reconciliation passes).
// Initial cash: 0 (we transferred shares only). Then:
//   Feb 1 buys: -$350 (NBIS) +$600 (CRWV) = +$250
//   Mar 1     : -$450 + $700 = +$250
//   Apr 1     : -$400 + $800 = +$400
//   May 1     : -$500 + $1,000 = +$500
// Total today: $1,400
const todayCash = 1400;

// Expected snapshot states (from the docs example).
const expectations: Array<{
  date: string; label: string;
  expectedUnits: Map<string, number>;
  expectedCash: number;
  expectedCostBasis: Map<string, { units: number; totalCost: number; avgCost: number }>;
}> = [
  {
    date: "2026-02-28", label: "Feb 28",
    expectedUnits: new Map([["NBIS", 110], ["CRWV", 90]]),
    expectedCash: 250, // after Feb 1 only
    // Feb 28 cost basis: NBIS = 100×$30 + 10×$35 = $3,350 / 110 → $30.45 avg
    //                    CRWV = $5,500 − $550 (10 sh × $55) = $4,950 / 90 → $55 avg
    expectedCostBasis: new Map([
      ["NBIS", { units: 110, totalCost: 3350, avgCost: 3350 / 110 }],
      ["CRWV", { units: 90, totalCost: 4950, avgCost: 55 }],
    ]),
  },
  {
    date: "2026-03-31", label: "Mar 31",
    expectedUnits: new Map([["NBIS", 120], ["CRWV", 80]]),
    expectedCash: 500, // after Mar 1
    // NBIS: 3,350 + 10×$45 = 3,800 / 120 → $31.67. CRWV: $5,500 − 2×$550 = $4,400 / 80 → $55
    expectedCostBasis: new Map([
      ["NBIS", { units: 120, totalCost: 3800, avgCost: 3800 / 120 }],
      ["CRWV", { units: 80, totalCost: 4400, avgCost: 55 }],
    ]),
  },
  {
    date: "2026-04-30", label: "Apr 30",
    expectedUnits: new Map([["NBIS", 130], ["CRWV", 70]]),
    expectedCash: 900, // + 400 from Apr 1
    expectedCostBasis: new Map([
      ["NBIS", { units: 130, totalCost: 4200, avgCost: 4200 / 130 }],
      ["CRWV", { units: 70, totalCost: 3850, avgCost: 55 }],
    ]),
  },
];

// ─── Run + assert ────────────────────────────────────────────────────────

let failures = 0;
const ASSERT = (label: string, ok: boolean, detail?: string) => {
  const mark = ok ? "✓" : "✗";
  const color = ok ? "\x1b[32m" : "\x1b[31m";
  console.log(`  ${color}${mark}\x1b[0m ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures++;
};
const eqShares = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const eqDollars = (a: number, b: number) => Math.abs(a - b) < 0.01;

console.log("\n──────────── Reverse-walk fixture validation ────────────\n");

for (const exp of expectations) {
  console.log(`\x1b[1m${exp.label}\x1b[0m (snapshot date ${exp.date})`);

  // Units
  const units = reconstructStockPositionsAtReverse(exp.date, txns, todayUnits);
  for (const [sym, expectedQty] of exp.expectedUnits) {
    const got = units.get(sym) ?? 0;
    ASSERT(`${sym} units = ${expectedQty}`, eqShares(got, expectedQty), `got ${got}`);
  }
  ASSERT(`no extra symbols`, units.size === exp.expectedUnits.size, `got ${units.size}`);

  // Cash
  const cash = reconstructCashAtReverse(exp.date, txns, todayCash);
  ASSERT(`cash = $${exp.expectedCash}`, eqDollars(cash, exp.expectedCash), `got $${cash.toFixed(2)}`);

  // Cost basis
  const cb = reconstructStockCostBasisAtReverse(exp.date, txns, todayCostBasis);
  for (const [sym, expectedCB] of exp.expectedCostBasis) {
    const got = cb.get(sym);
    if (!got) {
      ASSERT(`${sym} cost basis present`, false, "missing");
      continue;
    }
    ASSERT(
      `${sym} totalCost = $${expectedCB.totalCost}`,
      eqDollars(got.totalCost, expectedCB.totalCost),
      `got $${got.totalCost.toFixed(2)}`,
    );
    ASSERT(
      `${sym} avgCost ≈ $${expectedCB.avgCost.toFixed(2)}`,
      eqDollars(got.avgCost, expectedCB.avgCost),
      `got $${got.avgCost.toFixed(2)}`,
    );
  }

  // Reconciliation
  const recon = reconcileSnapshot(exp.date, txns, units, cash, todayUnits, todayCash);
  ASSERT(
    `reconciles to today's anchor`,
    recon.passed,
    `Δshares ${recon.maxSharesDelta.toFixed(4)} · Δcash $${recon.cashDelta.toFixed(2)}`,
  );
  if (!recon.passed) {
    for (const m of recon.mismatches) {
      console.log(`      mismatch: ${m.symbol}  reconstructed=${m.reconstructed}  actual=${m.actual}  Δ=${m.delta}`);
    }
  }
  console.log("");
}

// ─── Adversarial scenario: BUY → SELL → BUY in reverse-iteration order ──
// The reviewer flagged this as a potential failure mode for the cost-basis
// reverse walker. Verify with SELF-CONSISTENT broker numbers (forward
// math must produce today's anchor — which is what reality always is).
//
// Forward chain on TSLA:
//   Original (Jan 1): 5 sh @ $10 = $50 total
//   Feb 1 BUY 10 @ $30 = $300:    15 sh, $350 total, $23.33 avg
//   Mar 1 SELL 5 (avg cost $23.33): 10 sh, $233.33 total, $23.33 avg
//   Apr 1 BUY 2 @ $50 = $100:     12 sh, $333.33 total, $27.78 avg
//   Today (May 1): 12 sh, $333.33 total, $27.78 avg
console.log("\x1b[1mAdversarial: BUY → SELL → BUY (round trips) on TSLA\x1b[0m");

const advTxns: SnapTradeTxn[] = [
  makeBuy("2026-02-01", "TSLA", 10, 30),
  makeSell("2026-03-01", "TSLA", 5, 100),
  makeBuy("2026-04-01", "TSLA", 2, 50),
];
const advToday = new Map<string, number>([["TSLA", 12]]);
const advCB = new Map<string, CostBasisAnchor>([
  ["TSLA", { units: 12, totalCost: 333.333333 }],
]);

const advFebUnits = reconstructStockPositionsAtReverse("2026-01-15", advTxns, advToday);
ASSERT(`Jan 15: TSLA = 5 sh`, eqShares(advFebUnits.get("TSLA") ?? 0, 5), `got ${advFebUnits.get("TSLA")}`);
const advFebCB = reconstructStockCostBasisAtReverse("2026-01-15", advTxns, advCB);
const gotCB = advFebCB.get("TSLA");
ASSERT(`Jan 15: TSLA totalCost ≈ $50`, !!gotCB && eqDollars(gotCB.totalCost, 50), `got $${gotCB?.totalCost.toFixed(2) ?? "missing"}`);
ASSERT(`Jan 15: TSLA avgCost ≈ $10`, !!gotCB && eqDollars(gotCB.avgCost, 10), `got $${gotCB?.avgCost.toFixed(2) ?? "missing"}`);

// Mid-stream snapshot: between BUY and SELL
const midUnits = reconstructStockPositionsAtReverse("2026-02-15", advTxns, advToday);
ASSERT(`Feb 15: TSLA = 15 sh`, eqShares(midUnits.get("TSLA") ?? 0, 15), `got ${midUnits.get("TSLA")}`);
const midCB = reconstructStockCostBasisAtReverse("2026-02-15", advTxns, advCB);
const gotMid = midCB.get("TSLA");
ASSERT(`Feb 15: TSLA totalCost ≈ $350`, !!gotMid && eqDollars(gotMid.totalCost, 350), `got $${gotMid?.totalCost.toFixed(2) ?? "missing"}`);
ASSERT(`Feb 15: TSLA avgCost ≈ $23.33`, !!gotMid && eqDollars(gotMid.avgCost, 23.333333), `got $${gotMid?.avgCost.toFixed(2) ?? "missing"}`);

// Between SELL and second BUY
const midUnits2 = reconstructStockPositionsAtReverse("2026-03-15", advTxns, advToday);
ASSERT(`Mar 15: TSLA = 10 sh`, eqShares(midUnits2.get("TSLA") ?? 0, 10), `got ${midUnits2.get("TSLA")}`);
const midCB2 = reconstructStockCostBasisAtReverse("2026-03-15", advTxns, advCB);
const gotMid2 = midCB2.get("TSLA");
ASSERT(`Mar 15: TSLA totalCost ≈ $233.33`, !!gotMid2 && eqDollars(gotMid2.totalCost, 233.333333), `got $${gotMid2?.totalCost.toFixed(2) ?? "missing"}`);
ASSERT(`Mar 15: TSLA avgCost ≈ $23.33`, !!gotMid2 && eqDollars(gotMid2.avgCost, 23.333333), `got $${gotMid2?.avgCost.toFixed(2) ?? "missing"}`);
console.log("");

console.log("─────────────────────────────────────────────────────────");
if (failures === 0) {
  console.log("\x1b[32m✓ all assertions passed\x1b[0m");
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${failures} assertion(s) failed\x1b[0m`);
  process.exit(1);
}
