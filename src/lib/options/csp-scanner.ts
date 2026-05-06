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
  catalyst: string; // one-liner on WHY this pick made the list today
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

  // Catalyst — a smart one-liner on WHY this pick is interesting today
  const catalyst = generateCatalyst(quote, technicals, earnings, put, aroc, nearSupport, supportLevel, distPct);

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
    catalyst,
  };
}

// ---------------------------------------------------------------------------
// Catalyst — smart one-liner on why this pick stands out today
// ---------------------------------------------------------------------------

function generateCatalyst(
  quote: QuoteData,
  technicals: TechnicalSignals | null,
  earnings: EarningsEvent | null,
  put: OptionContract,
  aroc: number,
  nearSupport: boolean,
  supportLevel: number,
  distPct: number
): string {
  // Priority-ordered: pick the most compelling single reason
  const iv = put.iv ?? put.impliedVolatility;

  // Earnings-driven IV pump
  if (earnings && earnings.daysUntil >= 0 && earnings.daysUntil <= put.dte) {
    return `Elevated IV from earnings in ${earnings.daysUntil}d — premium inflated, ${aroc.toFixed(0)}% AROC if it stays above $${put.strike}`;
  }

  // RSI oversold bounce play
  if (technicals && technicals.rsi14 < 35) {
    return `RSI oversold at ${technicals.rsi14} — selling into fear at ${distPct.toFixed(0)}% below price, likely bounce territory`;
  }

  // Bollinger squeeze — breakout imminent, IV expanding
  if (technicals?.bbSqueeze) {
    return `Bollinger squeeze active — IV expanding, premium rich at ${(iv * 100).toFixed(0)}% IV for a ${put.dte}d hold`;
  }

  // Strong trend + support strike
  if (nearSupport && technicals?.goldenCross) {
    return `Golden cross trend with strike at $${supportLevel.toFixed(0)} support — strong floor, ${aroc.toFixed(0)}% AROC`;
  }

  // Near support without golden cross
  if (nearSupport) {
    return `Strike sits on $${supportLevel.toFixed(0)} support level — technical floor adds safety to ${aroc.toFixed(0)}% yield`;
  }

  // High volume spike — something is happening
  if (quote.volumeRatio >= 2.5) {
    return `${quote.volumeRatio.toFixed(1)}x volume spike today — unusual activity driving up premium to ${aroc.toFixed(0)}% AROC`;
  }

  // Near 52-week low — contrarian premium play
  if (quote.price < quote.fiftyTwoWeekLow * 1.15) {
    return `Trading within 15% of 52w low — fear premium elevated, ${distPct.toFixed(0)}% OTM cushion at ${aroc.toFixed(0)}% yield`;
  }

  // MACD bullish crossover
  if (technicals?.macdCross === "bullish") {
    return `MACD just crossed bullish — momentum shifting up, selling puts into the trend at ${aroc.toFixed(0)}% AROC`;
  }

  // Above all MAs — stable uptrend
  if (technicals?.above50sma && technicals?.above200sma) {
    return `Stable uptrend above all major MAs — low risk of assignment, collecting ${aroc.toFixed(0)}% annualized`;
  }

  // High IV general
  if (iv > 0.5) {
    return `IV at ${(iv * 100).toFixed(0)}% pumping premium — ${aroc.toFixed(0)}% AROC with ${distPct.toFixed(0)}% downside cushion`;
  }

  // Good AROC fallback
  if (aroc >= 30) {
    return `${aroc.toFixed(0)}% AROC stands out — strong risk/reward at ${distPct.toFixed(0)}% OTM with ${put.dte}d to expiry`;
  }

  // Generic but specific
  return `${distPct.toFixed(0)}% OTM safety buffer with ${aroc.toFixed(0)}% annualized return — solid income play on ${quote.name}`;
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
// Single-ticker scan (for ticker detail pages)
// ---------------------------------------------------------------------------

export async function scanTickerCSPs(
  symbol: string,
  capital: number = 100_000
): Promise<CSPHunterCandidate[]> {
  const quotes = await getQuotes([symbol]);
  const quote = quotes[0];
  if (!quote || quote.price <= 0) return [];

  const now = new Date();
  const expirations = await tradierGetExpirations(symbol);
  const targetExps = expirations.filter((exp) => {
    const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return dte >= 7 && dte <= 45; // wider range for single-ticker view
  });

  if (targetExps.length === 0) return [];

  let earnings: EarningsEvent | null = null;
  try {
    const cal = await getEarningsCalendar([symbol]);
    earnings = cal[0] ?? null;
  } catch { /* ignore */ }

  const [technicals, ...chains] = await Promise.all([
    analyzeTechnicals(symbol, quote).catch(() => null),
    ...targetExps.map((exp) => tradierGetOptionsChain(symbol, exp).catch(() => null)),
  ]);

  const candidates: CSPHunterCandidate[] = [];
  for (const chain of chains) {
    if (!chain) continue;
    const puts = chain.puts.filter((p) => {
      if (p.inTheMoney || p.mid <= 0.05 || p.openInterest < 10) return false;
      const absDelta = Math.abs(p.delta ?? estimateDelta(p, quote.price));
      return absDelta >= 0.10 && absDelta <= 0.40; // wider delta range for detail view
    });
    for (const put of puts) {
      const c = buildCandidate(put, quote, technicals, earnings, capital);
      if (c.aroc >= 5) candidates.push(c); // lower threshold for detail view
    }
  }

  return candidates.sort((a, b) => b.juiciness - a.juiciness).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Call Buy Scanner — find high-conviction calls 60-120 DTE
// ---------------------------------------------------------------------------

export type CallBuyCandidate = {
  symbol: string;
  name: string;
  strike: number;
  expiry: string;
  dte: number;
  bid: number;
  ask: number;
  mid: number;
  costPerContract: number; // mid * 100
  delta: number;
  iv: number;
  currentPrice: number;
  distanceFromPrice: number; // % OTM (positive = OTM)
  openInterest: number;
  volume: number;
  // Capital sizing
  contractsAt100k: number;
  totalCost: number;
  capitalUtilization: number;
  // Outcome scenarios
  breakeven: number; // strike + mid
  outcome50pct: { price: number; profit: number; returnPct: number }; // if stock +50% of OTM distance
  outcome100pct: { price: number; profit: number; returnPct: number }; // if stock reaches strike
  outcomeHomeRun: { price: number; profit: number; returnPct: number }; // if stock +10% from current
  maxLoss: number; // total cost (100% loss)
  // Scoring
  score: number; // 0-100
  priority: "high" | "medium" | "low";
  catalyst: string;
  reasoning: string;
};

export type CallScanResult = {
  candidates: CallBuyCandidate[];
  scannedTickers: string[];
  scannedAt: string;
  capital: number;
  errors: string[];
};

export async function scanForCalls(
  userConfig: CSPScanConfig = {}
): Promise<CallScanResult> {
  const capital = userConfig.capital ?? 100_000;
  const tickers = userConfig.tickers ?? DEFAULT_UNIVERSE;
  const errors: string[] = [];
  const allCandidates: CallBuyCandidate[] = [];

  const quotes = await getQuotes(tickers);
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

  let earningsMap = new Map<string, EarningsEvent>();
  try {
    const earnings = await getEarningsCalendar(tickers);
    earningsMap = new Map(earnings.map((e) => [e.symbol, e]));
  } catch (e) {
    errors.push(`Earnings fetch failed: ${e}`);
  }

  const scanPromises = tickers.map(async (symbol) => {
    try {
      const quote = quoteMap.get(symbol);
      if (!quote || quote.price <= 0) return [];

      const expirations = await tradierGetExpirations(symbol);
      const now = new Date();
      const targetExps = expirations.filter((exp) => {
        const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return dte >= 60 && dte <= 120;
      });

      if (targetExps.length === 0) return [];

      const [technicals, ...chainResults] = await Promise.all([
        analyzeTechnicals(symbol, quote).catch(() => null),
        ...targetExps.map((exp) => tradierGetOptionsChain(symbol, exp).catch(() => null)),
      ]);

      const earnings = earningsMap.get(symbol);
      const candidates: CallBuyCandidate[] = [];

      for (const chain of chainResults) {
        if (!chain) continue;

        const filteredCalls = chain.calls.filter((c) => {
          if (c.inTheMoney) return false;
          if (c.mid <= 0.10) return false;
          if (c.openInterest < 50) return false;
          const absDelta = Math.abs(c.delta ?? 0.3);
          return absDelta >= 0.20 && absDelta <= 0.50; // slightly OTM to ATM
        });

        for (const call of filteredCalls) {
          const candidate = buildCallCandidate(call, quote, technicals, earnings ?? null, capital);
          if (candidate.score >= 40) {
            candidates.push(candidate);
          }
        }
      }

      // Best 1 per ticker
      return candidates.sort((a, b) => b.score - a.score).slice(0, 1);
    } catch (e) {
      errors.push(`${symbol}: ${e}`);
      return [];
    }
  });

  const results = await settledBatch(scanPromises, 5);
  for (const result of results) {
    allCandidates.push(...result);
  }

  allCandidates.sort((a, b) => b.score - a.score);

  return {
    candidates: allCandidates,
    scannedTickers: tickers,
    scannedAt: new Date().toISOString(),
    capital,
    errors,
  };
}

function buildCallCandidate(
  call: OptionContract,
  quote: QuoteData,
  technicals: TechnicalSignals | null,
  earnings: EarningsEvent | null,
  capital: number
): CallBuyCandidate {
  const costPerContract = call.mid * 100;
  const contracts = Math.floor(capital / costPerContract);
  const totalCost = costPerContract * contracts;
  const capitalUtilization = (totalCost / capital) * 100;
  const distPct = ((call.strike - quote.price) / quote.price) * 100;
  const absDelta = Math.abs(call.delta ?? 0.3);
  const breakeven = call.strike + call.mid;
  const iv = call.iv ?? call.impliedVolatility;

  // Outcome: stock reaches breakeven + 50% of OTM distance
  const halfwayPrice = quote.price + (call.strike - quote.price) * 0.5;
  const halfwayIntrinsic = Math.max(0, halfwayPrice - call.strike);
  const outcome50 = {
    price: Math.round(halfwayPrice * 100) / 100,
    profit: Math.round((halfwayIntrinsic - call.mid) * 100 * contracts),
    returnPct: Math.round(((halfwayIntrinsic - call.mid) / call.mid) * 100),
  };

  // Outcome: stock reaches strike (ATM at expiry)
  const atStrikeIntrinsic = 0; // worthless at exactly strike
  const outcome100 = {
    price: call.strike,
    profit: Math.round(-totalCost), // total loss at exactly strike
    returnPct: -100,
  };

  // Outcome: stock +10% from current price
  const homeRunPrice = quote.price * 1.10;
  const homeRunIntrinsic = Math.max(0, homeRunPrice - call.strike);
  const outcomeHR = {
    price: Math.round(homeRunPrice * 100) / 100,
    profit: Math.round((homeRunIntrinsic - call.mid) * 100 * contracts),
    returnPct: Math.round(((homeRunIntrinsic - call.mid) / call.mid) * 100),
  };

  const maxLoss = totalCost;

  // Scoring
  let score = 0;
  // Delta (0-20) — prefer 0.35-0.45 (slightly ITM lean)
  const deltaOpt = 1 - Math.abs(absDelta - 0.40) / 0.20;
  score += Math.max(0, deltaOpt * 20);
  // IV (0-15) — lower IV = cheaper options = better leverage
  score += Math.max(0, 15 - (iv * 100) * 0.2);
  // Technicals (0-20)
  score += ((technicals?.score ?? 50) / 100) * 20;
  // Momentum — bullish signals
  if (technicals?.macdCross === "bullish") score += 10;
  if (technicals?.above50sma && technicals?.above200sma) score += 5;
  if (technicals?.goldenCross) score += 5;
  // RSI — not overbought
  const rsi = technicals?.rsi14 ?? 50;
  if (rsi > 70) score -= 10;
  if (rsi >= 40 && rsi <= 60) score += 5;
  // Liquidity
  if (call.openInterest >= 1000) score += 5;
  if (call.openInterest >= 5000) score += 3;
  // Volume ratio
  if (quote.volumeRatio >= 2) score += 5;
  // Earnings catalyst
  if (earnings && earnings.daysUntil >= 0 && earnings.daysUntil <= call.dte) score += 5;
  // Penalize very high IV (overpaying)
  if (iv > 0.8) score -= 10;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const priority = score >= 70 ? "high" : score >= 50 ? "medium" : "low";

  // Catalyst
  let catalyst = "";
  if (technicals?.macdCross === "bullish") {
    catalyst = `MACD bullish crossover — momentum building, ${call.dte}d runway to ride the trend`;
  } else if (technicals?.goldenCross) {
    catalyst = `Golden cross in play — strong uptrend signal, ${distPct.toFixed(0)}% OTM with ${call.dte}d to run`;
  } else if (rsi < 35) {
    catalyst = `RSI oversold bounce setup — buying the dip with defined risk at $${call.strike}`;
  } else if (earnings && earnings.daysUntil >= 0 && earnings.daysUntil <= call.dte) {
    catalyst = `Earnings in ${earnings.daysUntil}d could be the catalyst — positioned for upside surprise`;
  } else if (quote.volumeRatio >= 2.5) {
    catalyst = `${quote.volumeRatio.toFixed(1)}x volume spike — unusual buying activity, something brewing`;
  } else if (technicals?.above50sma && technicals?.above200sma) {
    catalyst = `Above all MAs in sustained uptrend — riding momentum with leveraged upside`;
  } else if (iv < 0.3) {
    catalyst = `Low IV at ${(iv * 100).toFixed(0)}% — cheap options, high leverage if ${quote.symbol} moves`;
  } else {
    catalyst = `${distPct.toFixed(0)}% OTM with ${call.dte}d — leveraged bet on ${quote.name} upside`;
  }

  const reasons: string[] = [];
  reasons.push(`${quote.name} $${call.strike} call @ $${call.mid.toFixed(2)} (${call.dte}d)`);
  reasons.push(`Δ${absDelta.toFixed(2)}, ${distPct.toFixed(1)}% OTM, IV ${(iv * 100).toFixed(0)}%`);
  if (contracts > 0) {
    reasons.push(`${contracts} contracts = $${totalCost.toLocaleString()} total cost`);
    reasons.push(`If ${quote.symbol} +10%: ${outcomeHR.returnPct > 0 ? "+" : ""}${outcomeHR.returnPct}% ($${outcomeHR.profit.toLocaleString()})`);
  }
  reasons.push(`Max loss: $${maxLoss.toLocaleString()} (100% of premium)`);

  return {
    symbol: quote.symbol,
    name: quote.name,
    strike: call.strike,
    expiry: call.expiry,
    dte: call.dte,
    bid: call.bid,
    ask: call.ask,
    mid: call.mid,
    costPerContract,
    delta: absDelta,
    iv,
    currentPrice: quote.price,
    distanceFromPrice: Math.round(distPct * 10) / 10,
    openInterest: call.openInterest,
    volume: call.volume,
    contractsAt100k: contracts,
    totalCost: Math.round(totalCost),
    capitalUtilization: Math.round(capitalUtilization * 10) / 10,
    breakeven: Math.round(breakeven * 100) / 100,
    outcome50pct: outcome50,
    outcome100pct: outcome100,
    outcomeHomeRun: outcomeHR,
    maxLoss: Math.round(maxLoss),
    score,
    priority,
    catalyst,
    reasoning: reasons.join(" · "),
  };
}

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
