import yahooFinance from "yahoo-finance2";

export type QuoteData = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  marketCap: number;
  fiftyDayAvg: number;
  twoHundredDayAvg: number;
  above50sma: boolean;
  above200sma: boolean;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  earningsDate: string | null;
};

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.quote(symbol);
    if (!result || !result.regularMarketPrice) return null;

    const price = result.regularMarketPrice;
    const avgVol = result.averageDailyVolume3Month || result.averageDailyVolume10Day || 1;
    const vol = result.regularMarketVolume || 0;

    return {
      symbol: result.symbol,
      name: result.shortName || result.longName || symbol,
      price,
      change: result.regularMarketChange || 0,
      changePct: result.regularMarketChangePercent || 0,
      volume: vol,
      avgVolume: avgVol,
      volumeRatio: vol / avgVol,
      marketCap: result.marketCap || 0,
      fiftyDayAvg: result.fiftyDayAverage || 0,
      twoHundredDayAvg: result.twoHundredDayAverage || 0,
      above50sma: price > (result.fiftyDayAverage || 0),
      above200sma: price > (result.twoHundredDayAverage || 0),
      fiftyTwoWeekHigh: result.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: result.fiftyTwoWeekLow || 0,
      earningsDate: result.earningsTimestamp
        ? new Date(result.earningsTimestamp * 1000).toISOString().split("T")[0]
        : null,
    };
  } catch (e) {
    console.error(`Failed to fetch quote for ${symbol}:`, e);
    return null;
  }
}

export async function getQuotes(symbols: string[]): Promise<QuoteData[]> {
  const results = await Promise.allSettled(symbols.map(getQuote));
  return results
    .filter((r): r is PromiseFulfilledResult<QuoteData | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((q): q is QuoteData => q !== null);
}

export type OptionsChain = {
  expirations: string[];
  calls: OptionContract[];
  puts: OptionContract[];
};

export type OptionContract = {
  strike: number;
  expiry: string;
  dte: number;
  type: "call" | "put";
  bid: number;
  ask: number;
  mid: number;
  lastPrice: number;
  volume: number;
  openInterest: number;
  impliedVolatility: number;
  inTheMoney: boolean;
};

export async function getOptionsChain(symbol: string, expirationDate?: string): Promise<OptionsChain | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.options(symbol, expirationDate ? { date: new Date(expirationDate) } : undefined);
    if (!result) return null;

    const now = new Date();
    const expirations = result.expirationDates?.map((d: Date) => d.toISOString().split("T")[0]) || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapContracts = (contracts: any[], type: "call" | "put"): OptionContract[] => {
      return contracts.map((c) => {
        const expiry = c.expiration ? new Date(c.expiration).toISOString().split("T")[0] : "";
        const expiryDate = new Date(expiry);
        const dte = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          strike: c.strike || 0,
          expiry,
          dte,
          type,
          bid: c.bid || 0,
          ask: c.ask || 0,
          mid: ((c.bid || 0) + (c.ask || 0)) / 2,
          lastPrice: c.lastPrice || 0,
          volume: c.volume || 0,
          openInterest: c.openInterest || 0,
          impliedVolatility: c.impliedVolatility || 0,
          inTheMoney: c.inTheMoney || false,
        };
      });
    };

    const allCalls: OptionContract[] = [];
    const allPuts: OptionContract[] = [];

    for (const opt of result.options) {
      allCalls.push(...mapContracts(opt.calls, "call"));
      allPuts.push(...mapContracts(opt.puts, "put"));
    }

    return { expirations, calls: allCalls, puts: allPuts };
  } catch (e) {
    console.error(`Failed to fetch options for ${symbol}:`, e);
    return null;
  }
}

export async function getAllOptionsChains(symbol: string): Promise<OptionsChain | null> {
  try {
    // First get the list of expirations
    const initial = await getOptionsChain(symbol);
    if (!initial) return null;

    // Filter to expirations we care about for PMCC:
    // Short calls: 20-60 DTE
    // LEAPS: 180+ DTE
    const now = new Date();
    const relevantExpirations = initial.expirations.filter((exp) => {
      const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return (dte >= 20 && dte <= 60) || dte >= 180;
    });

    // Fetch chains for each relevant expiration
    const chains = await Promise.allSettled(
      relevantExpirations.map((exp) => getOptionsChain(symbol, exp))
    );

    const allCalls: OptionContract[] = [];
    const allPuts: OptionContract[] = [];

    for (const result of chains) {
      if (result.status === "fulfilled" && result.value) {
        allCalls.push(...result.value.calls);
        allPuts.push(...result.value.puts);
      }
    }

    return {
      expirations: relevantExpirations,
      calls: allCalls,
      puts: allPuts,
    };
  } catch (e) {
    console.error(`Failed to fetch all options for ${symbol}:`, e);
    return null;
  }
}
