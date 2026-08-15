/**
 * Tax Center assumptions — hardcoded for the single portfolio-access user.
 *
 * ASSUMPTIONS (revisit yearly, or if the user's situation changes):
 * - ~$700K annual W-2 income, fully covered by employer withholding.
 *   Trading taxes computed here are INCREMENTAL on top of that.
 * - Single filer already in the top federal bracket (income > $640K),
 *   so every marginal trading dollar is taxed at the top rates below.
 * - Washington state resident: no state income tax. WA's 7% capital-gains
 *   excise applies ONLY to long-term gains above the annual exemption,
 *   so it is usually $0 for a short-premium options seller.
 * - Gains from WRITING options (SELL-direction chains) are ALWAYS
 *   short-term regardless of holding period — IRC §1234(b).
 * - These are planning estimates, not tax advice.
 */

/** The tax year this Tax Center instance computes. */
export const TAX_YEAR = 2026;

/** Approximate W-2 base income (fully withheld by employer). */
export const ASSUMED_W2_INCOME = 700_000;

/** Top federal ordinary-income bracket (single, income > ~$640K). */
export const FEDERAL_TOP_MARGINAL_RATE = 0.37;

/** Net Investment Income Tax — applies to all investment income at this AGI. */
export const NIIT_RATE = 0.038;

/** Effective marginal rate on short-term gains: 37% + 3.8% NIIT = 40.8%. */
export const STCG_MARGINAL_RATE = FEDERAL_TOP_MARGINAL_RATE + NIIT_RATE;

/** Effective federal rate on long-term gains: 20% + 3.8% NIIT = 23.8%. */
export const LTCG_FEDERAL_RATE = 0.2 + NIIT_RATE;

/** WA capital-gains excise — long-term gains only, above the exemption. */
export const WA_CAPITAL_GAINS_RATE = 0.07;

/** WA annual exemption (~$280K, inflation-adjusted; approximate). */
export const WA_CAPITAL_GAINS_EXEMPTION = 280_000;

/** BUY-direction chains held MORE than this many days are long-term. */
export const LONG_TERM_HOLDING_DAYS = 365;

export type PeriodId = "Q1" | "Q2" | "Q3" | "Q4";

export interface EstimatedTaxPeriod {
  id: PeriodId;
  /** Inclusive income-window start, YYYY-MM-DD. */
  start: string;
  /** Inclusive income-window end, YYYY-MM-DD. */
  end: string;
  /** IRS payment due date, YYYY-MM-DD. */
  dueDate: string;
}

/**
 * IRS estimated-tax periods for tax year 2026. These are NOT calendar
 * quarters — Q2 is two months and Q4 is four.
 */
export const ESTIMATED_TAX_PERIODS: EstimatedTaxPeriod[] = [
  { id: "Q1", start: "2026-01-01", end: "2026-03-31", dueDate: "2026-04-15" },
  { id: "Q2", start: "2026-04-01", end: "2026-05-31", dueDate: "2026-06-15" },
  { id: "Q3", start: "2026-06-01", end: "2026-08-31", dueDate: "2026-09-15" },
  { id: "Q4", start: "2026-09-01", end: "2026-12-31", dueDate: "2027-01-15" },
];

/** Serializable assumptions blob the API hands to the UI. */
export const TAX_ASSUMPTIONS = {
  taxYear: TAX_YEAR,
  w2Income: ASSUMED_W2_INCOME,
  stcgRate: STCG_MARGINAL_RATE,
  ltcgFederalRate: LTCG_FEDERAL_RATE,
  waRate: WA_CAPITAL_GAINS_RATE,
  waExemption: WA_CAPITAL_GAINS_EXEMPTION,
  longTermHoldingDays: LONG_TERM_HOLDING_DAYS,
} as const;

export type TaxAssumptions = typeof TAX_ASSUMPTIONS;
