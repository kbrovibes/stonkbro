/**
 * Time Machine — shared types
 *
 * Pure type declarations for portfolio reconstruction at a past date and
 * categorization of post-snapshot cash flows. No runtime, no I/O.
 *
 * See `specs/53-time-machine.md` for algorithm details.
 */

/**
 * Raw SnapTrade transaction shape, narrowed to the fields Time Machine needs.
 * Mirrors the structure returned by `accountApi.getAccountActivities`, which
 * we already consume in `src/lib/snaptrade/client.ts`.
 *
 * Note: `symbol` is doubly-nested in SnapTrade's response — see
 * `getOptionChains` for the canonical extraction pattern.
 */
export interface SnapTradeTxn {
  /** YYYY-MM-DD. Authoritative date for ordering. */
  trade_date: string;
  /** YYYY-MM-DD. Fallback when `trade_date` is missing. */
  settlement_date?: string;
  /**
   * Activity type. Known values include:
   *  BUY | SELL | OPTIONEXPIRATION | OPTIONASSIGNMENT |
   *  DIVIDEND | DEPOSIT | WITHDRAWAL | INTEREST | FEE | ...
   * Treated as an opaque string; unknown types are ignored.
   */
  type: string;
  /** Human-readable narrative. Used to detect RSU/VEST events from descriptions. */
  description?: string;
  /** Share / contract quantity (always positive in SnapTrade). */
  units: number;
  /** Per-unit price (for equities) or per-contract premium (for options). */
  price: number;
  /**
   * Signed cash effect of the transaction as reported by SnapTrade.
   * Positive = cash in (SELL, DEPOSIT, DIVIDEND, INTEREST, OPTIONASSIGNMENT credit).
   * Negative = cash out (BUY, WITHDRAWAL, FEE, OPTIONASSIGNMENT debit).
   */
  amount: number;
  /**
   * Equity symbol container. SnapTrade nests this two-deep in some payloads
   * and exposes a flat `ticker` in others. Use the pattern:
   *   `p.symbol?.symbol?.symbol ?? p.symbol?.ticker ?? "UNKNOWN"`
   */
  symbol?: { symbol?: { symbol?: string } | string; ticker?: string };
  /**
   * Option contract container. Present on option BUY/SELL, OPTIONEXPIRATION,
   * and OPTIONASSIGNMENT activity rows; absent on equity rows.
   */
  option_symbol?: {
    /** OCC-style ticker, e.g. "AAPL  240119C00190000". */
    ticker?: string;
    /** The underlying equity. */
    underlying_symbol?: { symbol?: string };
    /** "CALL" | "PUT" — uppercased by SnapTrade. */
    option_type?: string;
    strike_price?: number;
    /** YYYY-MM-DD. */
    expiration_date?: string;
  } | null;
}

/** A reconstructed stock holding at the snapshot date. Units may be negative (short). */
export interface HeldStock {
  symbol: string;
  units: number;
}

/** A reconstructed option holding at the snapshot date. */
export interface HeldOption {
  /** OCC-style ticker, used as the canonical contract id. */
  ticker: string;
  /** Underlying equity symbol. */
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  /** YYYY-MM-DD. */
  expiry: string;
  /** Signed: positive = long (we bought), negative = short (we sold). */
  units: number;
  /**
   * Cumulative cash received from this contract up to the snapshot date.
   * Positive = net credit to the account; negative = net debit.
   * Useful for downstream PnL display ("you'd kept the $X premium").
   */
  premiumCollected: number;
}

/** A single post-snapshot cash event (deposit, withdrawal, dividend, etc.). */
export interface CashFlowEntry {
  /** YYYY-MM-DD. */
  date: string;
  /** Always stored as a positive magnitude — the bucket conveys direction. */
  amount: number;
  /** Optional ticker, populated for dividends. */
  symbol?: string;
  /** Optional human-readable annotation (e.g. activity type). */
  note?: string;
}

/**
 * Bucketed cash-flow activity that occurred AFTER the snapshot date.
 * Per spec Step 2, withdrawals are tracked but NOT subtracted from the
 * simulated total — they're surfaced as "would need to fund elsewhere".
 */
export interface PostSnapshotCashFlows {
  deposits: CashFlowEntry[];
  withdrawals: CashFlowEntry[];
  dividends: CashFlowEntry[];
  interest: CashFlowEntry[];
  fees: CashFlowEntry[];
  totalDeposits: number;
  /** Tracked for display; not applied to the simulated portfolio total. */
  totalWithdrawalsFunded: number;
  totalDividends: number;
  totalInterest: number;
  totalFees: number;
}

/**
 * Full portfolio snapshot at `date` — the input to the forward simulation.
 */
export interface Snapshot {
  /** YYYY-MM-DD. */
  date: string;
  stocks: HeldStock[];
  options: HeldOption[];
  cash: number;
}

/** Single RSU vest event detected in the activity feed. */
export interface RsuVestEntry {
  date: string;        // YYYY-MM-DD
  symbol: string;
  units: number;
  vestPrice: number;
  valueAtVest: number;
  /** Why we classified this as an RSU vest. */
  source: "description" | "amzn-rule";
}
