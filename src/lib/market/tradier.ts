import { QuoteData, OptionContract, OptionsChain } from "./types";
import { tradierFetch } from "./tradier-client";

export async function tradierGetQuote(symbol: string): Promise<QuoteData | null> {
  try {
    const res = await tradierFetch(`/markets/quotes?symbols=${symbol}`, { revalidate: 60 });
    if (!res) return null;

    const data = await res.json();
    const q = data.quotes?.quote;
    if (!q) return null;

    const price = q.last ?? q.prevclose ?? 0;
    const prevClose = q.prevclose ?? price;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
    const vol = q.volume ?? 0;
    const avgVol = q.average_volume ?? 1;

    return {
      symbol: q.symbol,
      name: q.description || symbol,
      price,
      change,
      changePct,
      volume: vol,
      avgVolume: avgVol,
      volumeRatio: avgVol > 0 ? vol / avgVol : 0,
      marketCap: 0, // Tradier doesn't provide market cap in quotes
      fiftyDayAvg: 0, // Would need historical data API
      twoHundredDayAvg: 0,
      above50sma: true, // Default to true, will be refined with historical data
      above200sma: true,
      fiftyTwoWeekHigh: q.week_52_high ?? 0,
      fiftyTwoWeekLow: q.week_52_low ?? 0,
      earningsDate: null, // Tradier doesn't provide earnings date in quotes
    };
  } catch (e) {
    console.error(`Tradier quote error for ${symbol}:`, e);
    return null;
  }
}

export async function tradierGetQuotes(symbols: string[]): Promise<QuoteData[]> {
  if (symbols.length === 0) return [];

  try {
    const res = await tradierFetch(`/markets/quotes?symbols=${symbols.join(",")}`, { revalidate: 60 });
    if (!res) return [];

    const data = await res.json();
    const quotes = data.quotes?.quote;
    if (!quotes) return [];

    // Tradier returns a single object if only one symbol, array if multiple
    const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return quoteArray.filter((q: any) => q && q.last != null).map((q: any) => {
      const price = q.last ?? q.prevclose ?? 0;
      const prevClose = q.prevclose ?? price;
      const change = price - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
      const vol = q.volume ?? 0;
      const avgVol = q.average_volume ?? 1;

      return {
        symbol: q.symbol,
        name: q.description || q.symbol,
        price,
        change,
        changePct,
        volume: vol,
        avgVolume: avgVol,
        volumeRatio: avgVol > 0 ? vol / avgVol : 0,
        marketCap: 0,
        fiftyDayAvg: 0,
        twoHundredDayAvg: 0,
        above50sma: true,
        above200sma: true,
        fiftyTwoWeekHigh: q.week_52_high ?? 0,
        fiftyTwoWeekLow: q.week_52_low ?? 0,
        earningsDate: null,
      };
    });
  } catch (e) {
    console.error("Tradier batch quote error:", e);
    return [];
  }
}

export async function tradierGetExpirations(symbol: string): Promise<string[]> {
  try {
    const res = await tradierFetch(`/markets/options/expirations?symbol=${symbol}`);
    if (!res) return [];

    const data = await res.json();
    const dates = data.expirations?.date;
    if (!dates) return [];
    return Array.isArray(dates) ? dates : [dates];
  } catch {
    return [];
  }
}

export async function tradierGetOptionsChain(symbol: string, expiration: string): Promise<{ calls: OptionContract[]; puts: OptionContract[] }> {
  try {
    const res = await tradierFetch(
      `/markets/options/chains?symbol=${symbol}&expiration=${expiration}&greeks=true`
    );
    if (!res) return { calls: [], puts: [] };

    const data = await res.json();
    const options = data.options?.option;
    if (!options) return { calls: [], puts: [] };

    const optArray = Array.isArray(options) ? options : [options];
    const now = new Date();

    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const o of optArray) {
      const expiryDate = new Date(o.expiration_date);
      const dte = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const greeks = o.greeks || {};

      const contract: OptionContract = {
        strike: o.strike ?? 0,
        expiry: o.expiration_date ?? "",
        dte,
        type: o.option_type === "call" ? "call" : "put",
        bid: o.bid ?? 0,
        ask: o.ask ?? 0,
        mid: ((o.bid ?? 0) + (o.ask ?? 0)) / 2,
        lastPrice: o.last ?? 0,
        volume: o.volume ?? 0,
        openInterest: o.open_interest ?? 0,
        impliedVolatility: greeks.mid_iv ?? o.implied_volatility ?? 0,
        inTheMoney: o.in_the_money ?? false,
        // Greeks from Tradier
        delta: greeks.delta ?? undefined,
        gamma: greeks.gamma ?? undefined,
        theta: greeks.theta ?? undefined,
        vega: greeks.vega ?? undefined,
        iv: greeks.mid_iv ?? undefined,
      };

      if (o.option_type === "call") {
        calls.push(contract);
      } else {
        puts.push(contract);
      }
    }

    return { calls, puts };
  } catch (e) {
    console.error(`Tradier chain error for ${symbol} ${expiration}:`, e);
    return { calls: [], puts: [] };
  }
}

export async function tradierGetAllOptionsChains(symbol: string): Promise<OptionsChain | null> {
  try {
    const expirations = await tradierGetExpirations(symbol);
    if (expirations.length === 0) return null;

    // Filter to relevant expirations: 20-60 DTE (short term) and 180+ DTE (LEAPS)
    const now = new Date();
    const relevant = expirations.filter((exp) => {
      const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return (dte >= 20 && dte <= 60) || dte >= 180;
    });

    if (relevant.length === 0) return null;

    // Fetch chains for each relevant expiration (batch to avoid rate limits)
    const allCalls: OptionContract[] = [];
    const allPuts: OptionContract[] = [];

    // Fetch in batches of 3 to be nice to the API
    for (let i = 0; i < relevant.length; i += 3) {
      const batch = relevant.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map((exp) => tradierGetOptionsChain(symbol, exp))
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          allCalls.push(...result.value.calls);
          allPuts.push(...result.value.puts);
        }
      }
    }

    return { expirations: relevant, calls: allCalls, puts: allPuts };
  } catch (e) {
    console.error(`Tradier all chains error for ${symbol}:`, e);
    return null;
  }
}
