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
  conviction: "STRONG" | "MODERATE" | "SPECULATIVE";
  reasoning: string;
  catalyst: string; // 1-2 plain-English sentences on WHY this pick, with context
  risk: string; // what invalidates the setup, in plain English
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

export const DEFAULT_UNIVERSE = [
  // Mega-cap tech
  "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA",
  // Semi & growth
  "AMD", "INTC", "MU", "QCOM", "AVGO", "MRVL", "ARM", "SMCI", "TSM", "ANET", "CRDO",
  // Cloud / SaaS / AI
  "CRM", "NOW", "SNOW", "PLTR", "NET", "DDOG", "CRWD", "MDB", "S", "AI", "PATH",
  // High-momentum names users care about
  "NBIS", "SNDK", "RKLB", "ASTS", "LUNR", "RDW",
  // Fintech & growth
  "SOFI", "COIN", "HOOD", "AFRM", "UPST", "MELI",
  // Nuclear / energy theme
  "OKLO", "SMR", "NNE", "LEU", "CCJ", "UEC", "VST", "CEG",
  // Quantum
  "IONQ", "RGTI", "QBTS", "QUBT",
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

  // Thesis — plain-English WHY with enough context to act on, plus what invalidates it
  const { thesis: catalyst, risk } = generateThesis(quote, technicals, earnings, put, aroc, nearSupport, supportLevel, distPct);
  const conviction: "STRONG" | "MODERATE" | "SPECULATIVE" =
    juiciness >= 75 ? "STRONG" : juiciness >= 50 ? "MODERATE" : "SPECULATIVE";

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
    conviction,
    reasoning: reasons.join(" · "),
    catalyst,
    risk,
  };
}

// ---------------------------------------------------------------------------
// Thesis — plain-English "why this pick" with enough context to act on.
// Two sentences: what's happening (with the jargon explained inline), and
// what you get paid / what the trade actually is. Risk = what invalidates it.
// ---------------------------------------------------------------------------

function generateThesis(
  quote: QuoteData,
  technicals: TechnicalSignals | null,
  earnings: EarningsEvent | null,
  put: OptionContract,
  aroc: number,
  nearSupport: boolean,
  supportLevel: number,
  distPct: number
): { thesis: string; risk: string } {
  const iv = put.iv ?? put.impliedVolatility;
  const sym = quote.symbol;
  const price = quote.price.toFixed(2);
  // The standard payoff sentence — every thesis ends with what you actually get.
  const payoff = `You collect $${(put.mid * 100).toFixed(0)} per contract now, yours to keep as long as ${sym} stays above $${put.strike} through expiry (${put.dte} days) — that's ${aroc.toFixed(0)}% annualized on the cash you set aside.`;
  const assignRisk = `If ${sym} closes below $${put.strike} at expiry you'll be assigned: you buy 100 shares per contract at $${put.strike} (effectively $${(put.strike - put.mid).toFixed(2)} after the premium). Only sell this if you'd be happy owning ${sym} there.`;

  // Earnings-driven IV pump
  if (earnings && earnings.daysUntil >= 0 && earnings.daysUntil <= put.dte) {
    return {
      thesis: `${quote.name} reports earnings in ${earnings.daysUntil} days, and option sellers get paid extra for that uncertainty — premiums are inflated well above normal. ${payoff}`,
      risk: `Earnings is the risk: a bad report can gap the stock straight through your strike overnight with no chance to react. ${assignRisk}`,
    };
  }

  // RSI oversold bounce play
  if (technicals && technicals.rsi14 < 35) {
    return {
      thesis: `${sym} has been sold hard lately — its RSI is ${technicals.rsi14.toFixed(0)}, a "momentum thermometer" where under 30 means the selling is likely overdone and due for a pause or bounce. Selling a put here means being paid for fear: ${payoff}`,
      risk: `Oversold can stay oversold — if the selling has a real cause (bad news, guidance cut), the bounce never comes. ${assignRisk}`,
    };
  }

  // Bollinger squeeze — breakout imminent, IV expanding
  if (technicals?.bbSqueeze) {
    return {
      thesis: `${sym} has been coiling in an unusually tight price range — a "Bollinger squeeze," which often ends with a sharp move in either direction, so option premiums are rich right now (IV ${(iv * 100).toFixed(0)}%). ${payoff}`,
      risk: `A squeeze breaks up OR down with roughly equal odds — if it resolves downward, ${sym} can slide fast. ${assignRisk}`,
    };
  }

  // Strong trend + support strike
  if (nearSupport && technicals?.goldenCross) {
    return {
      thesis: `${sym} is in a confirmed uptrend (its 50-day average price crossed above the 200-day — a "golden cross," one of the classic strength signals) and your $${put.strike} strike sits right on the $${supportLevel.toFixed(0)} level where buyers have repeatedly stepped in. ${payoff}`,
      risk: `Uptrends fail at support breaks: if ${sym} closes decisively below $${supportLevel.toFixed(0)}, the floor is gone and assignment becomes likely. ${assignRisk}`,
    };
  }

  // Near support without golden cross
  if (nearSupport) {
    return {
      thesis: `Your $${put.strike} strike sits on ${sym}'s $${supportLevel.toFixed(0)} support — a price where buyers have stepped in repeatedly over the past few months, giving the trade a technical floor beneath it. ${payoff}`,
      risk: `Support is a tendency, not a guarantee — a market-wide selloff or bad news slices through old floors. ${assignRisk}`,
    };
  }

  // High volume spike — something is happening
  if (quote.volumeRatio >= 2.5) {
    return {
      thesis: `${sym} is trading ${quote.volumeRatio.toFixed(1)}x its normal volume today — that much activity usually means news or big-money repositioning, and it pumps option premiums. ${payoff}`,
      risk: `You're selling into an event you may not fully understand yet — check the news on ${sym} before entering. ${assignRisk}`,
    };
  }

  // Near 52-week low — contrarian premium play
  if (quote.price < quote.fiftyTwoWeekLow * 1.15) {
    return {
      thesis: `${sym} at $${price} is within 15% of its 52-week low, and beaten-down stocks carry a fear premium — sellers of puts get paid extra while pessimism is high. Your strike adds another ${distPct.toFixed(0)}% cushion below an already-depressed price. ${payoff}`,
      risk: `Cheap can get cheaper — stocks near lows are often there for a reason, and "the bottom" is only visible in hindsight. ${assignRisk}`,
    };
  }

  // MACD bullish crossover
  if (technicals?.macdCross === "bullish") {
    return {
      thesis: `${sym}'s momentum just flipped positive (a MACD bullish crossover — short-term price momentum overtaking the longer trend, often an early sign a move up is starting). Selling a put ${distPct.toFixed(0)}% below the price rides that shift while leaving room to be wrong. ${payoff}`,
      risk: `Momentum signals fail often in choppy markets — a crossover is a lean, not a lock. ${assignRisk}`,
    };
  }

  // Above all MAs — stable uptrend
  if (technicals?.above50sma && technicals?.above200sma) {
    return {
      thesis: `${sym} is trading above both its 50-day and 200-day average prices — the definition of a stable uptrend, which makes a strike ${distPct.toFixed(0)}% below the market unlikely to be hit. This is the boring, repeatable version of the trade. ${payoff}`,
      risk: `The premium is modest precisely because the setup is safe — the main risk is an abrupt trend change on macro news. ${assignRisk}`,
    };
  }

  // High IV general
  if (iv > 0.5) {
    return {
      thesis: `${sym}'s options are pricing in big swings (implied volatility ${(iv * 100).toFixed(0)}% — the market expects moves roughly ±${((iv / Math.sqrt(252 / put.dte)) * 100).toFixed(0)}% over your ${put.dte}-day window), and volatility is what put sellers get paid for. ${payoff}`,
      risk: `High IV exists because the market genuinely expects turbulence — expect the position to swing against you at some point even if it wins. ${assignRisk}`,
    };
  }

  // Good AROC fallback
  if (aroc >= 30) {
    return {
      thesis: `The math is the story here: ${aroc.toFixed(0)}% annualized for agreeing to buy ${quote.name} ${distPct.toFixed(0)}% below today's price is a strong rate for the risk taken. ${payoff}`,
      risk: `No special technical edge on this one — you're relying on the cushion and the yield, so size it modestly. ${assignRisk}`,
    };
  }

  // Generic but specific
  return {
    thesis: `A steady income play: ${sym} would have to fall ${distPct.toFixed(0)}% in ${put.dte} days before this trade is even threatened. ${payoff}`,
    risk: assignRisk,
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
  conviction: "STRONG" | "MODERATE" | "SPECULATIVE";
  catalyst: string;
  risk: string;
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
          // Max 7% OTM so a 10% stock move is solidly profitable
          const otmPct = ((c.strike - quote.price) / quote.price) * 100;
          if (otmPct > 7) return false;
          const absDelta = Math.abs(c.delta ?? 0.3);
          return absDelta >= 0.30 && absDelta <= 0.55; // near ATM
        });

        for (const call of filteredCalls) {
          const candidate = buildCallCandidate(call, quote, technicals, earnings ?? null, capital);
          // Only keep picks where +10% stock move is profitable
          if (candidate.score >= 40 && candidate.outcome100pct.returnPct > 0) {
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

  // Outcome: stock +5% from current price
  const modestPrice = quote.price * 1.05;
  const modestIntrinsic = Math.max(0, modestPrice - call.strike);
  const outcome50 = {
    price: Math.round(modestPrice * 100) / 100,
    profit: Math.round((modestIntrinsic - call.mid) * 100 * contracts),
    returnPct: Math.round(((modestIntrinsic - call.mid) / call.mid) * 100),
  };

  // Outcome: stock +10% from current price
  const homeRunPrice = quote.price * 1.10;
  const homeRunIntrinsic = Math.max(0, homeRunPrice - call.strike);
  const outcome100 = {
    price: Math.round(homeRunPrice * 100) / 100,
    profit: Math.round((homeRunIntrinsic - call.mid) * 100 * contracts),
    returnPct: Math.round(((homeRunIntrinsic - call.mid) / call.mid) * 100),
  };

  // Outcome: stock +20% from current price
  const bigMovePrice = quote.price * 1.20;
  const bigMoveIntrinsic = Math.max(0, bigMovePrice - call.strike);
  const outcomeHR = {
    price: Math.round(bigMovePrice * 100) / 100,
    profit: Math.round((bigMoveIntrinsic - call.mid) * 100 * contracts),
    returnPct: Math.round(((bigMoveIntrinsic - call.mid) / call.mid) * 100),
  };

  const maxLoss = totalCost;

  // Scoring
  let score = 0;
  // Profitability on +10% move (0-25) — the most important factor
  if (outcome100.returnPct > 0) {
    score += Math.min(25, outcome100.returnPct / 4);
  } else {
    score -= 20; // heavily penalize if +10% move still loses
  }
  // Delta (0-15) — prefer 0.40-0.50 (near ATM)
  const deltaOpt = 1 - Math.abs(absDelta - 0.45) / 0.15;
  score += Math.max(0, deltaOpt * 15);
  // IV (0-10) — lower IV = cheaper options = better leverage
  score += Math.max(0, 10 - (iv * 100) * 0.15);
  // Technicals (0-15)
  score += ((technicals?.score ?? 50) / 100) * 15;
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

  // Thesis + risk in plain English. The leverage sentence is the key teaching
  // moment: a modest stock move produces an outsized option move.
  const leverage = `This is the leverage play: if ${quote.symbol} rises just 10% to $${outcome100.price}, this call returns ${outcome100.returnPct > 0 ? "+" : ""}${outcome100.returnPct}% — the option amplifies the stock's move several times over.`;
  const callRisk = `The trade-off for that leverage: if ${quote.symbol} is below $${call.strike} in ${call.dte} days, the call expires worthless and you lose 100% of the $${totalCost.toLocaleString()} paid. Never size these like stock.`;

  let catalyst = "";
  if (technicals?.macdCross === "bullish") {
    catalyst = `${quote.symbol}'s momentum just turned up (a MACD bullish crossover — short-term momentum overtaking the longer trend, often an early entry signal), and this call gives you ${call.dte} days for that move to play out. ${leverage}`;
  } else if (technicals?.goldenCross) {
    catalyst = `${quote.symbol} is in a confirmed uptrend — its 50-day average price recently crossed above the 200-day (a "golden cross," historically one of the more reliable strength signals). Buying a call rides that trend with a fraction of the capital of owning shares. ${leverage}`;
  } else if (rsi < 35) {
    catalyst = `${quote.symbol} has been sold hard — RSI at ${rsi.toFixed(0)} says the selling is likely overdone (below 30 is classic "oversold"). A call is the defined-risk way to bet on the bounce: your maximum loss is capped at the premium no matter how wrong you are. ${leverage}`;
  } else if (earnings && earnings.daysUntil >= 0 && earnings.daysUntil <= call.dte) {
    catalyst = `${quote.name} reports earnings in ${earnings.daysUntil} days — a concrete catalyst inside this option's ${call.dte}-day life. A strong report can rerate the stock in a single session. ${leverage}`;
  } else if (quote.volumeRatio >= 2.5) {
    catalyst = `${quote.symbol} is trading ${quote.volumeRatio.toFixed(1)}x its normal volume today — that kind of activity usually means institutions are repositioning, and calls let you follow the move with defined risk. ${leverage}`;
  } else if (technicals?.above50sma && technicals?.above200sma) {
    catalyst = `${quote.symbol} is above both its 50-day and 200-day average prices — a steady, established uptrend. This call is the patient version of the trade: ${call.dte} days for the trend to keep doing what it's been doing. ${leverage}`;
  } else if (iv < 0.3) {
    catalyst = `${quote.symbol}'s options are unusually cheap right now (implied volatility only ${(iv * 100).toFixed(0)}% — the market expects small moves, so you pay little for the right to a big one). Cheap options are when buying calls makes the most sense. ${leverage}`;
  } else {
    catalyst = `A defined-risk bet on ${quote.name} upside: ${call.dte} days of exposure for $${totalCost.toLocaleString()}, with losses capped at that premium no matter what. ${leverage}`;
  }
  const risk = callRisk;
  const conviction: "STRONG" | "MODERATE" | "SPECULATIVE" =
    score >= 70 ? "STRONG" : score >= 50 ? "MODERATE" : "SPECULATIVE";

  const reasons: string[] = [];
  reasons.push(`${quote.name} $${call.strike} call @ $${call.mid.toFixed(2)} (${call.dte}d)`);
  reasons.push(`Δ${absDelta.toFixed(2)}, ${distPct.toFixed(1)}% OTM, IV ${(iv * 100).toFixed(0)}%`);
  if (contracts > 0) {
    reasons.push(`${contracts} contracts = $${totalCost.toLocaleString()} total cost`);
    reasons.push(`If ${quote.symbol} +10%: ${outcome100.returnPct > 0 ? "+" : ""}${outcome100.returnPct}% ($${outcome100.profit.toLocaleString()})`);
    reasons.push(`If ${quote.symbol} +20%: +${outcomeHR.returnPct}% ($${outcomeHR.profit.toLocaleString()})`);
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
    conviction,
    catalyst,
    risk,
    reasoning: reasons.join(" · "),
  };
}

// ---------------------------------------------------------------------------
// LEAPS Scanner — long-dated calls 6-18 months out
// ---------------------------------------------------------------------------

export type LeapsCandidate = CallBuyCandidate; // Same shape, different DTE range

export type LeapsScanResult = {
  candidates: LeapsCandidate[];
  scannedTickers: string[];
  scannedAt: string;
  capital: number;
  errors: string[];
};

export async function scanForLeaps(
  userConfig: CSPScanConfig = {}
): Promise<LeapsScanResult> {
  const capital = userConfig.capital ?? 100_000;
  const tickers = userConfig.tickers ?? DEFAULT_UNIVERSE;
  const errors: string[] = [];
  const allCandidates: LeapsCandidate[] = [];

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
        return dte >= 180 && dte <= 540; // 6-18 months
      });

      if (targetExps.length === 0) return [];

      const [technicals, ...chainResults] = await Promise.all([
        analyzeTechnicals(symbol, quote).catch(() => null),
        ...targetExps.map((exp) => tradierGetOptionsChain(symbol, exp).catch(() => null)),
      ]);

      const earnings = earningsMap.get(symbol);
      const candidates: LeapsCandidate[] = [];

      for (const chain of chainResults) {
        if (!chain) continue;

        const filteredCalls = chain.calls.filter((c) => {
          if (c.inTheMoney) return false;
          if (c.mid <= 0.20) return false;
          if (c.openInterest < 20) return false;
          // Max 10% OTM for LEAPS (wider than calls since more time)
          const otmPct = ((c.strike - quote.price) / quote.price) * 100;
          if (otmPct > 10) return false;
          const absDelta = Math.abs(c.delta ?? 0.3);
          return absDelta >= 0.25 && absDelta <= 0.55;
        });

        for (const call of filteredCalls) {
          const candidate = buildCallCandidate(call, quote, technicals, earnings ?? null, capital);
          // Only keep picks where +10% stock move is profitable
          if (candidate.score >= 35 && candidate.outcomeHomeRun.returnPct > 0) {
            candidates.push(candidate);
          }
        }
      }

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
