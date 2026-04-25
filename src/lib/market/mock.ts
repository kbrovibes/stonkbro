import { QuoteData, OptionContract, OptionsChain } from "./types";

/**
 * Mock market data provider — used when TRADIER_API_TOKEN is not set.
 * Returns realistic-looking data so the app is functional for demo/development.
 */

// Seed-based pseudo-random for consistent mock data per symbol
function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = ((hash << 5) - hash) + symbol.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

const MOCK_STOCKS: Record<string, { name: string; price: number; sector: string }> = {
  NVDA: { name: "NVIDIA Corporation", price: 135.40, sector: "Technology" },
  AAPL: { name: "Apple Inc.", price: 211.21, sector: "Technology" },
  MSFT: { name: "Microsoft Corporation", price: 454.27, sector: "Technology" },
  TSLA: { name: "Tesla Inc.", price: 284.95, sector: "Consumer Discretionary" },
  AMD: { name: "Advanced Micro Devices", price: 113.76, sector: "Technology" },
  PLTR: { name: "Palantir Technologies", price: 117.14, sector: "Technology" },
  META: { name: "Meta Platforms Inc.", price: 594.39, sector: "Technology" },
  AMZN: { name: "Amazon.com Inc.", price: 195.87, sector: "Consumer Discretionary" },
  GOOGL: { name: "Alphabet Inc.", price: 165.17, sector: "Technology" },
  NFLX: { name: "Netflix Inc.", price: 1098.81, sector: "Communication Services" },
  SOFI: { name: "SoFi Technologies", price: 14.92, sector: "Financials" },
  COIN: { name: "Coinbase Global", price: 209.20, sector: "Financials" },
  RKLB: { name: "Rocket Lab USA", price: 26.78, sector: "Industrials" },
  SMCI: { name: "Super Micro Computer", price: 37.22, sector: "Technology" },
  CELH: { name: "Celsius Holdings", price: 34.32, sector: "Consumer Staples" },
  NOW: { name: "ServiceNow Inc.", price: 932.51, sector: "Technology" },
};

function getMockPrice(symbol: string): { price: number; name: string } {
  const stock = MOCK_STOCKS[symbol];
  if (stock) return { price: stock.price, name: stock.name };
  // Generate a consistent price for unknown symbols
  const h = hashSymbol(symbol);
  return { price: 50 + (h % 500), name: `${symbol} Inc.` };
}

export async function mockGetQuote(symbol: string): Promise<QuoteData | null> {
  const { price, name } = getMockPrice(symbol);
  const h = hashSymbol(symbol);
  const changePct = ((h % 1000) / 100 - 5); // -5% to +5%
  const change = price * changePct / 100;

  return {
    symbol,
    name,
    price,
    change,
    changePct,
    volume: 10_000_000 + (h % 50_000_000),
    avgVolume: 15_000_000 + (h % 30_000_000),
    volumeRatio: 0.5 + (h % 300) / 100,
    marketCap: price * 1_000_000_000,
    fiftyDayAvg: price * 0.95,
    twoHundredDayAvg: price * 0.88,
    above50sma: price > price * 0.95,
    above200sma: price > price * 0.88,
    fiftyTwoWeekHigh: price * 1.25,
    fiftyTwoWeekLow: price * 0.6,
    earningsDate: null,
  };
}

export async function mockGetQuotes(symbols: string[]): Promise<QuoteData[]> {
  const results = await Promise.all(symbols.map(mockGetQuote));
  return results.filter((q): q is QuoteData => q !== null);
}

function generateMockOptions(symbol: string, price: number): OptionsChain {
  const now = new Date();
  const calls: OptionContract[] = [];
  const puts: OptionContract[] = [];
  const expirations: string[] = [];

  // Generate expirations: weekly for next 8 weeks, then monthly for 18 months
  for (let weeks = 3; weeks <= 8; weeks++) {
    const d = new Date(now);
    d.setDate(d.getDate() + weeks * 7);
    // Set to Friday
    d.setDate(d.getDate() + (5 - d.getDay()));
    expirations.push(d.toISOString().split("T")[0]);
  }
  for (let months = 3; months <= 18; months += 1) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    d.setDate(15); // Mid-month approx
    // Set to third Friday
    d.setDate(1);
    let fridayCount = 0;
    while (fridayCount < 3) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 5) fridayCount++;
    }
    expirations.push(d.toISOString().split("T")[0]);
  }

  for (const exp of expirations) {
    const expiryDate = new Date(exp);
    const dte = Math.max(1, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Generate strikes around current price
    const strikeStep = price > 500 ? 10 : price > 100 ? 5 : price > 50 ? 2.5 : 1;
    const baseStrike = Math.round(price / strikeStep) * strikeStep;

    for (let offset = -10; offset <= 10; offset++) {
      const strike = baseStrike + offset * strikeStep;
      if (strike <= 0) continue;

      const moneyness = price / strike;
      const timeVal = Math.sqrt(dte / 365);

      // Call pricing (rough Black-Scholes approximation)
      const callIntrinsic = Math.max(0, price - strike);
      const callTimeValue = price * 0.03 * timeVal * (1 + Math.abs(1 - moneyness));
      const callMid = callIntrinsic + callTimeValue;
      const callDelta = Math.min(0.99, Math.max(0.01, 0.5 + (moneyness - 1) * 2.5 / timeVal));

      calls.push({
        strike,
        expiry: exp,
        dte,
        type: "call",
        bid: Math.max(0.01, callMid * 0.95),
        ask: callMid * 1.05,
        mid: Math.max(0.01, callMid),
        lastPrice: callMid,
        volume: 100 + (hashSymbol(symbol + strike + "c") % 5000),
        openInterest: 500 + (hashSymbol(symbol + strike + "co") % 20000),
        impliedVolatility: 0.25 + (hashSymbol(symbol) % 40) / 100,
        inTheMoney: price > strike,
        delta: callDelta,
        gamma: 0.02 / timeVal,
        theta: -(callTimeValue / dte) * (dte > 30 ? 0.5 : 1),
        vega: callTimeValue * 0.1,
        iv: 0.25 + (hashSymbol(symbol) % 40) / 100,
      });

      // Put pricing
      const putIntrinsic = Math.max(0, strike - price);
      const putTimeValue = price * 0.03 * timeVal * (1 + Math.abs(1 - moneyness));
      const putMid = putIntrinsic + putTimeValue;
      const putDelta = -(1 - callDelta);

      puts.push({
        strike,
        expiry: exp,
        dte,
        type: "put",
        bid: Math.max(0.01, putMid * 0.95),
        ask: putMid * 1.05,
        mid: Math.max(0.01, putMid),
        lastPrice: putMid,
        volume: 80 + (hashSymbol(symbol + strike + "p") % 4000),
        openInterest: 400 + (hashSymbol(symbol + strike + "po") % 15000),
        impliedVolatility: 0.25 + (hashSymbol(symbol) % 40) / 100,
        inTheMoney: price < strike,
        delta: putDelta,
        gamma: 0.02 / timeVal,
        theta: -(putTimeValue / dte) * (dte > 30 ? 0.5 : 1),
        vega: putTimeValue * 0.1,
        iv: 0.27 + (hashSymbol(symbol) % 40) / 100,
      });
    }
  }

  return { expirations, calls, puts };
}

export async function mockGetOptionsChain(symbol: string, expirationDate?: string): Promise<OptionsChain | null> {
  const { price } = getMockPrice(symbol);
  const full = generateMockOptions(symbol, price);

  if (expirationDate) {
    return {
      expirations: full.expirations,
      calls: full.calls.filter((c) => c.expiry === expirationDate),
      puts: full.puts.filter((p) => p.expiry === expirationDate),
    };
  }

  return full;
}

export async function mockGetAllOptionsChains(symbol: string): Promise<OptionsChain | null> {
  const { price } = getMockPrice(symbol);
  const full = generateMockOptions(symbol, price);

  // Filter to relevant expirations like the real provider
  const now = new Date();
  const relevant = full.expirations.filter((exp) => {
    const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return (dte >= 20 && dte <= 60) || dte >= 180;
  });

  return {
    expirations: relevant,
    calls: full.calls.filter((c) => relevant.includes(c.expiry)),
    puts: full.puts.filter((p) => relevant.includes(p.expiry)),
  };
}
