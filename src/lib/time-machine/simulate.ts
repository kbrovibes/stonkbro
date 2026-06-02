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
  reconstructStockPositionsAtReverse,
  reconstructOptionPositionsAt,
  reconstructCashAt,
  reconstructCashAtReverse,
  reconcileSnapshot,
  categorizePostSnapshotCashFlows,
  computeRealizedGainsSinceSnapshot,
  computeExitAnalysisSinceSnapshot,
  getRsuVestsAfter,
} from "./reconstruct";
import type { ReconciliationResult } from "./reconstruct";
import type { PortfolioData } from "@/lib/snaptrade/client";

/** Bumped whenever the simulator's payload shape or math changes. */
export const PAYLOAD_VERSION = 2;

/** Default engine. Override per-call via args.engine, or globally via
 *  HINDSIGHT_ENGINE=forward to roll back to the legacy forward-walk. */
const DEFAULT_ENGINE: "forward" | "reverse" =
  (process.env.HINDSIGHT_ENGINE === "forward" ? "forward" : "reverse");

/** Aggregate today's non-option positions by symbol across accounts. */
function aggregatePortfolioUnits(portfolio: PortfolioData): Map<string, number> {
  const units = new Map<string, number>();
  for (const p of portfolio.positions) {
    if (p.is_option) continue;
    units.set(p.symbol, (units.get(p.symbol) ?? 0) + p.units);
  }
  return units;
}
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
    options: { ticker: string; underlying: string; type: "CALL" | "PUT"; strike: number; expiry: string; units: number; premiumCollected: number }[];
    cash: number;
    total: number;
  };
  simulation: {
    stockValues: { symbol: string; units: number; todayPrice: number; value: number }[];
    optionValues: { ticker: string; status: OptionStatus; value: number; note?: string; premiumCollected: number }[];
    cashStart: number;
    deposits: { date: string; amount: number }[];
    withdrawals: { date: string; amount: number }[];
    dividends: { date: string; symbol: string; amount: number }[];
    interest: { date: string; amount: number }[];
    totalDepositsAdded: number;
    totalWithdrawalsFunded: number;
    /** Final simulated cash balance — what's actually in the sim's cash bucket today. */
    cashFinal: number;
    /** Audit trail for how cashFinal was derived. */
    cashBreakdown: {
      atSnapshot: number;
      fromOptionReplay: number;
      fromDeposits: number;
      fromDividends: number;
      fromInterest: number;
      final: number;
    };
    total: number;
  };
  actual: {
    total: number;
    breakdown?: {
      stocks: number;
      options: number;
      cash: number;
      accountCount: number;
      stockPositionCount: number;
      optionPositionCount: number;
      perAccount?: Array<{
        id: string; name: string; institution: string; number: string;
        stocks: number; options: number; cash: number; total: number;
      }>;
    };
  };
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
    optionsBreakdown: import("./reconstruct").OptionRealizationItem[];
    stocksBreakdown: import("./reconstruct").StockRealizationItem[];
  };
  exitAnalysis: import("./reconstruct").ExitAnalysisItem[];
  rsuVests: {
    items: Array<{ date: string; symbol: string; units: number; vestPrice: number; valueAtVest: number; source: "description" | "amzn-rule" }>;
    totalUnitsBySymbol: Record<string, number>;
    totalValueAtVest: number;
    monthsWithVests: string[];   // "YYYY-MM"
  };
  assumptions: string[];
  /** Schema version of this payload. Older snapshots may be missing fields. */
  payloadVersion: number;
  /** Which reconstruction engine produced this payload. */
  engine: "forward" | "reverse";
  /** Sanity check: reverse-walk to snapshot, forward-apply to today,
   *  assert we land back at today's known portfolio. Only present when
   *  engine="reverse". */
  reconciliation?: ReconciliationResult;
}

export async function simulateTimeMachine(args: {
  snapshotDate: string;
  txns: SnapTradeTxn[];
  /** Today's broker portfolio — anchor for reverse-walk reconstruction
   *  and source of `actualTotal`. Required for engine="reverse". */
  currentPortfolio?: PortfolioData;
  /** Override the default reconstruction engine. Defaults to env-flag. */
  engine?: "forward" | "reverse";
  /** Legacy fallback when currentPortfolio is not supplied. */
  actualTotal?: number;
}): Promise<SimulationResult> {
  const { snapshotDate, txns, currentPortfolio } = args;
  const today = new Date().toISOString().split("T")[0];

  // Resolve engine + actualTotal from whichever inputs were provided.
  const requestedEngine = args.engine ?? DEFAULT_ENGINE;
  const engine: "forward" | "reverse" = currentPortfolio
    ? requestedEngine
    : "forward"; // can't reverse-walk without an anchor

  let actualTotal: number;
  if (currentPortfolio) {
    const stocksMV = currentPortfolio.summary.total_market_value;
    const optionsMV = currentPortfolio.options.reduce((s, o) => s + o.market_value, 0);
    actualTotal = stocksMV + optionsMV + currentPortfolio.summary.cash;
  } else if (typeof args.actualTotal === "number") {
    actualTotal = args.actualTotal;
  } else {
    throw new Error("simulateTimeMachine: must supply either currentPortfolio or actualTotal");
  }

  // ── Step 1: snapshot reconstruction ─────────────────────────────────
  const stockUnitsAtSnapshot = engine === "reverse" && currentPortfolio
    ? reconstructStockPositionsAtReverse(snapshotDate, txns, aggregatePortfolioUnits(currentPortfolio))
    : reconstructStockPositionsAt(snapshotDate, txns);
  const optionsAtSnapshot = reconstructOptionPositionsAt(snapshotDate, txns);
  const cashAtSnapshot = engine === "reverse" && currentPortfolio
    ? reconstructCashAtReverse(snapshotDate, txns, currentPortfolio.summary.cash)
    : reconstructCashAt(snapshotDate, txns);

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

  // Snapshot cashRef AFTER option replay but BEFORE deposit/div/interest fold
  // so we can audit how much came from each source.
  const cashAfterOptionReplay = cashRef.value;
  const cashFromOptionReplay = cashAfterOptionReplay - cashAtSnapshot;

  // Fold in non-trade cash flows (deposits + dividends-on-held + interest).
  // Withdrawals are tracked but NEVER subtracted from sim total.
  cashRef.value += cashFlows.totalDeposits;
  cashRef.value += cashFlows.totalDividends;
  cashRef.value += cashFlows.totalInterest;

  // Post-snapshot RSU vests: shares arrive in the account as income.
  // They would have happened regardless of trading activity, so they
  // accrue to the simulated portfolio. No cash effect (income event).
  const rsuVests = getRsuVestsAfter(snapshotDate, txns);
  for (const v of rsuVests) {
    simStockUnits.set(v.symbol, (simStockUnits.get(v.symbol) ?? 0) + v.units);
  }

  // ── Step 4: today's prices ──────────────────────────────────────────
  const heldStockSymbols = [...simStockUnits.keys()].filter(
    (sym) => Math.abs(simStockUnits.get(sym) ?? 0) > 1e-6
  );
  // Also fetch today's price for every symbol the user FULLY exited after
  // the snapshot — needed for the missed-winners / smart-exits cards.
  const exitedSymbols: string[] = [];
  for (const sym of stockUnitsAtSnapshot.keys()) {
    if (!simStockUnits.has(sym) || Math.abs(simStockUnits.get(sym) ?? 0) < 1e-6) {
      exitedSymbols.push(sym);
    }
  }
  const priceSymbols = [...new Set([...heldStockSymbols, ...exitedSymbols])];
  const todayPrices = await getCurrentStockPrices(priceSymbols);

  // Lookup contract premium by ticker — pulled forward from snapshot reconstruction.
  const premiumByTicker = new Map(optionsAtSnapshot.map((o) => [o.ticker, o.premiumCollected]));

  // Resolve live options to current mid; ITM expired already mutated state above.
  const liveOptionValues = await Promise.all(
    replayRecords
      .filter((r) => r.status === "live")
      .map(async (r): Promise<{ ticker: string; status: OptionStatus; value: number; note?: string; premiumCollected: number }> => {
        const premiumCollected = premiumByTicker.get(r.ticker) ?? 0;
        const mid = await getCurrentOptionMid({
          underlying: r.underlying,
          expiry: r.expiry,
          strike: r.strike,
          optionType: r.optionType,
        });
        if (mid == null) {
          return { ticker: r.ticker, status: "live", value: 0, note: "No live mid available; treated as $0", premiumCollected };
        }
        return {
          ticker: r.ticker,
          status: "live",
          value: mid * r.units * 100,
          note: `Mid $${mid.toFixed(2)} × ${r.units} × 100`,
          premiumCollected,
        };
      })
  );

  const resolvedOptionRows = replayRecords
    .filter((r) => r.status !== "live")
    .map((r): { ticker: string; status: OptionStatus; value: number; note?: string; premiumCollected: number } => ({
      ticker: r.ticker,
      status: r.status,
      value: 0,        // post-resolution, value is folded into stock/cash deltas
      note: r.note,
      premiumCollected: premiumByTicker.get(r.ticker) ?? 0,
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

  // Reconcile: forward-apply post-snapshot txns from the reverse-reconstructed
  // state and assert we land back at today's broker portfolio.
  const reconciliation: ReconciliationResult | undefined =
    engine === "reverse" && currentPortfolio
      ? reconcileSnapshot(
          snapshotDate,
          txns,
          stockUnitsAtSnapshot,
          cashAtSnapshot,
          aggregatePortfolioUnits(currentPortfolio),
          currentPortfolio.summary.cash,
        )
      : undefined;

  const assumptions: string[] = [
    "Option expiries between snapshot and today are replayed using Tradier daily closes for the underlying; missing dates fall back to the prior trading day.",
    "Stock splits between snapshot and today: Tradier prices are split-adjusted, but SnapTrade share counts at the time of snapshot may not be. Counts taken at face value.",
    "Withdrawals after the snapshot are tracked as 'would have needed to fund elsewhere' but NOT subtracted from the simulated total.",
    "Deposits, dividends on still-held shares, and interest after the snapshot are added to simulated cash.",
    "Live options today are valued at current Tradier option chain mid. Illiquid contracts may show $0.",
    "RSU vests are detected by description keyword OR (fallback) by BUY transactions on AMZN. Vested shares accrue without a cash debit and are added to the simulated portfolio.",
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
        premiumCollected: o.premiumCollected,
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
      cashFinal: simulatedCashTotal,
      cashBreakdown: {
        atSnapshot: cashAtSnapshot,
        fromOptionReplay: cashFromOptionReplay,
        fromDeposits: cashFlows.totalDeposits,
        fromDividends: cashFlows.totalDividends,
        fromInterest: cashFlows.totalInterest,
        final: simulatedCashTotal,
      },
      total: simulatedTotal,
    },
    actual: { total: actualTotal },
    delta: { absolute: delta, pct, favorableToHold: delta > 0 },
    realizedGains: computeRealizedGainsSinceSnapshot(snapshotDate, txns),
    exitAnalysis: computeExitAnalysisSinceSnapshot(
      snapshotDate,
      txns,
      stockUnitsAtSnapshot,
      todayPrices,
    ),
    rsuVests: (() => {
      const totalUnitsBySymbol: Record<string, number> = {};
      const monthSet = new Set<string>();
      let totalValueAtVest = 0;
      for (const v of rsuVests) {
        totalUnitsBySymbol[v.symbol] = (totalUnitsBySymbol[v.symbol] ?? 0) + v.units;
        monthSet.add(v.date.slice(0, 7));
        totalValueAtVest += v.valueAtVest;
      }
      return {
        items: rsuVests,
        totalUnitsBySymbol,
        totalValueAtVest,
        monthsWithVests: [...monthSet].sort(),
      };
    })(),
    assumptions,
    payloadVersion: PAYLOAD_VERSION,
    engine,
    reconciliation,
  };
}

// Re-export for convenience
export type { OptionReplayRecord };
