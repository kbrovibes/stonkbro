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
  return t.trade_date ?? t.settlement_date ?? "";
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
          const wasShort = prevUnits < 0;

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

    // Equity legs.
    if (tx.type === "BUY") {
      const sym = extractSymbol(tx);
      stocks.set(sym, (stocks.get(sym) ?? 0) + Math.abs(tx.units));
    } else if (tx.type === "SELL") {
      const sym = extractSymbol(tx);
      stocks.set(sym, (stocks.get(sym) ?? 0) - Math.abs(tx.units));
    }
    // DIVIDEND / DEPOSIT / WITHDRAWAL / INTEREST / FEE don't move shares.
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
        ticker: os.ticker ?? key,
        underlying: os.underlying_symbol?.symbol ?? "UNKNOWN",
        optionType: optionType === "PUT" ? "PUT" : "CALL",
        strike: Number(os.strike_price ?? 0),
        expiry: os.expiration_date ?? "",
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
          const wasShort = prev < 0;
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
    switch (tx.type) {
      case "BUY":
        // SnapTrade reports BUY amount as negative; spec says cash -= amount.
        // Trust the signed field — equivalent and resilient to future flips.
        cash += tx.amount;
        break;
      case "SELL":
        cash += tx.amount;
        break;
      case "DEPOSIT":
      case "DIVIDEND":
      case "INTEREST":
        cash += tx.amount;
        break;
      case "WITHDRAWAL":
      case "FEE":
        cash += tx.amount; // already negative
        break;
      default:
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

    const mag = Math.abs(tx.amount);

    switch (tx.type) {
      case "DEPOSIT": {
        const entry: CashFlowEntry = { date, amount: mag, note: "DEPOSIT" };
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
        const sym = extractSymbol(tx);
        if (!heldSymbols.has(sym)) break; // skip — symbol wasn't held at snapshot
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
      case "FEE": {
        const entry: CashFlowEntry = { date, amount: mag, note: "FEE" };
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
