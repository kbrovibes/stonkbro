/**
 * Equity (stock) realized-gain engine: FIFO lot matching over the raw
 * SnapTrade activity feed. Pure functions — no I/O.
 *
 * What the connector gives us and what it doesn't:
 * - BUY / SELL / REI (dividend reinvest) carry date, units, price, amount →
 *   full basis + holding period when the shares were bought at the broker.
 * - TRANSFER / JOURNALED share movements arrive at price 0 with NO cost
 *   basis or original acquisition date (RSU vests, broker-to-broker
 *   transfers). Sales matched to those lots are reported as "basis unknown"
 *   and excluded from the tax math until the user supplies a basis override.
 * - LOAN rows are fully-paid securities lending in/out — not taxable, and
 *   they net to zero, so they're ignored entirely.
 */

import type { TaxTerm } from "./estimates";
import { LONG_TERM_HOLDING_DAYS } from "./config";

/** Money-market sweep funds churn daily at $1.00 — never capital gains. */
export const SWEEP_SYMBOLS = new Set(["SPAXX", "FDRXX", "SPRXX", "FCASH", "QACDS", "CORE"]);

/** Activity types that move shares without a real purchase price. */
const UNKNOWN_BASIS_INFLOWS = new Set(["TRANSFER", "JOURNALED", "SPINOFF"]);
const IGNORED_TYPES = new Set(["LOAN", "DIVIDEND", "INTEREST", "WITHDRAWAL", "CONTRIBUTION", "TAX", "ADJUSTMENT", "FEE"]);

export interface EquitySaleEvent {
  /** Stable key for basis overrides: institution|symbol|date|units[#n]. */
  key: string;
  symbol: string;
  institution: string;
  sell_date: string; // YYYY-MM-DD
  units: number;     // shares sold (positive)
  proceeds: number;
  /** Portion matched to real purchase lots. */
  matchedUnits: number;
  matchedBasis: number;
  shortGain: number;
  longGain: number;
  /** Portion from transfer-in lots or shares with no visible purchase. */
  unknownUnits: number;
  unknownProceeds: number;
}

interface Lot {
  units: number;
  /** null = unknown basis (transfer-in). */
  costPerShare: number | null;
  date: string;
}

function isoDate(t: any): string {
  const raw = t.trade_date ?? t.settlement_date ?? "";
  return String(raw).slice(0, 10);
}

function symbolOf(t: any): string {
  return t.symbol?.symbol ?? t.symbol?.raw_symbol ?? t.symbol ?? "";
}

/**
 * Run FIFO lot matching over tagged raw activities (each carrying
 * `_institution`). Returns every equity sale, whenever it happened —
 * callers filter to the tax year.
 */
export function computeEquitySales(rawActivities: any[]): EquitySaleEvent[] {
  const relevant = rawActivities
    .filter((t) => !t.option_symbol)
    .filter((t) => {
      const sym = symbolOf(t);
      return sym && !SWEEP_SYMBOLS.has(String(sym).toUpperCase());
    })
    .filter((t) => !IGNORED_TYPES.has(t.type))
    .sort((a, b) => isoDate(a).localeCompare(isoDate(b)));

  const lots = new Map<string, Lot[]>(); // institution|symbol → FIFO lots
  const events: EquitySaleEvent[] = [];
  const keyCounts = new Map<string, number>();

  for (const t of relevant) {
    const institution = t._institution ?? "Unknown";
    const symbol = String(symbolOf(t)).toUpperCase();
    const lotKey = `${institution}|${symbol}`;
    const units = Number(t.units ?? 0);
    const price = Number(t.price ?? 0);
    const amount = Number(t.amount ?? 0);
    const date = isoDate(t);
    if (!date || units === 0) continue;

    if (!lots.has(lotKey)) lots.set(lotKey, []);
    const queue = lots.get(lotKey)!;

    const isBuyLike = (t.type === "BUY" || t.type === "REI") && units > 0;
    const isSell = t.type === "SELL" && units < 0;
    const isUnknownInflow = UNKNOWN_BASIS_INFLOWS.has(t.type) && units > 0;
    const isOutflow = UNKNOWN_BASIS_INFLOWS.has(t.type) && units < 0;

    if (isBuyLike) {
      // amount is negative cash for buys; prefer it (includes fees) else price.
      const perShare = amount < 0 ? -amount / units : price;
      queue.push({ units, costPerShare: perShare, date });
    } else if (isUnknownInflow) {
      queue.push({ units, costPerShare: null, date });
    } else if (isOutflow) {
      // Shares moved out (e.g. transferred to another broker) — remove FIFO
      // without realizing anything.
      let toRemove = -units;
      while (toRemove > 0 && queue.length > 0) {
        const lot = queue[0];
        const take = Math.min(lot.units, toRemove);
        lot.units -= take;
        toRemove -= take;
        if (lot.units <= 1e-9) queue.shift();
      }
    } else if (isSell) {
      const sellUnits = -units;
      const perShareProceeds = amount > 0 ? amount / sellUnits : price;
      const proceeds = perShareProceeds * sellUnits;

      let remaining = sellUnits;
      let matchedUnits = 0;
      let matchedBasis = 0;
      let shortGain = 0;
      let longGain = 0;
      let unknownUnits = 0;

      while (remaining > 1e-9 && queue.length > 0) {
        const lot = queue[0];
        const take = Math.min(lot.units, remaining);
        if (lot.costPerShare == null) {
          unknownUnits += take;
        } else {
          const heldDays = (Date.parse(date) - Date.parse(lot.date)) / 86_400_000;
          const gain = (perShareProceeds - lot.costPerShare) * take;
          if (heldDays > LONG_TERM_HOLDING_DAYS) longGain += gain;
          else shortGain += gain;
          matchedUnits += take;
          matchedBasis += lot.costPerShare * take;
        }
        lot.units -= take;
        remaining -= take;
        if (lot.units <= 1e-9) queue.shift();
      }
      // No lot at all (history gap, splits, pre-window shares) → unknown.
      unknownUnits += remaining;

      const baseKey = `${institution}|${symbol}|${date}|${sellUnits}`;
      const n = (keyCounts.get(baseKey) ?? 0) + 1;
      keyCounts.set(baseKey, n);

      events.push({
        key: n === 1 ? baseKey : `${baseKey}#${n}`,
        symbol,
        institution,
        sell_date: date,
        units: sellUnits,
        proceeds,
        matchedUnits,
        matchedBasis,
        shortGain,
        longGain,
        unknownUnits,
        unknownProceeds: perShareProceeds * unknownUnits,
      });
    }
  }

  return events;
}

export interface BasisOverrideLike {
  event_key: string;
  cost_basis: number;
  acquired_date: string; // YYYY-MM-DD
}

export interface UnknownBasisSale {
  key: string;
  symbol: string;
  institution: string;
  sell_date: string;
  units: number;
  proceeds: number;
}

export interface EquityRealized {
  /** Feed these into the shared period/year math (source: "equity"). */
  events: {
    underlying: string;
    net_pnl: number;
    term: TaxTerm;
    end_date: string;
    source: "equity";
  }[];
  /** Sales (or portions) still missing basis — excluded from the math. */
  needsBasis: UnknownBasisSale[];
}

/**
 * Convert raw sale events into realized tax events, applying any user
 * basis overrides to unknown portions. The override supplies total cost
 * basis + acquisition date for the sale's unknown units; holding period
 * then decides short vs long.
 */
export function equityRealizedEvents(
  sales: EquitySaleEvent[],
  overrides: BasisOverrideLike[],
  taxYear: number
): EquityRealized {
  const prefix = `${taxYear}-`;
  const overrideByKey = new Map(overrides.map((o) => [o.event_key, o]));
  const events: EquityRealized["events"] = [];
  const needsBasis: UnknownBasisSale[] = [];

  for (const s of sales) {
    if (!s.sell_date.startsWith(prefix)) continue;

    if (s.matchedUnits > 1e-9) {
      if (s.shortGain !== 0 || s.longGain === 0) {
        events.push({ underlying: s.symbol, net_pnl: s.shortGain, term: "short", end_date: s.sell_date, source: "equity" });
      }
      if (s.longGain !== 0) {
        events.push({ underlying: s.symbol, net_pnl: s.longGain, term: "long", end_date: s.sell_date, source: "equity" });
      }
    }

    if (s.unknownUnits > 1e-9) {
      const ov = overrideByKey.get(s.key);
      if (ov) {
        const heldDays = (Date.parse(s.sell_date) - Date.parse(ov.acquired_date)) / 86_400_000;
        events.push({
          underlying: s.symbol,
          net_pnl: s.unknownProceeds - ov.cost_basis,
          term: heldDays > LONG_TERM_HOLDING_DAYS ? "long" : "short",
          end_date: s.sell_date,
          source: "equity",
        });
      } else {
        needsBasis.push({
          key: s.key,
          symbol: s.symbol,
          institution: s.institution,
          sell_date: s.sell_date,
          units: s.unknownUnits,
          proceeds: s.unknownProceeds,
        });
      }
    }
  }

  return { events, needsBasis };
}
