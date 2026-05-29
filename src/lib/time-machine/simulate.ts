/**
 * Time Machine simulator — produces the API response shape consumed by
 * src/app/(app)/time-machine/page.tsx.
 *
 * Pipeline:
 *   1. Reconstruct snapshot (stocks + options + cash) at snapshotDate.
 *   2. Categorize post-snapshot cash flows (deposits / withdrawals / divs / interest).
 *   3. Replay option expiries → mutates stockUnits + cashRef.
 *   4. Fetch today's prices for held stocks + live option mids.
 *   5. Sum into simulated total; compare to actual current portfolio value.
 */

import {
  reconstructStockPositionsAt,
  reconstructOptionPositionsAt,
  reconstructCashAt,
  categorizePostSnapshotCashFlows,
  computeRealizedGainsSinceSnapshot,
} from "./reconstruct";
import { replayOptionExpiries, OptionReplayRecord } from "./replay";
import {
  getCurrentStockPrices,
  getCurrentOptionMid,
  getSnapshotStockPrices,
} from "./prices";
import { SnapTradeTxn } from "./types";

// ── Output shape ─ matches the UI's TimeMachineResult interface ──────────
type OptionStatus = "live" | "exercised" | "assigned" | "expired-otm";

export interface SimulationResult {
  snapshotDate: string;
  todayDate: string;
  snapshot: {
    positions: { symbol: string; units: number; costBasis: number; snapshotPrice: number }[];
    options: { ticker: string; underlying: string; type: "CALL" | "PUT"; strike: number; expiry: string; units: number }[];
    cash: number;
    total: number;
  };
  simulation: {
    stockValues: { symbol: string; units: number; todayPrice: number; value: number }[];
    optionValues: { ticker: string; status: OptionStatus; value: number; note?: string }[];
    cashStart: number;
    deposits: { date: string; amount: number }[];
    withdrawals: { date: string; amount: number }[];
    dividends: { date: string; symbol: string; amount: number }[];
    interest: { date: string; amount: number }[];
    totalDepositsAdded: number;
    totalWithdrawalsFunded: number;
    total: number;
  };
  actual: { total: number };
  delta: { absolute: number; pct: number; favorableToHold: boolean };
  realizedGains: {
    options: number;
    stocksShortTerm: number;
    stocksLongTerm: number;
    total: number;
    estimatedTax: number;
    taxBreakdown: {
      stcgRate: number;
      ltcgRate: number;
      stcgBase: number;
      ltcgBase: number;
      stcgTax: number;
      ltcgTax: number;
    };
    taxRateLabel: string;
  };
  assumptions: string[];
}

export async function simulateTimeMachine(args: {
  snapshotDate: string;
  txns: SnapTradeTxn[];
  actualTotal: number;
}): Promise<SimulationResult> {
  const { snapshotDate, txns, actualTotal } = args;
  const today = new Date().toISOString().split("T")[0];

  // ── Step 1: snapshot reconstruction ─────────────────────────────────
  const stockUnitsAtSnapshot = reconstructStockPositionsAt(snapshotDate, txns);
  const optionsAtSnapshot = reconstructOptionPositionsAt(snapshotDate, txns);
  const cashAtSnapshot = reconstructCashAt(snapshotDate, txns);

  // ── Step 2: post-snapshot cash flows ────────────────────────────────
  const heldSymbols = new Set(stockUnitsAtSnapshot.keys());
  const cashFlows = categorizePostSnapshotCashFlows(snapshotDate, txns, heldSymbols);

  // ── Step 3: option-expiry replay (mutates stock + cash) ─────────────
  // Start sim state from snapshot, fold in deposits/dividends/interest later.
  const simStockUnits = new Map(stockUnitsAtSnapshot);
  const cashRef = { value: cashAtSnapshot };
  const replayRecords = await replayOptionExpiries(
    optionsAtSnapshot,
    today,
    simStockUnits,
    cashRef
  );

  // Fold in non-trade cash flows (deposits + dividends-on-held + interest).
  // Withdrawals are tracked but NEVER subtracted from sim total.
  cashRef.value += cashFlows.totalDeposits;
  cashRef.value += cashFlows.totalDividends;
  cashRef.value += cashFlows.totalInterest;

  // ── Step 4: today's prices ──────────────────────────────────────────
  const heldStockSymbols = [...simStockUnits.keys()].filter(
    (sym) => Math.abs(simStockUnits.get(sym) ?? 0) > 1e-6
  );
  const todayPrices = await getCurrentStockPrices(heldStockSymbols);

  // Resolve live options to current mid; ITM expired already mutated state above.
  const liveOptionValues = await Promise.all(
    replayRecords
      .filter((r) => r.status === "live")
      .map(async (r): Promise<{ ticker: string; status: OptionStatus; value: number; note?: string }> => {
        const mid = await getCurrentOptionMid({
          underlying: r.underlying,
          expiry: r.expiry,
          strike: r.strike,
          optionType: r.optionType,
        });
        if (mid == null) {
          return { ticker: r.ticker, status: "live", value: 0, note: "No live mid available; treated as $0" };
        }
        return {
          ticker: r.ticker,
          status: "live",
          value: mid * r.units * 100, // long positive, short negative (debit to close)
          note: `Mid $${mid.toFixed(2)} × ${r.units} × 100`,
        };
      })
  );

  const resolvedOptionRows = replayRecords
    .filter((r) => r.status !== "live")
    .map((r): { ticker: string; status: OptionStatus; value: number; note?: string } => ({
      ticker: r.ticker,
      status: r.status,
      value: 0,        // post-resolution, value is folded into stock/cash deltas
      note: r.note,
    }));

  const optionValues = [...resolvedOptionRows, ...liveOptionValues];

  // ── Step 5: compute snapshot prices for display ─────────────────────
  // Use snapshotPriceLookups with manual-price fallback for mutual funds.
  const snapshotPriceMap = await getSnapshotStockPrices(
    [...stockUnitsAtSnapshot.keys()],
    snapshotDate
  );
  const snapshotPriceLookups = [...stockUnitsAtSnapshot.entries()].map(([sym, units]) => ({
    sym,
    units,
    snapshotPrice: snapshotPriceMap.get(sym) ?? 0,
  }));

  // ── Step 6: build response ──────────────────────────────────────────
  const snapshotPositions = snapshotPriceLookups.map((p) => ({
    symbol: p.sym,
    units: p.units,
    costBasis: p.snapshotPrice * Math.abs(p.units), // approximate (no per-tax-lot data)
    snapshotPrice: p.snapshotPrice,
  }));

  const stockValues = heldStockSymbols.map((sym) => {
    const units = simStockUnits.get(sym) ?? 0;
    const todayPrice = todayPrices.get(sym) ?? 0;
    return { symbol: sym, units, todayPrice, value: units * todayPrice };
  });

  const simulatedStockTotal = stockValues.reduce((s, v) => s + v.value, 0);
  const simulatedOptionTotal = optionValues.reduce((s, v) => s + v.value, 0);
  const simulatedCashTotal = cashRef.value;
  const simulatedTotal = simulatedStockTotal + simulatedOptionTotal + simulatedCashTotal;

  const snapshotTotal =
    snapshotPositions.reduce((s, p) => s + p.snapshotPrice * p.units, 0) + cashAtSnapshot;

  const delta = simulatedTotal - actualTotal;
  const pct = actualTotal > 0 ? (delta / actualTotal) * 100 : 0;

  const assumptions: string[] = [
    "Option expiries between snapshot and today are replayed using Tradier daily closes for the underlying; missing dates fall back to the prior trading day.",
    "Stock splits between snapshot and today: Tradier prices are split-adjusted, but SnapTrade share counts at the time of snapshot may not be. Counts taken at face value.",
    "Withdrawals after the snapshot are tracked as 'would have needed to fund elsewhere' but NOT subtracted from the simulated total.",
    "Deposits, dividends on still-held shares, and interest after the snapshot are added to simulated cash.",
    "Live options today are valued at current Tradier option chain mid. Illiquid contracts may show $0.",
  ];

  return {
    snapshotDate,
    todayDate: today,
    snapshot: {
      positions: snapshotPositions,
      options: optionsAtSnapshot.map((o) => ({
        ticker: o.ticker,
        underlying: o.underlying,
        type: o.optionType,
        strike: o.strike,
        expiry: o.expiry,
        units: o.units,
      })),
      cash: cashAtSnapshot,
      total: snapshotTotal,
    },
    simulation: {
      stockValues,
      optionValues,
      cashStart: cashAtSnapshot,
      deposits: cashFlows.deposits.map((d) => ({ date: d.date, amount: d.amount })),
      withdrawals: cashFlows.withdrawals.map((w) => ({ date: w.date, amount: w.amount })),
      dividends: cashFlows.dividends.map((d) => ({ date: d.date, symbol: d.symbol ?? "", amount: d.amount })),
      interest: cashFlows.interest.map((i) => ({ date: i.date, amount: i.amount })),
      totalDepositsAdded: cashFlows.totalDeposits,
      totalWithdrawalsFunded: cashFlows.totalWithdrawalsFunded,
      total: simulatedTotal,
    },
    actual: { total: actualTotal },
    delta: { absolute: delta, pct, favorableToHold: delta > 0 },
    realizedGains: computeRealizedGainsSinceSnapshot(snapshotDate, txns),
    assumptions,
  };
}

// Re-export for convenience
export type { OptionReplayRecord };
