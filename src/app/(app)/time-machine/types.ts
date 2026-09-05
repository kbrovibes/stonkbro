/**
 * The `GET /api/portfolio/time-machine` response shape, per
 * `specs/53-time-machine.md`, plus the fields the simulator has added since
 * (realized gains, exit analysis, RSU vests, reconciliation).
 *
 * Extracted from the page so the classic and refresh presentations can share
 * one declaration. Types only — no runtime, no I/O, and nothing here changes
 * the algorithm.
 */

export interface SnapshotPosition {
  symbol: string;
  units: number;
  costBasis: number;
  snapshotPrice: number;
}
export interface SnapshotOption {
  ticker: string;
  underlying: string;
  type: "CALL" | "PUT";
  strike: number;
  expiry: string;
  units: number;
  premiumCollected: number;
}
export interface SimStockValue {
  symbol: string;
  units: number;
  todayPrice: number;
  value: number;
}
export type OptionStatus = "live" | "exercised" | "assigned" | "expired-otm";
export interface SimOptionValue {
  ticker: string;
  status: OptionStatus;
  value: number;
  note?: string;
  premiumCollected: number;
}

export interface OptionRealizationItem {
  date: string;
  ticker: string;
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiry: string;
  side: "BUY" | "SELL";
  units: number;
  amount: number;
}

export interface ExitAnalysisItem {
  symbol: string;
  unitsSold: number;
  avgExitPrice: number;
  exitProceeds: number;
  todayPrice: number;
  todayValueIfHeld: number;
  diffPerShare: number;
  totalDiff: number;
  changePct: number;
}

export interface StockRealizationItem {
  date: string;
  symbol: string;
  units: number;
  proceeds: number;
  avgCost: number;
  costBasis: number;
  gain: number;
  earliestBuyDate: string | null;
  holdDays: number | null;
  term: "ST" | "LT" | "skipped";
}
export interface CashFlowItem { date: string; amount: number }
export interface DividendItem { date: string; symbol: string; amount: number }

export interface TimeMachineResult {
  snapshotDate: string;
  todayDate: string;
  earliestAvailable?: string;
  snapshot: {
    positions: SnapshotPosition[];
    options: SnapshotOption[];
    cash: number;
    total: number;
  };
  simulation: {
    stockValues: SimStockValue[];
    optionValues: SimOptionValue[];
    cashStart: number;
    deposits: CashFlowItem[];
    withdrawals: CashFlowItem[];
    dividends: DividendItem[];
    interest: CashFlowItem[];
    totalDepositsAdded: number;
    totalWithdrawalsFunded: number;
    cashFinal?: number;
    cashBreakdown?: {
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
  realizedGains?: {
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
    optionsBreakdown?: OptionRealizationItem[];
    stocksBreakdown?: StockRealizationItem[];
  };
  exitAnalysis?: ExitAnalysisItem[];
  rsuVests?: {
    items: Array<{ date: string; symbol: string; units: number; vestPrice: number; valueAtVest: number; source: "description" | "amzn-rule" }>;
    totalUnitsBySymbol: Record<string, number>;
    totalValueAtVest: number;
    monthsWithVests: string[];
  };
  assumptions: string[];
  payloadVersion?: number;
  engine?: "forward" | "reverse";
  reconciliation?: {
    passed: boolean;
    maxSharesDelta: number;
    worstSymbol: string | null;
    cashDelta: number;
    mismatches: Array<{ symbol: string; reconstructed: number; actual: number; delta: number }>;
    tolerance: { shares: number; cash: number };
  };
  /** ISO timestamp injected by the cached route; absent on live ?date= simulation. */
  _computedAt?: string;
}

/** One row of `GET /api/portfolio/time-machine/cached` in list mode. */
export interface SnapshotMeta {
  snapshotDate: string;
  deltaAbsolute: number;
  favorableToHold: boolean;
  computedAt: string;
  payloadVersion: number | null;
}
