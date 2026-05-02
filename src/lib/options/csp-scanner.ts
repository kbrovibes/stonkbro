/**
 * CSP Alpha Hunter — Core Scanner
 *
 * Scans a universe of high-volume stocks for juicy Cash Secured Puts:
 * - 1-3 weeks DTE (7-21 days)
 * - Delta between 0.15 and 0.30 (OTM sweet spot)
 * - Calculates Annualized Return on Capital (AROC) assuming configurable collateral
 * - Enriches with technicals (EMA support), earnings proximity, and sentiment
 */

import { QuoteData, OptionContract } from "@/lib/market/types";
import { getQuotes } from "@/lib/market/yahoo";
import {
  tradierGetExpirations,
  tradierGetOptionsChain,
} from "@/lib/market/tradier";
import { analyzeTechnicals, TechnicalSignals } from "@/lib/analysis/technicals";
import { getEarningsCalendar, EarningsEvent } from "@/lib/market/earnings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CSPHunterCandidate = {
  // Identity
  symbol: string;
  name: string;

  // Contract details
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  premium: number; // mid * 100 (per contract)

  // Greeks
  delta: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  iv: number;

  // Capital efficiency
  collateralRequired: number; // strike * 100
  aroc: number; // annualized return on capital (%)
  contractsAt100k: number; // how many contracts fit in $100K
  totalPremium: number; // premium * contractsAt100k
  capitalUtilization: number; // % of capital deployed

  // Context
  currentPrice: number;
  distanceFromPrice: number; // % below current price
  volumeRatio: number;
  openInterest: number;
  volume: number;

  // Technical enrichment
  nearSupport: boolean; // price near 50 or 200 EMA
  supportLevel: number;
  rsi: number;
  technicalScore: number;

  // Earnings
  earningsWithinDTE: boolean;
  earningsDate: string | null;
  daysToEarnings: number | null;

  // Composite
  juiciness: number; // 0-100 composite score
  priority: "high" | "medium" | "low";
  reasoning: string;
};

export type CSPScanResult = {
  candidates: CSPHunterCandidate[];
  scannedTickers: string[];
  scannedAt: string;
  capital: number;
  errors: string[];
};

// ---------------------------------------------------------------------------
// Default universe — high-volume, liquid options, good for premium selling
// ---------------------------------------------------------------------------

const DEFAULT_UNIVERSE = [
  // Mega-cap tech
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
  // Semi & growth
  "AMD", "INTC", "MU", "QCOM", "AVGO", "MRVL", "ARM",
  // Cloud / SaaS
  "CRM", "NOW", "SNOW", "PLTR", "NET", "DDOG", "CRWD",
  // Finance
  "JPM", "GS", "BAC", "V", "MA",
  // Consumer / retail
  "NFLX", "DIS", "SBUX", "NKE", "TGT", "WMT",
  // Energy / industrial
  "XOM", "CVX", "BA", "CAT",
  // Biotech / pharma
  "ABBV", "LLY", "PFE", "MRNA",
  // ETFs (high volume options)
  "SPY", "QQQ", "IWM", "EEM",
];

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export type CSPScanConfig = {
  capital?: number;      // default 100_000
  minDTE?: number;       // default 7
  maxDTE?: number;       // default 21
  minDelta?: number;     // default 0.15 (absolute)
  maxDelta?: number;     // default 0.30 (absolute)
  minAROC?: number;      // default 10 (% annualized)
  minOpenInterest?: number; // default 50
  maxCandidatesPerTicker?: number; // default 3
  tickers?: string[];    // override default universe
};

const DEFAULT_CONFIG: Required<CSPScanConfig> = {
  capital: 100_000,
  minDTE: 7,
  maxDTE: 21,
  minDelta: 0.15,
  maxDelta: 0.30,
  minAROC: 10,
  minOpenInterest: 50,
  maxCandidatesPerTicker: 3,
  tickers: DEFAULT_UNIVERSE,
};

// ---------------------------------------------------------------------------
// Core scanner
// ---------------------------------------------------------------------------

export async function scanForCSPs(
  userConfig: CSPScanConfig = {}
): Promise<CSPScanResult> {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const errors: string[] = [];
  const allCandidates: CSPHunterCandidate[] = [];

  // 1. Fetch quotes for entire universe in one batch
  const quotes = await getQuotes(config.tickers);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  // 2. Fetch upcoming earnings for context
  let earningsMap = new Map<string, EarningsEvent>();
  try {
    const earnings = await getEarningsCalendar(config.tickers);
    earningsMap = new Map(earnings.map((e) => [e.symbol, e]));
  } catch (e) {
    errors.push(`Earnings fetch failed: ${e}`);
  }

  // 3. Scan each ticker for CSP candidates
  const scanPromises = config.tickers.map(async (symbol) => {
    try {
      const quote = quoteMap.get(symbol);
      if (!quote || quote.price <= 0) return [];

      // Get expirations and filter to 1-3 week window
      const expirations = await tradierGetExpirations(symbol);
      const now = new Date();
      const targetExpirations = expirations.filter((exp) => {
        const expDate = new Date(exp);
        const dte = Math.ceil(
          (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return dte >= config.minDTE && dte <= config.maxDTE;
      });

      if (targetExpirations.length === 0) return [];

      // Fetch technicals (parallel with options chains)
      const [technicals, ...chainResults] = await Promise.all([
        analyzeTechnicals(symbol, quote).catch(() => null),
        ...targetExpirations.map((exp) =>
          tradierGetOptionsChain(symbol, exp).catch(() => null)
        ),
      ]);

      const earnings = earningsMap.get(symbol);
      const candidates: CSPHunterCandidate[] = [];

      for (const chainResult of chainResults) {
        if (!chainResult) continue;

        const filteredPuts = chainResult.puts.filter((p) => {
          if (p.inTheMoney) return false;
          if (p.mid <= 0.05) return false;
          if (p.openInterest < config.minOpenInterest) return false;

          // Delta filter — use real Greeks when available
          const absDelta = Math.abs(p.delta ?? estimateDelta(p, quote.price));
          if (absDelta < config.minDelta || absDelta > config.maxDelta) return false;

          return true;
        });

        for (const put of filteredPuts) {
          const candidate = buildCandidate(
            put,
            quote,
            technicals,
            earnings ?? null,
            config.capital
          );
          if (candidate.aroc >= config.minAROC) {
            candidates.push(candidate);
          }
        }
      }

      // Keep top N per ticker, sorted by juiciness
      return candidates
        .sort((a, b) => b.juiciness - a.juiciness)
        .slice(0, config.maxCandidatesPerTicker);
    } catch (e) {
      errors.push(`${symbol}: ${e}`);
      return [];
    }
  });

  // Run all scans with concurrency limit (avoid rate limits)
  const results = await settledBatch(scanPromises, 5);
  for (const result of results) {
    allCandidates.push(...result);
  }

  // Sort all candidates by juiciness
  allCandidates.sort((a, b) => b.juiciness - a.juiciness);

  return {
    candidates: allCandidates,
    scannedTickers: config.tickers,
    scannedAt: new Date().toISOString(),
    capital: config.capital,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Build a single candidate with all enrichment
// ---------------------------------------------------------------------------

function buildCandidate(
  put: OptionContract,
  quote: QuoteData,
  technicals: TechnicalSignals | null,
  earnings: EarningsEvent | null,
  capital: number
): CSPHunterCandidate {
  const premium = put.mid * 100;
  const collateral = put.strike * 100;
  const aroc = (put.mid / put.strike) * (365 / put.dte) * 100;
  const contracts = Math.floor(capital / collateral);
  const totalPremium = premium * contracts;
  const capitalUsed = collateral * contracts;
  const capitalUtilization = (capitalUsed / capital) * 100;
  const distPct = ((quote.price - put.strike) / quote.price) * 100;
  const absDelta = Math.abs(put.delta ?? estimateDelta(put, quote.price));

  // Technical enrichment
  const supportLevel = technicals?.nearestSupport ?? quote.fiftyDayAvg;
  const nearSupport =
    supportLevel > 0 &&
    put.strike <= supportLevel * 1.02 &&
    put.strike >= supportLevel * 0.95;
  const rsi = technicals?.rsi14 ?? 50;
  const technicalScore = technicals?.score ?? 50;

  // Earnings check
  const earningsWithinDTE =
    earnings !== null && earnings.daysUntil >= 0 && earnings.daysUntil <= put.dte;
  const earningsDate = earnings?.earningsDate ?? quote.earningsDate;
  const daysToEarnings = earnings?.daysUntil ?? technicals?.daysToEarnings ?? null;

  // Juiciness score (0-100)
  const juiciness = calcJuiciness({
    aroc,
    absDelta,
    distPct,
    nearSupport,
    rsi,
    technicalScore,
    earningsWithinDTE,
    iv: put.iv ?? put.impliedVolatility,
    openInterest: put.openInterest,
    volumeRatio: quote.volumeRatio,
  });

  const priority =
    juiciness >= 75 ? "high" : juiciness >= 50 ? "medium" : "low";

  // Build reasoning
  const reasons: string[] = [];
  reasons.push(
    `${quote.name} $${put.strike} put @ $${put.mid.toFixed(2)} (${aroc.toFixed(1)}% AROC)`
  );
  reasons.push(`${put.dte}d DTE, Δ${absDelta.toFixed(2)}, ${distPct.toFixed(1)}% OTM`);
  if (contracts > 0) {
    reasons.push(
      `${contracts} contracts = $${totalPremium.toFixed(0)} premium on $${capitalUsed.toLocaleString()} collateral`
    );
  }
  if (nearSupport) reasons.push(`Strike near support at $${supportLevel.toFixed(2)}`);
  if (earningsWithinDTE) reasons.push(`⚠️ Earnings within DTE window`);
  if (rsi < 30) reasons.push(`RSI oversold (${rsi})`);
  if (rsi > 70) reasons.push(`RSI overbought (${rsi}) — caution`);

  return {
    symbol: quote.symbol,
    name: quote.name,
    strike: put.strike,
    expiry: put.expiry,
    dte: put.dte,
    bid: put.bid,
    ask: put.ask,
    mid: put.mid,
    premium,
    delta: absDelta,
    gamma: put.gamma,
    theta: put.theta,
    vega: put.vega,
    iv: put.iv ?? put.impliedVolatility,
    collateralRequired: collateral,
    aroc: Math.round(aroc * 10) / 10,
    contractsAt100k: contracts,
    totalPremium: Math.round(totalPremium),
    capitalUtilization: Math.round(capitalUtilization * 10) / 10,
    currentPrice: quote.price,
    distanceFromPrice: Math.round(distPct * 10) / 10,
    volumeRatio: quote.volumeRatio,
    openInterest: put.openInterest,
    volume: put.volume,
    nearSupport,
    supportLevel: Math.round(supportLevel * 100) / 100,
    rsi: Math.round(rsi * 10) / 10,
    technicalScore,
    earningsWithinDTE,
    earningsDate,
    daysToEarnings,
    juiciness,
    priority,
    reasoning: reasons.join(" · "),
  };
}

// ---------------------------------------------------------------------------
// Juiciness score — weighted composite
// ---------------------------------------------------------------------------

function calcJuiciness(params: {
  aroc: number;
  absDelta: number;
  distPct: number;
  nearSupport: boolean;
  rsi: number;
  technicalScore: number;
  earningsWithinDTE: boolean;
  iv: number;
  openInterest: number;
  volumeRatio: number;
}): number {
  let score = 0;

  // AROC (0-30 pts) — the core metric
  score += Math.min(30, (params.aroc / 50) * 30);

  // Delta sweet spot (0-15 pts) — closer to 0.20 is ideal
  const deltaOptimality = 1 - Math.abs(params.absDelta - 0.20) / 0.15;
  score += Math.max(0, deltaOptimality * 15);

  // Distance from price (0-10 pts) — more OTM = safer
  score += Math.min(10, (params.distPct / 15) * 10);

  // Technical support (0-10 pts)
  if (params.nearSupport) score += 10;

  // Technical score from full analysis (0-10 pts)
  score += (params.technicalScore / 100) * 10;

  // Liquidity bonus (0-10 pts)
  if (params.openInterest >= 1000) score += 5;
  if (params.openInterest >= 5000) score += 3;
  if (params.volumeRatio >= 1.5) score += 2;

  // IV premium (0-10 pts) — higher IV = more premium
  score += Math.min(10, (params.iv / 100) * 10);

  // Earnings penalty — risk factor
  if (params.earningsWithinDTE) score -= 15;

  // RSI adjustment
  if (params.rsi > 70) score -= 5; // overbought = put more likely ITM
  if (params.rsi >= 40 && params.rsi <= 60) score += 5; // neutral RSI = stable

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Estimate delta when real Greeks aren't available */
function estimateDelta(put: OptionContract, price: number): number {
  const moneyness = (price - put.strike) / price;
  const timeFactor = Math.sqrt(put.dte / 365);
  // Rough Black-Scholes-ish approximation for OTM puts
  const rawDelta = -0.5 * Math.exp(-moneyness / (0.3 * timeFactor));
  return Math.max(-0.50, Math.min(-0.05, rawDelta));
}

/** Run promises in batches to avoid rate limiting */
async function settledBatch<T>(
  promises: Promise<T>[],
  batchSize: number
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < promises.length; i += batchSize) {
    const batch = promises.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }
    // Small delay between batches to respect rate limits
    if (i + batchSize < promises.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return results;
}
