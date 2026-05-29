/**
 * Time Machine — pure reconstruction helpers
 *
 * Given the full SnapTrade activity log, rebuild stock units, option
 * positions, and cash on any date in the past; and bucket post-snapshot
 * cash flows for the highlight sections.
 *
 * All functions are PURE — no fetches, no I/O, no Date.now() calls.
 *
 * See `specs/53-time-machine.md` § Step 1 and § Step 2.
 */

import type {
  CashFlowEntry,
  HeldOption,
  PostSnapshotCashFlows,
  SnapTradeTxn,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** Best-effort date extraction; settlement_date fallback matches SnapTrade client. */
function txnDate(t: SnapTradeTxn): string {
  // SnapTrade returns ISO timestamps like "2026-05-28T04:00:00Z".
  // Slice to YYYY-MM-DD for lexicographic date comparisons.
  const raw = t.trade_date ?? t.settlement_date ?? "";
  return raw.slice(0, 10);
}

/**
 * Symbols that represent Fidelity's cash sweep / money-market funds. Trades
 * against these are cash-equivalent — the cash leg is already counted in
 * the BUY/SELL amount, so we must NOT also book a "stock position" for them.
 */
const MMF_SYMBOLS = new Set(["SPAXX", "FDRXX", "SPRXX", "FZFXX", "FCASH"]);

/**
 * Symbol prefixes / type codes that represent Fidelity bookkeeping artifacts
 * (fully-paid securities lending collateral, etc.) — never real positions.
 */
function isBookkeepingSymbol(sym: string): boolean {
  return sym.startsWith("L0C") || /^[0-9]{3}[A-Z0-9]{6}$/.test(sym); // CUSIP-like
}

function isMoneyMarketSymbol(sym: string): boolean {
  return MMF_SYMBOLS.has(sym.toUpperCase());
}

/** Activity types whose net effect on portfolio state is zero. */
const ZERO_EFFECT_TYPES = new Set(["LOAN", "JOURNALED", "REI", "ADJUSTMENT", "SPINOFF"]);

/**
 * Equity symbol extraction. Matches the pattern used by `getOptionChains` in
 * `src/lib/snaptrade/client.ts`: SnapTrade nests the symbol two levels deep
 * in some payloads and exposes a flat `ticker` in others.
 */
function extractSymbol(t: SnapTradeTxn): string {
  const s = t.symbol;
  if (!s) return "UNKNOWN";
  const inner = s.symbol;
  if (typeof inner === "string") return inner || s.ticker || "UNKNOWN";
  if (inner && typeof inner === "object" && typeof inner.symbol === "string") {
    return inner.symbol;
  }
  return s.ticker || "UNKNOWN";
}

function isOptionTxn(t: SnapTradeTxn): boolean {
  return t.option_symbol != null && !!t.option_symbol.ticker;
}

/** Build a contract key from option_symbol fields. */
function contractKey(t: SnapTradeTxn): string {
  const os = t.option_symbol!;
  return os.ticker ?? `${os.underlying_symbol?.symbol ?? "?"}|${os.option_type ?? "?"}|${os.strike_price ?? 0}|${os.expiration_date ?? "?"}`;
}

/**
 * Sort transactions chronologically with the same tie-break rule used by
 * `getOptionChains`: on a date tie, non-BUY events sort before BUY so a
 * same-day close→reopen chain isn't misclassified.
 */
function sortAscending(txns: SnapTradeTxn[]): SnapTradeTxn[] {
  return [...txns].sort((a, b) => {
    const d = txnDate(a).localeCompare(txnDate(b));
    if (d !== 0) return d;
    const rank = (t: string) => (t === "BUY" ? 1 : 0);
    return rank(a.type) - rank(b.type);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Reconstruction — stocks
// ─────────────────────────────────────────────────────────────────────────

/**
 * Walk the transaction log up to and including `snapshotDate` and return a
 * map of `symbol -> signed units`.
 *
 * Side effects of options on the stock book:
 *  - OPTIONASSIGNMENT on a SHORT CALL  → underlying units decrease by 100×|units|
 *    (shares are called away or we go short).
 *  - OPTIONASSIGNMENT on a SHORT PUT   → underlying units increase by 100×|units|.
 *  - OPTIONASSIGNMENT on a LONG CALL   → exercise: underlying units increase by 100×|units|.
 *  - OPTIONASSIGNMENT on a LONG PUT    → exercise: underlying units decrease by 100×|units|.
 *
 * The long/short direction is inferred from the running option position at
 * the moment of assignment — we maintain an in-flight option-units map
 * alongside the stock map.
 */
export function reconstructStockPositionsAt(
  snapshotDate: string,
  txns: SnapTradeTxn[]
): Map<string, number> {
  const sorted = sortAscending(txns);
  const stocks = new Map<string, number>();
  const optUnits = new Map<string, number>(); // signed running units per contract

  for (const tx of sorted) {
    if (txnDate(tx) > snapshotDate) break;
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;

    if (isOptionTxn(tx)) {
      const key = contractKey(tx);
      const prevUnits = optUnits.get(key) ?? 0;

      switch (tx.type) {
        case "BUY":
          optUnits.set(key, prevUnits + Math.abs(tx.units));
          break;
        case "SELL":
          optUnits.set(key, prevUnits - Math.abs(tx.units));
          break;
        case "OPTIONEXPIRATION":
          optUnits.set(key, 0);
          break;
        case "OPTIONASSIGNMENT": {
          const optionType = (tx.option_symbol?.option_type ?? "").toUpperCase();
          const underlying = tx.option_symbol?.underlying_symbol?.symbol ?? "UNKNOWN";
          const contracts = Math.abs(prevUnits || tx.units);
          const shareImpact = 100 * contracts;
          // If prior history was complete: prevUnits < 0 ⇒ short. If prevUnits == 0
          // (open contract pre-dated SnapTrade's window), default to SHORT — the
          // overwhelming majority of this user's options activity is CSP/CC.
          const wasShort = prevUnits < 0 || prevUnits === 0;

          if (optionType === "CALL") {
            // Short call assigned: shares called away (-). Long call exercised: shares acquired (+).
            const delta = wasShort ? -shareImpact : shareImpact;
            stocks.set(underlying, (stocks.get(underlying) ?? 0) + delta);
          } else if (optionType === "PUT") {
            // Short put assigned: shares put to us (+). Long put exercised: shares delivered (-).
            const delta = wasShort ? shareImpact : -shareImpact;
            stocks.set(underlying, (stocks.get(underlying) ?? 0) + delta);
          }
          optUnits.set(key, 0);
          break;
        }
        default:
          // Ignore unknown option activity types.
          break;
      }
      continue;
    }

    // Equity legs — skip money-market sweeps and bookkeeping artifacts.
    if (tx.type === "BUY") {
      const sym = extractSymbol(tx);
      if (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym)) continue;
      stocks.set(sym, (stocks.get(sym) ?? 0) + Math.abs(tx.units));
    } else if (tx.type === "SELL") {
      const sym = extractSymbol(tx);
      if (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym)) continue;
      stocks.set(sym, (stocks.get(sym) ?? 0) - Math.abs(tx.units));
    }
    // DIVIDEND / CONTRIBUTION / WITHDRAWAL / INTEREST / FEE / TAX don't move shares.
  }

  // Prune zero balances for a clean output.
  for (const [sym, units] of stocks) {
    if (units === 0) stocks.delete(sym);
  }
  return stocks;
}

// ─────────────────────────────────────────────────────────────────────────
// Reconstruction — options
// ─────────────────────────────────────────────────────────────────────────

/**
 * Reconstruct option positions held at the snapshot date. Returns one entry
 * per contract with non-zero `units`.
 *
 * `premiumCollected` accumulates the signed cash effect of BUY/SELL legs
 * (using SnapTrade's `amount`, which is already signed). Positive means net
 * credit to the account from that contract.
 */
export function reconstructOptionPositionsAt(
  snapshotDate: string,
  txns: SnapTradeTxn[]
): HeldOption[] {
  const sorted = sortAscending(txns);

  type Entry = HeldOption;
  const map = new Map<string, Entry>();

  for (const tx of sorted) {
    if (txnDate(tx) > snapshotDate) break;
    if (!isOptionTxn(tx)) continue;

    const os = tx.option_symbol!;
    const key = contractKey(tx);
    const optionType = (os.option_type ?? "").toUpperCase() as "CALL" | "PUT";

    let entry = map.get(key);
    if (!entry) {
      entry = {
        ticker: (os.ticker ?? key).trim(),
        underlying: os.underlying_symbol?.symbol ?? "UNKNOWN",
        optionType: optionType === "PUT" ? "PUT" : "CALL",
        strike: Number(os.strike_price ?? 0),
        expiry: (os.expiration_date ?? "").slice(0, 10),
        units: 0,
        premiumCollected: 0,
      };
      map.set(key, entry);
    }

    switch (tx.type) {
      case "BUY":
        entry.units += Math.abs(tx.units);
        entry.premiumCollected += tx.amount; // typically negative (debit)
        break;
      case "SELL":
        entry.units -= Math.abs(tx.units);
        entry.premiumCollected += tx.amount; // typically positive (credit)
        break;
      case "OPTIONEXPIRATION":
      case "OPTIONASSIGNMENT":
        entry.units = 0;
        // Cash effect of assignment lands on the stock/cash books, not the
        // contract's premium total — leave premiumCollected untouched.
        break;
      default:
        break;
    }
  }

  return Array.from(map.values()).filter((e) => e.units !== 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Reconstruction — cash
// ─────────────────────────────────────────────────────────────────────────

/**
 * Walk the transaction log up to and including `snapshotDate` and return
 * the cash balance.
 *
 * SnapTrade's `amount` field is already signed for every activity type, so
 * for DEPOSIT/WITHDRAWAL/DIVIDEND/INTEREST/FEE we just sum it. For BUY/SELL
 * on equities we trust the sign in `amount`. For options the same applies.
 *
 * OPTIONASSIGNMENT cash effect comes from `amount` when SnapTrade reports
 * it (e.g. cash credit for stock called away). When it's missing or zero,
 * the spec's explicit matrix is applied based on strike × 100 × units.
 */
export function reconstructCashAt(
  snapshotDate: string,
  txns: SnapTradeTxn[]
): number {
  const sorted = sortAscending(txns);
  const optUnits = new Map<string, number>();
  let cash = 0;

  for (const tx of sorted) {
    if (txnDate(tx) > snapshotDate) break;
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;

    // Track in-flight option direction so we can resolve OPTIONASSIGNMENT
    // cash when SnapTrade doesn't pre-populate `amount`.
    if (isOptionTxn(tx)) {
      const key = contractKey(tx);
      const prev = optUnits.get(key) ?? 0;
      if (tx.type === "BUY") optUnits.set(key, prev + Math.abs(tx.units));
      else if (tx.type === "SELL") optUnits.set(key, prev - Math.abs(tx.units));
      else if (tx.type === "OPTIONEXPIRATION") optUnits.set(key, 0);

      if (tx.type === "OPTIONASSIGNMENT") {
        if (tx.amount !== 0) {
          cash += tx.amount;
        } else {
          const optionType = (tx.option_symbol?.option_type ?? "").toUpperCase();
          const strike = Number(tx.option_symbol?.strike_price ?? 0);
          const contracts = Math.abs(prev || tx.units);
          // Same SHORT-default fallback as stock reconstruction.
          const wasShort = prev < 0 || prev === 0;
          const notional = strike * 100 * contracts;
          if (optionType === "CALL") {
            // Short call assigned → cash IN. Long call exercised → cash OUT.
            cash += wasShort ? notional : -notional;
          } else if (optionType === "PUT") {
            // Short put assigned → cash OUT. Long put exercised → cash IN.
            cash += wasShort ? -notional : notional;
          }
        }
        optUnits.set(key, 0);
        continue;
      }

      // BUY/SELL on options: trust SnapTrade's signed amount.
      if (tx.type === "BUY" || tx.type === "SELL") {
        cash += tx.amount;
      }
      continue;
    }

    // Non-option rows.
    const sym = extractSymbol(tx);
    const isMMF = isMoneyMarketSymbol(sym);
    const isBook = isBookkeepingSymbol(sym);

    switch (tx.type) {
      case "BUY":
      case "SELL":
        // Money-market and bookkeeping sweeps don't move real cash for
        // simulation purposes — the user's "cash" already includes MMF.
        if (isMMF || isBook) break;
        // SnapTrade reports signed `amount` (BUY is negative). Trust it.
        cash += tx.amount;
        break;
      case "DEPOSIT":
      case "CONTRIBUTION":      // Fidelity's actual deposit type
      case "DIVIDEND":
      case "INTEREST":
        cash += Math.abs(tx.amount);
        break;
      case "WITHDRAWAL":
      case "FEE":
      case "TAX":
        cash -= Math.abs(tx.amount);
        break;
      default:
        // Unknown type — ignore (logged elsewhere)
        break;
    }
  }

  return cash;
}

// ─────────────────────────────────────────────────────────────────────────
// Post-snapshot cash-flow categorization
// ─────────────────────────────────────────────────────────────────────────

/**
 * Bucket the transactions that occurred AFTER the snapshot date.
 *
 * Per spec § Step 2:
 *  - Deposits     → add to simulated cash (totalDeposits).
 *  - Withdrawals  → tracked but NOT subtracted (totalWithdrawalsFunded).
 *  - Dividends    → only counted if the symbol was still held at snapshot
 *                   (caller passes `heldSymbols`).
 *  - Interest     → counted.
 *  - Fees         → tracked, magnitude in totalFees; consumer may ignore.
 *  - BUY/SELL/OPTION* → not bucketed here. The whole point of the sim is to
 *                       imagine these never happened.
 *
 * All `amount` fields on the returned entries are stored as POSITIVE
 * magnitudes — direction is conveyed by the bucket.
 */
export function categorizePostSnapshotCashFlows(
  snapshotDate: string,
  txns: SnapTradeTxn[],
  heldSymbols: Set<string>
): PostSnapshotCashFlows {
  const result: PostSnapshotCashFlows = {
    deposits: [],
    withdrawals: [],
    dividends: [],
    interest: [],
    fees: [],
    totalDeposits: 0,
    totalWithdrawalsFunded: 0,
    totalDividends: 0,
    totalInterest: 0,
    totalFees: 0,
  };

  for (const tx of txns) {
    const date = txnDate(tx);
    if (date <= snapshotDate) continue;
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;

    const mag = Math.abs(tx.amount);
    const sym = extractSymbol(tx);

    // Money-market sweeps + bookkeeping aren't cash flows we care about.
    if ((tx.type === "BUY" || tx.type === "SELL") && (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym))) {
      continue;
    }

    switch (tx.type) {
      case "DEPOSIT":
      case "CONTRIBUTION": {     // Fidelity calls deposits CONTRIBUTION
        const entry: CashFlowEntry = { date, amount: mag, note: tx.type };
        result.deposits.push(entry);
        result.totalDeposits += mag;
        break;
      }
      case "WITHDRAWAL": {
        const entry: CashFlowEntry = { date, amount: mag, note: "WITHDRAWAL" };
        result.withdrawals.push(entry);
        result.totalWithdrawalsFunded += mag;
        break;
      }
      case "DIVIDEND": {
        // Skip money-market sweep dividends (SPAXX/etc) — they're just
        // interest on cash, not portfolio dividends.
        if (isMoneyMarketSymbol(sym)) break;
        if (!heldSymbols.has(sym)) break; // wasn't held at snapshot
        const entry: CashFlowEntry = { date, amount: mag, symbol: sym, note: "DIVIDEND" };
        result.dividends.push(entry);
        result.totalDividends += mag;
        break;
      }
      case "INTEREST": {
        const entry: CashFlowEntry = { date, amount: mag, note: "INTEREST" };
        result.interest.push(entry);
        result.totalInterest += mag;
        break;
      }
      case "FEE":
      case "TAX": {
        const entry: CashFlowEntry = { date, amount: mag, note: tx.type };
        result.fees.push(entry);
        result.totalFees += mag;
        break;
      }
      default:
        // BUY / SELL / OPTION* post-snapshot are intentionally ignored.
        break;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────
// Realized gains since snapshot — for tax-context disclosure
// ─────────────────────────────────────────────────────────────────────────

export interface RealizedGainsSummary {
  options: number;   // net cash from options trading after snapshot
  stocks: number;    // net cash from stock trading after snapshot (best-effort)
  total: number;
  estimatedTax: number;
  taxRateUsed: number;
  taxRateLabel: string;
}

/**
 * Estimates the realized gains from ACTUAL trading activity after the
 * snapshot date. Used to surface why the user may have withdrawn cash
 * (likely to cover taxes on gains that wouldn't have existed in the sim).
 *
 * v1: sums all post-snapshot option BUY/SELL `amount` values and all
 * stock SELL `amount` minus cost basis from in-window BUYs. Crude but
 * captures the order of magnitude.
 *
 * Tax rate assumes high-income (>$500K) options trader: 37% federal +
 * 3.8% NIIT + ~4% state midpoint = ~45% effective on short-term gains.
 */
export function computeRealizedGainsSinceSnapshot(
  snapshotDate: string,
  txns: SnapTradeTxn[]
): RealizedGainsSummary {
  const sorted = sortAscending(txns);
  let optionsRealized = 0;
  let stocksRealized = 0;

  // For stocks, track avg cost using in-window BUYs. Falls back to 0
  // realized when SELL has no prior BUY in window (incomplete history).
  const stockAvgCost = new Map<string, { units: number; totalCost: number }>();

  for (const tx of sorted) {
    const date = txnDate(tx);
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;

    if (isOptionTxn(tx)) {
      // Only post-snapshot option cash flows count as "realized after snapshot"
      if (date <= snapshotDate) continue;
      if (tx.type === "BUY" || tx.type === "SELL") {
        optionsRealized += tx.amount;  // signed
      }
      continue;
    }

    const sym = extractSymbol(tx);
    if (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym)) continue;

    // Pre-snapshot stock BUYs feed cost basis for post-snapshot SELLs.
    if (tx.type === "BUY") {
      const units = Math.abs(tx.units);
      const cost = Math.abs(tx.amount);
      const cur = stockAvgCost.get(sym) ?? { units: 0, totalCost: 0 };
      cur.units += units;
      cur.totalCost += cost;
      stockAvgCost.set(sym, cur);
      continue;
    }

    if (tx.type === "SELL" && date > snapshotDate) {
      const units = Math.abs(tx.units);
      const proceeds = Math.abs(tx.amount);
      const cur = stockAvgCost.get(sym);
      if (cur && cur.units > 0) {
        const avgCost = cur.totalCost / cur.units;
        const consumed = Math.min(units, cur.units);
        const gain = proceeds - avgCost * consumed;
        stocksRealized += gain;
        cur.units -= consumed;
        cur.totalCost -= avgCost * consumed;
        stockAvgCost.set(sym, cur);
      }
    }
  }

  const total = optionsRealized + stocksRealized;
  const taxRateUsed = 0.45;
  const taxRateLabel = "~45% blended (37% fed + 3.8% NIIT + ~4% state midpoint, short-term)";
  const estimatedTax = Math.max(0, total) * taxRateUsed;

  return { options: optionsRealized, stocks: stocksRealized, total, estimatedTax, taxRateUsed, taxRateLabel };
}
