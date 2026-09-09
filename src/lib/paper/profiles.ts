import { SECTORS } from "@/lib/market/sectors";
import { DEFAULT_UNIVERSE } from "@/lib/options/csp-scanner";
import type { Profile } from "./types";

export const ETFS = ["SPY", "QQQ", "IWM", "EEM"];
export const SECTOR_ETFS = ["XLK", "XLC", "XLY", "XLP", "XLE", "XLF", "XLV", "XLI", "XLB", "XLRE", "XLU"];
export const MEGACAPS = [
  "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "AVGO", "ORCL", "NFLX",
  "COST", "LLY", "JPM", "V", "MA", "AMD", "PLTR", "CRM", "ADBE", "NOW",
];
export const GROWTH_BASKET = ["NVDA", "TSLA", "PLTR", "AMD", "RKLB", "HOOD", "COIN", "ASTS"];
export const DIP_UNIVERSE = DEFAULT_UNIVERSE.filter((s) => !ETFS.includes(s));
export const PMCC_UNIVERSE = [...new Set(SECTORS.flatMap((s) => s.tickers))];

export const PROFILES: Profile[] = [
  {
    id: "index-dca",
    name: "Atlas",
    tagline: "Buys the index every morning and never looks back",
    style: ["stocks", "no-margin", "index"],
    plan: [
      "Every open, buy $5,000 split SPY 60% / QQQ 30% / IWM 10%.",
      "If SPY is down more than 1% on the day at the close run, buy another $5,000 the same way.",
      "Never sell.",
      "Once cash runs out, hold.",
    ],
    universe: ["SPY", "QQQ", "IWM"],
    params: { clipUsd: 5000, weights: ["SPY:60", "QQQ:30", "IWM:10"], dipPct: -1 },
    margin: false,
  },
  {
    id: "sector-rotator",
    name: "Compass",
    tagline: "Top three SPDR sectors by 20-day return, rebalanced weekly",
    style: ["stocks", "no-margin", "sector"],
    plan: [
      "Universe: the 11 SPDR sector ETFs (XLK XLC XLY XLP XLE XLF XLV XLI XLB XLRE XLU).",
      "On the first session of each week, rank the sectors by 20-day return.",
      "Hold the top 3 equal-weight, fully invested.",
      "Sell whatever dropped out of the top 3.",
    ],
    universe: SECTOR_ETFS,
    params: { hold: 3, lookbackDays: 20 },
    margin: false,
  },
  {
    id: "megacap-momentum",
    name: "Northstar",
    tagline: "Trend-following the twenty largest names, eight at a time",
    style: ["stocks", "no-margin", "momentum"],
    plan: [
      "Universe: AAPL MSFT NVDA GOOGL AMZN META TSLA AVGO ORCL NFLX COST LLY JPM V MA AMD PLTR CRM ADBE NOW.",
      "Buy names above both the 50- and 200-day SMA with a positive 20-day return.",
      "Up to 8 positions at 12.5% of equity each, strongest 20-day return first.",
      "8% trailing stop from the highest close since entry.",
      "Exit on a close below the 50-day SMA.",
    ],
    universe: MEGACAPS,
    params: { maxPositions: 8, weightPct: 12.5, trailPct: 8 },
    margin: false,
  },
  {
    id: "margin-bull",
    name: "Booster",
    tagline: "Momentum on 1.6× leverage with a hard equity floor",
    style: ["stocks", "margin", "momentum"],
    plan: [
      "Same signal as Mega-cap Momentum: above the 50- and 200-day SMA with a positive 20-day return.",
      "5 positions at 32% of equity each — about 1.6× gross exposure, borrowing up to $60K.",
      "7% trailing stop from the highest close since entry; exit on a close below the 50-day SMA.",
      "If equity falls under $85K, sell the weakest position until borrowing is zero.",
      "Margin interest of 8% APR accrues daily on the borrowed balance.",
    ],
    universe: MEGACAPS,
    params: { maxPositions: 5, weightPct: 32, trailPct: 7, equityFloor: 85000 },
    margin: true,
  },
  {
    id: "dip-buyer",
    name: "Salvage",
    tagline: "Buys sharp one-day drops and oversold names, sells inside two weeks",
    style: ["stocks", "no-margin", "contrarian"],
    plan: [
      "Universe: the CSP Hunter default universe minus ETFs.",
      "Buy $10,000 of any name down 5% or more on the day, or with a 14-day RSI under 35.",
      "At most 6 open positions; one entry per name per week.",
      "Sell at +6%, at −8%, or after 10 trading days — whichever comes first.",
    ],
    universe: DIP_UNIVERSE,
    params: { clipUsd: 10000, maxPositions: 6, dropPct: -5, rsiMax: 35, takePct: 6, stopPct: -8, maxDays: 10 },
    margin: false,
  },
  {
    id: "put-seller",
    name: "Breakwater",
    tagline: "Eight short puts at a time, 0.15–0.25 delta, managed at 50%",
    style: ["options", "margin", "income"],
    plan: [
      "Universe: the 25 most liquid names in the CSP Hunter universe priced under $400.",
      "Sell 0.15–0.25 delta puts, 21–45 DTE, targeting 8 open positions.",
      "1 contract per $10K of strike notional (minimum 1).",
      "Margin per contract = max(20% × spot − OTM amount, 10% × strike) × 100 + premium, never exceeding buying power.",
      "Buy back at 50% of the credit, at 21 DTE, or when the put's delta exceeds 0.50 — then immediately sell a new one.",
      "If equity falls under $85K, stop opening new puts and let the book run down.",
    ],
    universe: DEFAULT_UNIVERSE,
    params: { universeSize: 25, maxPrice: 400, targetPositions: 8, minDelta: 0.15, maxDelta: 0.25, minDte: 21, maxDte: 45, notionalUsd: 10000, equityFloor: 85000 },
    margin: true,
  },
  {
    id: "wheel",
    name: "Wheelhouse",
    tagline: "Cash-secured puts on five names, covered calls when assigned",
    style: ["options", "no-margin", "income"],
    plan: [
      "Five names under $200 from the put-seller universe.",
      "Sell one 0.30-delta, 30–45 DTE cash-secured put per name; collateral of strike × 100 must fit in cash.",
      "On assignment, take the shares and sell a 0.30-delta ~30-DTE covered call struck above cost.",
      "When the shares are called away, start over with a put.",
    ],
    universe: DEFAULT_UNIVERSE,
    params: { names: 5, maxPrice: 200, delta: 0.3, putMinDte: 30, putMaxDte: 45, callMinDte: 21, callMaxDte: 40 },
    margin: false,
  },
  {
    id: "pmcc-operator",
    name: "Longview",
    tagline: "Deep LEAPS calls with monthly short calls written against them",
    style: ["options", "no-margin", "growth"],
    plan: [
      "Five names from the sector universe priced $30–$400.",
      "Buy one ~0.75-delta LEAPS call 12–18 months out per name, at most $15K each.",
      "Sell a 0.25-delta ~30-DTE call struck above LEAPS strike + net debit.",
      "Buy the short call back at 50% profit or at 7 DTE, then re-sell.",
      "Close the LEAPS if its delta drops under 0.55.",
    ],
    universe: PMCC_UNIVERSE,
    params: { names: 5, minPrice: 30, maxPrice: 400, leapsDelta: 0.75, leapsMinDte: 365, leapsMaxDte: 550, maxLeapsUsd: 15000, shortDelta: 0.25, shortMinDte: 21, shortMaxDte: 45 },
    margin: false,
  },
  {
    id: "spy-condor",
    name: "Canopy",
    tagline: "One defined-risk condor on SPY every week, risking 2% of equity",
    style: ["options", "margin", "neutral"],
    plan: [
      "On the first session of each week, sell a 0.15-delta put spread and a 0.15-delta call spread on SPY.",
      "$5 wide wings, 7–10 DTE.",
      "Size so the maximum loss is at most 2% of equity.",
      "Close the whole condor at 50% of the credit, or at a loss of 2× the credit.",
      "Otherwise let it expire.",
    ],
    universe: ["SPY"],
    params: { delta: 0.15, width: 5, minDte: 7, maxDte: 10, riskPct: 2, takeProfit: 0.5, stopLoss: 2 },
    margin: true,
  },
  {
    id: "growth-shadow",
    name: "Vector",
    tagline: "A proxy basket for a public growth fund — not its actual book",
    style: ["mixed", "margin", "growth"],
    plan: [
      "Basket: NVDA TSLA PLTR AMD RKLB HOOD COIN ASTS — a proxy for a public growth fund, not its actual holdings.",
      "Equal weight at start and on the first session of each month.",
      "On any day the basket is down more than 3%, add 25% of equity across the basket on margin.",
      "Never borrow more than 50% of equity, and stop adding once within 5% of the floor.",
      "If equity falls under $85K, sell down to zero borrowing.",
      "When equity is up 10% from the last rebalance, sell down to zero borrowing.",
    ],
    universe: GROWTH_BASKET,
    params: { dipPct: -3, addPct: 25, takePct: 10, equityFloor: 85000, maxBorrowPct: 50 },
    margin: true,
  },
];

export const PROFILE_IDS = PROFILES.map((p) => p.id);

export function getProfile(id: string): Profile | undefined {
  return PROFILES.find((p) => p.id === id);
}

/** Symbols the fetcher must quote before any profile decides. */
export function allQuoteSymbols(): string[] {
  return [...new Set([...PROFILES.flatMap((p) => p.universe), ...DEFAULT_UNIVERSE])];
}
