/**
 * Estimated-tax math over realized option-chain P&L. Pure functions only —
 * no I/O — so every piece is unit-testable.
 */

import type { OptionChain } from "@/lib/snaptrade/client";
import {
  ESTIMATED_TAX_PERIODS,
  LONG_TERM_HOLDING_DAYS,
  LTCG_FEDERAL_RATE,
  STCG_MARGINAL_RATE,
  TAX_YEAR,
  WA_CAPITAL_GAINS_EXEMPTION,
  WA_CAPITAL_GAINS_RATE,
  type PeriodId,
} from "./config";

export type TaxTerm = "short" | "long";

/** Chain statuses whose net_pnl counts as realized. */
const REALIZED_STATUSES = new Set(["CLOSED", "EXPIRED", "ASSIGNED"]);

/** One realized chain reduced to what the tax math needs. */
export interface RealizedEvent {
  underlying: string;
  net_pnl: number;
  term: TaxTerm;
  /** Realization date (chain end_date), YYYY-MM-DD. */
  end_date: string;
}

/**
 * SELL-direction chains (written options) are ALWAYS short-term regardless
 * of holding period — IRC §1234(b). BUY-direction chains (long calls/LEAPS)
 * are long-term only if held more than LONG_TERM_HOLDING_DAYS.
 */
export function classifyTerm(
  chain: Pick<OptionChain, "direction" | "start_date" | "end_date">
): TaxTerm {
  if (chain.direction === "SELL") return "short";
  if (!chain.end_date) return "short";
  const heldDays =
    (Date.parse(chain.end_date) - Date.parse(chain.start_date)) / 86_400_000;
  return heldDays > LONG_TERM_HOLDING_DAYS ? "long" : "short";
}

/** Realized chains for the tax year (by end_date), reduced for the math. */
export function realizedEventsForYear(
  chains: OptionChain[],
  taxYear: number = TAX_YEAR
): RealizedEvent[] {
  const prefix = `${taxYear}-`;
  return chains
    .filter((c) => REALIZED_STATUSES.has(c.status) && c.end_date?.startsWith(prefix))
    .map((c) => ({
      underlying: c.underlying,
      net_pnl: c.net_pnl,
      term: classifyTerm(c),
      end_date: c.end_date as string,
    }));
}

export interface TaxBreakdown {
  /** Short-term amount actually taxed, after cross-netting losses. */
  stTaxable: number;
  /** Long-term amount actually taxed, after cross-netting losses. */
  ltTaxable: number;
  federalStTax: number;
  federalLtTax: number;
  /** WA 7% excise on LT gains above the exemption (usually 0). */
  waTax: number;
  total: number;
}

/**
 * Incremental tax on net realized gains. Simplified §1(h) netting: a net
 * loss in one bucket offsets gains in the other; an overall net loss floors
 * tax at 0 (the $3K ordinary-income offset + carryforward is surfaced as
 * copy in the UI, not modeled here).
 */
export function taxOn(stcgNet: number, ltcgNet: number): TaxBreakdown {
  let st = stcgNet;
  let lt = ltcgNet;
  if (st < 0 && lt > 0) {
    const offset = Math.min(-st, lt);
    st += offset;
    lt -= offset;
  } else if (lt < 0 && st > 0) {
    const offset = Math.min(-lt, st);
    lt += offset;
    st -= offset;
  }
  const stTaxable = Math.max(0, st);
  const ltTaxable = Math.max(0, lt);
  const federalStTax = stTaxable * STCG_MARGINAL_RATE;
  const federalLtTax = ltTaxable * LTCG_FEDERAL_RATE;
  const waTax =
    Math.max(0, ltTaxable - WA_CAPITAL_GAINS_EXEMPTION) * WA_CAPITAL_GAINS_RATE;
  return {
    stTaxable,
    ltTaxable,
    federalStTax,
    federalLtTax,
    waTax,
    total: federalStTax + federalLtTax + waTax,
  };
}

export interface PaymentLike {
  /** YYYY-MM-DD */
  paid_date: string;
  amount: number;
}

export type PeriodStatus = "past" | "current" | "future";

export interface PeriodSummary {
  id: PeriodId;
  start: string;
  end: string;
  dueDate: string;
  /** Realized in this period only. */
  gains: number;
  losses: number; // negative or 0
  net: number;
  stcg: number;
  ltcg: number;
  /** Running totals through the end of this period. */
  cumulativeNet: number;
  cumulativeStcg: number;
  cumulativeLtcg: number;
  cumulativeTax: number;
  /** Payments bucketed to this period (by due-date window, see below). */
  paid: number;
  cumulativePaid: number;
  /** One-off payment to make for this period: max(0, cumTax − cumPaid). */
  recommended: number;
  status: PeriodStatus;
}

/**
 * Per-period cumulative estimates. Cumulative method means losses in later
 * periods shrink subsequent recommendations (never below 0), and earlier
 * overpayments carry forward as credit automatically.
 *
 * Payment bucketing: a payment belongs to the first period whose due date is
 * on/after its paid date (a Q1 payment can be made any time up to Apr 15;
 * one made Apr 16–Jun 15 counts toward Q2, etc.). Payments after the final
 * due date clamp to Q4. This keeps display buckets consistent with the
 * recommendation math, which counts payments dated on/before each due date.
 */
export function computePeriods(
  events: RealizedEvent[],
  payments: PaymentLike[],
  todayISO: string
): PeriodSummary[] {
  const periods = ESTIMATED_TAX_PERIODS;

  const paidByPeriod = periods.map(() => 0);
  for (const p of payments) {
    let idx = periods.findIndex((per) => p.paid_date <= per.dueDate);
    if (idx === -1) idx = periods.length - 1;
    paidByPeriod[idx] += p.amount;
  }

  // The "current" period is the one whose payment is next due.
  const currentIdx = periods.findIndex((per) => todayISO <= per.dueDate);

  let cumStcg = 0;
  let cumLtcg = 0;
  let cumPaid = 0;

  return periods.map((per, i) => {
    let gains = 0;
    let losses = 0;
    let stcg = 0;
    let ltcg = 0;
    for (const ev of events) {
      if (ev.end_date < per.start || ev.end_date > per.end) continue;
      if (ev.net_pnl >= 0) gains += ev.net_pnl;
      else losses += ev.net_pnl;
      if (ev.term === "short") stcg += ev.net_pnl;
      else ltcg += ev.net_pnl;
    }
    const net = stcg + ltcg;
    cumStcg += stcg;
    cumLtcg += ltcg;
    cumPaid += paidByPeriod[i];

    const cumulativeTax = taxOn(cumStcg, cumLtcg).total;
    const recommended = Math.max(0, cumulativeTax - cumPaid);
    const status: PeriodStatus =
      currentIdx === -1 || i < currentIdx
        ? "past"
        : i === currentIdx
          ? "current"
          : "future";

    return {
      id: per.id,
      start: per.start,
      end: per.end,
      dueDate: per.dueDate,
      gains,
      losses,
      net,
      stcg,
      ltcg,
      cumulativeNet: cumStcg + cumLtcg,
      cumulativeStcg: cumStcg,
      cumulativeLtcg: cumLtcg,
      cumulativeTax,
      paid: paidByPeriod[i],
      cumulativePaid: cumPaid,
      recommended,
      status,
    };
  });
}

export interface UnderlyingSummary {
  underlying: string;
  net: number;
  gains: number;
  losses: number; // negative or 0
  chains: number;
}

export interface YearSummary {
  taxYear: number;
  realizedCount: number;
  grossGains: number;
  grossLosses: number; // negative or 0
  net: number;
  stcgNet: number;
  ltcgNet: number;
  tax: TaxBreakdown;
  totalPaid: number;
  /** Estimated tax still unpaid for the year: max(0, tax.total − totalPaid). */
  remaining: number;
  /** Sorted by |net| descending; UI shows the top slice. */
  byUnderlying: UnderlyingSummary[];
}

export function computeYearSummary(
  events: RealizedEvent[],
  payments: PaymentLike[],
  taxYear: number = TAX_YEAR
): YearSummary {
  let grossGains = 0;
  let grossLosses = 0;
  let stcgNet = 0;
  let ltcgNet = 0;
  const by = new Map<string, UnderlyingSummary>();

  for (const ev of events) {
    if (ev.net_pnl >= 0) grossGains += ev.net_pnl;
    else grossLosses += ev.net_pnl;
    if (ev.term === "short") stcgNet += ev.net_pnl;
    else ltcgNet += ev.net_pnl;

    const entry = by.get(ev.underlying) ?? {
      underlying: ev.underlying,
      net: 0,
      gains: 0,
      losses: 0,
      chains: 0,
    };
    entry.net += ev.net_pnl;
    if (ev.net_pnl >= 0) entry.gains += ev.net_pnl;
    else entry.losses += ev.net_pnl;
    entry.chains += 1;
    by.set(ev.underlying, entry);
  }

  const tax = taxOn(stcgNet, ltcgNet);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return {
    taxYear,
    realizedCount: events.length,
    grossGains,
    grossLosses,
    net: stcgNet + ltcgNet,
    stcgNet,
    ltcgNet,
    tax,
    totalPaid,
    remaining: Math.max(0, tax.total - totalPaid),
    byUnderlying: [...by.values()].sort(
      (a, b) => Math.abs(b.net) - Math.abs(a.net)
    ),
  };
}

/**
 * Which tax year a payment belongs to, from its paid date: a January
 * payment is the prior year's Q4 estimated payment (due Jan 15), so it
 * defaults to year − 1; everything else defaults to the calendar year.
 */
export function defaultTaxYearForPayment(paidDate: string): number {
  const [year, month] = paidDate.split("-").map(Number);
  return month === 1 ? year - 1 : year;
}
