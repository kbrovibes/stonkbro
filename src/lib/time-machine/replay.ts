/**
 * Option-expiry replay cascade for the Time Machine.
 *
 * For options held at the snapshot date that expire on or before today, we
 * fetch the underlying's close on the expiry date and apply CALL/PUT × LONG/SHORT
 * × ITM/OTM consequences to the simulation's stock + cash maps.
 *
 * See specs/53-time-machine.md "Step 3 — Forward-simulate to today (Option C)".
 */

import { HeldOption } from "./types";
import { getHistoricalClose } from "./prices";

export type OptionReplayStatus = "live" | "exercised" | "assigned" | "expired-otm";

export interface OptionReplayRecord {
  ticker: string;
  underlying: string;
  optionType: "CALL" | "PUT";
  strike: number;
  expiry: string;
  units: number;            // signed
  status: OptionReplayStatus;
  underlyingCloseOnExpiry: number | null;
  stockDelta: number;        // signed shares applied to stock map
  cashDelta: number;         // signed cash applied to cash map
  note?: string;             // human-readable explanation
}

/**
 * Mutates `stockUnits` and `cashRef` by replaying each option expiry between
 * snapshot date and today. Returns one record per option (including live ones).
 */
export async function replayOptionExpiries(
  options: HeldOption[],
  todayISO: string,
  stockUnits: Map<string, number>,
  cashRef: { value: number }
): Promise<OptionReplayRecord[]> {
  const records: OptionReplayRecord[] = [];

  // Sort by expiry ascending so earlier expiries cascade before later ones
  const sorted = [...options].sort((a, b) => a.expiry.localeCompare(b.expiry));

  for (const opt of sorted) {
    // Live (still open today)
    if (opt.expiry > todayISO) {
      records.push({
        ticker: opt.ticker,
        underlying: opt.underlying,
        optionType: opt.optionType,
        strike: opt.strike,
        expiry: opt.expiry,
        units: opt.units,
        status: "live",
        underlyingCloseOnExpiry: null,
        stockDelta: 0,
        cashDelta: 0,
        note: "Still open today — valued at current option mid",
      });
      continue;
    }

    // Resolved — need underlying close on expiry
    const close = await getHistoricalClose(opt.underlying, opt.expiry);

    // If history miss, treat as OTM (safest fallback) and note it
    if (close == null) {
      records.push({
        ticker: opt.ticker,
        underlying: opt.underlying,
        optionType: opt.optionType,
        strike: opt.strike,
        expiry: opt.expiry,
        units: opt.units,
        status: "expired-otm",
        underlyingCloseOnExpiry: null,
        stockDelta: 0,
        cashDelta: 0,
        note: "No historical close for underlying on expiry; assumed OTM",
      });
      continue;
    }

    const isLong = opt.units > 0;
    const absUnits = Math.abs(opt.units);
    const isCall = opt.optionType === "CALL";
    const itm = isCall ? close >= opt.strike : close <= opt.strike;

    if (!itm) {
      // OTM expiration — no state change (premium flow already in snapshot cash)
      records.push({
        ticker: opt.ticker, underlying: opt.underlying, optionType: opt.optionType,
        strike: opt.strike, expiry: opt.expiry, units: opt.units,
        status: "expired-otm",
        underlyingCloseOnExpiry: close,
        stockDelta: 0, cashDelta: 0,
        note: `Underlying closed $${close.toFixed(2)} ${isCall ? "<" : ">"} $${opt.strike} strike — expired worthless`,
      });
      continue;
    }

    // ITM — apply assignment / exercise per matrix
    let stockDelta = 0;
    let cashDelta = 0;
    let status: OptionReplayStatus;
    let note: string;

    if (isCall && isLong) {
      // LONG CALL ITM → exercise: pay strike × 100 × units, receive 100 × units shares
      stockDelta = +100 * absUnits;
      cashDelta = -opt.strike * 100 * absUnits;
      status = "exercised";
      note = `Underlying closed $${close.toFixed(2)} ≥ $${opt.strike}; exercised long CALL: +${stockDelta} sh, $${cashDelta.toLocaleString()}`;
    } else if (isCall && !isLong) {
      // SHORT CALL ITM → assigned: deliver 100 × units shares, receive strike cash
      stockDelta = -100 * absUnits;
      cashDelta = +opt.strike * 100 * absUnits;
      status = "assigned";
      note = `Underlying closed $${close.toFixed(2)} ≥ $${opt.strike}; assigned short CALL: ${stockDelta} sh, +$${cashDelta.toLocaleString()}`;
    } else if (!isCall && isLong) {
      // LONG PUT ITM → exercise: deliver 100 × units shares, receive strike cash
      stockDelta = -100 * absUnits;
      cashDelta = +opt.strike * 100 * absUnits;
      status = "exercised";
      note = `Underlying closed $${close.toFixed(2)} ≤ $${opt.strike}; exercised long PUT: ${stockDelta} sh, +$${cashDelta.toLocaleString()}`;
    } else {
      // SHORT PUT ITM → assigned: receive 100 × units shares, pay strike cash
      stockDelta = +100 * absUnits;
      cashDelta = -opt.strike * 100 * absUnits;
      status = "assigned";
      note = `Underlying closed $${close.toFixed(2)} ≤ $${opt.strike}; assigned short PUT: +${stockDelta} sh, $${cashDelta.toLocaleString()}`;
    }

    // Mutate sim state
    stockUnits.set(opt.underlying, (stockUnits.get(opt.underlying) ?? 0) + stockDelta);
    cashRef.value += cashDelta;

    records.push({
      ticker: opt.ticker, underlying: opt.underlying, optionType: opt.optionType,
      strike: opt.strike, expiry: opt.expiry, units: opt.units,
      status,
      underlyingCloseOnExpiry: close,
      stockDelta, cashDelta, note,
    });
  }

  return records;
}
