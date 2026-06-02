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
 * Symbols whose BUY transactions should be treated as RSU vests (income,
 * not cash purchases). Per user direction: AMZN BUYs are RSU vests.
 */
const RSU_BUY_AS_VEST_SYMBOLS = new Set(["AMZN"]);

/** Description keywords that signal an RSU vest event from any broker. */
const RSU_DESCRIPTION_KEYWORDS = /\b(RSU|VEST(?:ED|ING)?|RESTRICTED\s+STOCK|STOCK\s+PLAN|EQUITY\s+AWARD)\b/i;

/**
 * Returns true when a transaction should be treated as an RSU vest —
 * i.e. shares arrive without a cash debit (income, not purchase).
 *
 * Detection priority:
 *   1. Description text matches RSU/VEST keywords (broker-agnostic).
 *   2. BUY on a symbol in RSU_BUY_AS_VEST_SYMBOLS (fallback).
 */
function isRsuVest(tx: SnapTradeTxn): boolean {
  if (tx.type !== "BUY") return false;
  if (isOptionTxn(tx)) return false;
  const desc = tx.description ?? "";
  if (RSU_DESCRIPTION_KEYWORDS.test(desc)) return true;
  const sym = extractSymbol(tx).toUpperCase();
  if (RSU_BUY_AS_VEST_SYMBOLS.has(sym)) return true;
  return false;
}

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
        // RSU vests deliver shares without a cash debit (income, not purchase).
        if (tx.type === "BUY" && isRsuVest(tx)) break;
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

// ═════════════════════════════════════════════════════════════════════════
// REVERSE-WALK reconstruction — anchored to today's broker-reported state.
// ═════════════════════════════════════════════════════════════════════════
//
// The forward walkers above accumulate position state from time 0 forward,
// which silently undercounts when the SnapTrade activity feed doesn't reach
// back to the original BUYs (Fidelity ≈ 24mo). The reverse walkers anchor
// to today's known holdings (PortfolioData) and rewind every post-snapshot
// txn — mathematically exact for any date within the activity window,
// regardless of how old the underlying positions are.
//
// See docs/hindsight-reverse-walk-example.html for the worked example.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Reverse-walk version of {@link reconstructStockPositionsAt}.
 * @param currentUnits Today's units per symbol (from `portfolio.positions`
 *                     aggregated across accounts). Caller supplies this.
 */
export function reconstructStockPositionsAtReverse(
  snapshotDate: string,
  txns: SnapTradeTxn[],
  currentUnits: Map<string, number>
): Map<string, number> {
  const result = new Map(currentUnits);
  const ensure = (sym: string) => { if (!result.has(sym)) result.set(sym, 0); };

  // Walk all txns chronologically so we know each contract's long/short
  // state at the time of any assignment (needed to undo the stock delta).
  const sorted = sortAscending(txns);
  const optUnits = new Map<string, number>();

  for (const tx of sorted) {
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;
    const date = txnDate(tx);

    if (isOptionTxn(tx)) {
      const key = contractKey(tx);
      const prev = optUnits.get(key) ?? 0;
      if (tx.type === "BUY") optUnits.set(key, prev + Math.abs(tx.units));
      else if (tx.type === "SELL") optUnits.set(key, prev - Math.abs(tx.units));
      else if (tx.type === "OPTIONEXPIRATION") optUnits.set(key, 0);

      if (tx.type === "OPTIONASSIGNMENT" && date > snapshotDate) {
        const os = tx.option_symbol!;
        const optionType = (os.option_type ?? "").toUpperCase();
        const underlying = os.underlying_symbol?.symbol ?? "";
        if (underlying) {
          const contracts = Math.abs(prev || tx.units);
          // SHORT-default when prev is ambiguous (matches forward walker).
          const wasShort = prev < 0 || prev === 0;
          let stockDelta = 0;
          if (optionType === "CALL") {
            stockDelta = wasShort ? -100 * contracts : +100 * contracts;
          } else if (optionType === "PUT") {
            stockDelta = wasShort ? +100 * contracts : -100 * contracts;
          }
          // Undo: subtract the delta that landed in today's units.
          ensure(underlying);
          result.set(underlying, (result.get(underlying) ?? 0) - stockDelta);
        }
        optUnits.set(key, 0);
      }
      continue;
    }

    if (date <= snapshotDate) continue;

    const sym = extractSymbol(tx);
    if (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym)) continue;

    if (tx.type === "BUY") {
      ensure(sym);
      result.set(sym, (result.get(sym) ?? 0) - Math.abs(tx.units));
    } else if (tx.type === "SELL") {
      ensure(sym);
      result.set(sym, (result.get(sym) ?? 0) + Math.abs(tx.units));
    }
  }

  for (const [sym, u] of result) {
    if (Math.abs(u) < 1e-6) result.delete(sym);
  }
  return result;
}

/**
 * Reverse-walk version of {@link reconstructCashAt}.
 * @param currentCash Today's cash balance (`portfolio.summary.cash`).
 */
export function reconstructCashAtReverse(
  snapshotDate: string,
  txns: SnapTradeTxn[],
  currentCash: number
): number {
  const sorted = sortAscending(txns);
  const optUnits = new Map<string, number>();
  let postSnapshotDelta = 0;

  for (const tx of sorted) {
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;
    const date = txnDate(tx);

    if (isOptionTxn(tx)) {
      const key = contractKey(tx);
      const prev = optUnits.get(key) ?? 0;
      if (tx.type === "BUY") optUnits.set(key, prev + Math.abs(tx.units));
      else if (tx.type === "SELL") optUnits.set(key, prev - Math.abs(tx.units));
      else if (tx.type === "OPTIONEXPIRATION") optUnits.set(key, 0);

      if (date > snapshotDate) {
        if (tx.type === "OPTIONASSIGNMENT") {
          if (tx.amount !== 0) {
            postSnapshotDelta += tx.amount;
          } else {
            const optionType = (tx.option_symbol?.option_type ?? "").toUpperCase();
            const strike = Number(tx.option_symbol?.strike_price ?? 0);
            const contracts = Math.abs(prev || tx.units);
            const wasShort = prev < 0 || prev === 0;
            const notional = strike * 100 * contracts;
            if (optionType === "CALL") postSnapshotDelta += wasShort ? notional : -notional;
            else if (optionType === "PUT") postSnapshotDelta += wasShort ? -notional : notional;
          }
        } else if (tx.type === "BUY" || tx.type === "SELL") {
          postSnapshotDelta += tx.amount;
        }
      }
      if (tx.type === "OPTIONASSIGNMENT") optUnits.set(key, 0);
      continue;
    }

    if (date <= snapshotDate) continue;

    const sym = extractSymbol(tx);
    const isMMF = isMoneyMarketSymbol(sym);
    const isBook = isBookkeepingSymbol(sym);

    switch (tx.type) {
      case "BUY":
      case "SELL":
        if (isMMF || isBook) break;
        if (tx.type === "BUY" && isRsuVest(tx)) break;
        postSnapshotDelta += tx.amount;
        break;
      case "DEPOSIT":
      case "CONTRIBUTION":
      case "DIVIDEND":
      case "INTEREST":
        postSnapshotDelta += Math.abs(tx.amount);
        break;
      case "WITHDRAWAL":
      case "FEE":
      case "TAX":
        postSnapshotDelta -= Math.abs(tx.amount);
        break;
      default:
        break;
    }
  }

  return currentCash - postSnapshotDelta;
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
// RSU vests
// ─────────────────────────────────────────────────────────────────────────

import { RsuVestEntry } from "./types";

/**
 * Returns RSU vest events that occurred strictly AFTER `snapshotDate`.
 * These are surfaced for display ("equity income that arrived in the
 * sim period") AND fed back into the simulation so the vested shares
 * accrue to the simulated portfolio.
 */
export function getRsuVestsAfter(
  snapshotDate: string,
  txns: SnapTradeTxn[]
): RsuVestEntry[] {
  const out: RsuVestEntry[] = [];
  for (const tx of txns) {
    const date = txnDate(tx);
    if (date <= snapshotDate) continue;
    if (!isRsuVest(tx)) continue;
    const sym = extractSymbol(tx);
    const units = Math.abs(tx.units);
    const vestPrice = Number(tx.price) || (units > 0 ? Math.abs(tx.amount) / units : 0);
    const valueAtVest = vestPrice * units;
    const matchedDesc = RSU_DESCRIPTION_KEYWORDS.test(tx.description ?? "");
    out.push({
      date,
      symbol: sym,
      units,
      vestPrice,
      valueAtVest,
      source: matchedDesc ? "description" : "amzn-rule",
    });
  }
  return out;
}

/**
 * Returns ALL RSU vest events from the activity feed (any date).
 * Used by display layers that want the full history (e.g. month markers).
 */
export function getAllRsuVests(txns: SnapTradeTxn[]): RsuVestEntry[] {
  const out: RsuVestEntry[] = [];
  for (const tx of txns) {
    if (!isRsuVest(tx)) continue;
    const date = txnDate(tx);
    const sym = extractSymbol(tx);
    const units = Math.abs(tx.units);
    const vestPrice = Number(tx.price) || (units > 0 ? Math.abs(tx.amount) / units : 0);
    const matchedDesc = RSU_DESCRIPTION_KEYWORDS.test(tx.description ?? "");
    out.push({
      date,
      symbol: sym,
      units,
      vestPrice,
      valueAtVest: vestPrice * units,
      source: matchedDesc ? "description" : "amzn-rule",
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ─────────────────────────────────────────────────────────────────────────
// Realized gains since snapshot — for tax-context disclosure
// ─────────────────────────────────────────────────────────────────────────

/** One option BUY or SELL leg that contributed to options STCG. */
export interface OptionRealizationItem {
  date: string;             // YYYY-MM-DD
  ticker: string;
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiry: string;
  side: "BUY" | "SELL";
  units: number;            // positive
  amount: number;           // signed: SELL credit (+), BUY debit (−)
}

/**
 * Per-symbol aggregate of stock exits after the snapshot date.
 * `totalDiff > 0` = today's price exceeds avg exit (missed gain).
 * `totalDiff < 0` = today's price is below avg exit (avoided loss).
 */
export interface ExitAnalysisItem {
  symbol: string;
  unitsSold: number;          // capped at units held at snapshot (rollers don't double-count)
  avgExitPrice: number;       // proceeds-weighted average over post-snapshot SELLs
  exitProceeds: number;       // avgExitPrice * unitsSold
  todayPrice: number;
  todayValueIfHeld: number;   // unitsSold * todayPrice
  diffPerShare: number;       // todayPrice − avgExitPrice
  totalDiff: number;          // diffPerShare * unitsSold
  changePct: number;          // % change from avg exit to today
}

/** One stock SELL that contributed to stocks STCG/LTCG. */
export interface StockRealizationItem {
  date: string;
  symbol: string;
  units: number;            // shares sold
  proceeds: number;         // gross cash received
  avgCost: number;          // running average cost per share at time of sale
  costBasis: number;        // avgCost * units consumed
  gain: number;             // proceeds − costBasis
  earliestBuyDate: string | null;
  holdDays: number | null;
  term: "ST" | "LT" | "skipped";
}

export interface RealizedGainsSummary {
  options: number;          // all STCG (almost all of this user's options are <45 DTE)
  stocksShortTerm: number;  // held < 365d
  stocksLongTerm: number;   // held >= 365d
  total: number;
  estimatedTax: number;
  taxBreakdown: {
    stcgRate: number;
    ltcgRate: number;
    stcgBase: number;       // total gains taxed at STCG rate
    ltcgBase: number;       // total gains taxed at LTCG rate
    stcgTax: number;
    ltcgTax: number;
  };
  taxRateLabel: string;
  optionsBreakdown: OptionRealizationItem[];
  stocksBreakdown: StockRealizationItem[];
}

/**
 * Estimates realized gains from ACTUAL trading activity after the snapshot
 * date, split by short- vs long-term holding period.
 *
 * Rates (WA resident, income > $500K):
 *   STCG = 37% federal + 3.8% NIIT = 40.8%  (WA does not tax STCG)
 *   LTCG = 20% federal + 3.8% NIIT + 7% WA = 30.8%  (WA taxes LTCG > ~$270K)
 *
 * Options realized are treated as 100% STCG since this user's strategies
 * (CSPs, covered calls, short-dated rolls) virtually never qualify for LTCG.
 *
 * For stocks: each SELL is categorized via the earliest in-window BUY date
 * of that symbol. If `sellDate - earliestBuyDate >= 365`, it's LTCG;
 * otherwise STCG. When no in-window BUY exists (incomplete history),
 * default to STCG — conservative (overstates tax slightly).
 */
/**
 * For each symbol the user HELD at the snapshot, sum the SELL units +
 * proceeds that occurred after the snapshot, and compare the proceeds-
 * weighted avg exit price to today's price. Caller supplies today's prices
 * via the `todayPrices` map (already fetched in the simulator).
 *
 * Symbols with no in-window SELLs, or with no today price, are omitted.
 */
export function computeExitAnalysisSinceSnapshot(
  snapshotDate: string,
  txns: SnapTradeTxn[],
  unitsAtSnapshot: Map<string, number>,
  todayPrices: Map<string, number>
): ExitAnalysisItem[] {
  const sellsBySymbol = new Map<string, { units: number; proceeds: number }>();
  for (const tx of txns) {
    const date = txnDate(tx);
    if (date <= snapshotDate) continue;
    if (tx.type !== "SELL") continue;
    if (isOptionTxn(tx)) continue;
    const sym = extractSymbol(tx);
    if (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym)) continue;
    const units = Math.abs(tx.units);
    const proceeds = Math.abs(tx.amount);
    if (units <= 0 || proceeds <= 0) continue;
    const cur = sellsBySymbol.get(sym) ?? { units: 0, proceeds: 0 };
    cur.units += units;
    cur.proceeds += proceeds;
    sellsBySymbol.set(sym, cur);
  }

  const items: ExitAnalysisItem[] = [];
  for (const [sym, sells] of sellsBySymbol) {
    const heldUnits = unitsAtSnapshot.get(sym) ?? 0;
    if (heldUnits <= 0) continue;
    // Cap units sold at what was held at snapshot — don't double-count
    // round-trip rolls that bought + sold the same name after the snapshot.
    const unitsSold = Math.min(sells.units, heldUnits);
    const todayPrice = todayPrices.get(sym) ?? 0;
    if (todayPrice <= 0) continue;
    const avgExitPrice = sells.units > 0 ? sells.proceeds / sells.units : 0;
    if (avgExitPrice <= 0) continue;
    const diffPerShare = todayPrice - avgExitPrice;
    const totalDiff = diffPerShare * unitsSold;
    const changePct = (diffPerShare / avgExitPrice) * 100;
    items.push({
      symbol: sym,
      unitsSold,
      avgExitPrice,
      exitProceeds: avgExitPrice * unitsSold,
      todayPrice,
      todayValueIfHeld: unitsSold * todayPrice,
      diffPerShare,
      totalDiff,
      changePct,
    });
  }

  // Sort by absolute impact (biggest signal first); callers split by sign.
  return items.sort((a, b) => Math.abs(b.totalDiff) - Math.abs(a.totalDiff));
}

export function computeRealizedGainsSinceSnapshot(
  snapshotDate: string,
  txns: SnapTradeTxn[]
): RealizedGainsSummary {
  const sorted = sortAscending(txns);
  let optionsRealized = 0;
  let stocksShortTerm = 0;
  let stocksLongTerm = 0;
  const optionsBreakdown: OptionRealizationItem[] = [];
  const stocksBreakdown: StockRealizationItem[] = [];

  // Per-symbol running avg cost + earliest BUY date (used for hold-period bucket).
  const stockLots = new Map<string, { units: number; totalCost: number; earliestBuy: string }>();

  for (const tx of sorted) {
    const date = txnDate(tx);
    if (ZERO_EFFECT_TYPES.has(tx.type)) continue;

    if (isOptionTxn(tx)) {
      if (date <= snapshotDate) continue;
      if (tx.type === "BUY" || tx.type === "SELL") {
        optionsRealized += tx.amount;  // signed
        const os = tx.option_symbol!;
        optionsBreakdown.push({
          date,
          ticker: (os.ticker ?? "").trim(),
          underlying: os.underlying_symbol?.symbol ?? "UNKNOWN",
          optionType: ((os.option_type ?? "").toUpperCase() === "PUT" ? "PUT" : "CALL"),
          strike: Number(os.strike_price ?? 0),
          expiry: (os.expiration_date ?? "").slice(0, 10),
          side: tx.type === "BUY" ? "BUY" : "SELL",
          units: Math.abs(tx.units),
          amount: tx.amount,
        });
      }
      continue;
    }

    const sym = extractSymbol(tx);
    if (isMoneyMarketSymbol(sym) || isBookkeepingSymbol(sym)) continue;

    if (tx.type === "BUY") {
      const units = Math.abs(tx.units);
      const cost = Math.abs(tx.amount);
      const cur = stockLots.get(sym);
      if (cur) {
        cur.units += units;
        cur.totalCost += cost;
      } else {
        stockLots.set(sym, { units, totalCost: cost, earliestBuy: date });
      }
      continue;
    }

    if (tx.type === "SELL" && date > snapshotDate) {
      const units = Math.abs(tx.units);
      const proceeds = Math.abs(tx.amount);
      const cur = stockLots.get(sym);
      if (cur && cur.units > 0) {
        const avgCost = cur.totalCost / cur.units;
        const consumed = Math.min(units, cur.units);
        const costBasis = avgCost * consumed;
        const gain = proceeds - costBasis;
        const holdDays = (Date.parse(date) - Date.parse(cur.earliestBuy)) / 86400_000;
        const term: "ST" | "LT" = holdDays >= 365 ? "LT" : "ST";
        if (term === "LT") stocksLongTerm += gain;
        else stocksShortTerm += gain;
        stocksBreakdown.push({
          date, symbol: sym, units: consumed,
          proceeds, avgCost, costBasis, gain,
          earliestBuyDate: cur.earliestBuy,
          holdDays: Math.round(holdDays),
          term,
        });
        cur.units -= consumed;
        cur.totalCost -= costBasis;
      } else {
        // No in-window BUY — surface as "skipped" so the user can see why a
        // SELL they expected isn't in the tally.
        stocksBreakdown.push({
          date, symbol: sym, units, proceeds,
          avgCost: 0, costBasis: 0, gain: 0,
          earliestBuyDate: null, holdDays: null, term: "skipped",
        });
      }
    }
  }

  const stcgRate = 0.408;  // 37% fed + 3.8% NIIT (WA has no state STCG)
  const ltcgRate = 0.308;  // 20% fed + 3.8% NIIT + 7% WA LTCG
  const stcgBase = Math.max(0, optionsRealized + stocksShortTerm);
  const ltcgBase = Math.max(0, stocksLongTerm);
  const stcgTax = stcgBase * stcgRate;
  const ltcgTax = ltcgBase * ltcgRate;
  const estimatedTax = stcgTax + ltcgTax;
  const total = optionsRealized + stocksShortTerm + stocksLongTerm;
  const taxRateLabel = "WA resident, income > $500K: STCG 40.8% (37% fed + 3.8% NIIT), LTCG 30.8% (20% fed + 3.8% NIIT + 7% WA)";

  return {
    options: optionsRealized,
    stocksShortTerm,
    stocksLongTerm,
    total,
    estimatedTax,
    taxBreakdown: { stcgRate, ltcgRate, stcgBase, ltcgBase, stcgTax, ltcgTax },
    taxRateLabel,
    optionsBreakdown,
    stocksBreakdown,
  };
}
