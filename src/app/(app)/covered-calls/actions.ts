"use server";

import { getQuote, getOptionsChain } from "@/lib/market/yahoo";

function estimateProbOTM(currentPrice: number, strike: number, dte: number): number {
  const distancePct = ((strike - currentPrice) / currentPrice) * 100;
  const timeFactor = Math.sqrt(dte / 30);
  const raw = 50 + (distancePct / timeFactor) * 10;
  return Math.min(99, Math.max(10, Math.round(raw)));
}

export async function lookupTicker(symbol: string, costBasis: number) {
  const [quote, chain] = await Promise.all([
    getQuote(symbol),
    getOptionsChain(symbol),
  ]);

  if (!quote) {
    return { symbol, currentPrice: 0, candidates: [], error: "Could not fetch quote for " + symbol };
  }

  if (!chain) {
    return { symbol, currentPrice: quote.price, candidates: [], error: "Could not fetch options chain" };
  }

  const price = quote.price;
  const basis = costBasis > 0 ? costBasis : price; // default to current price if no cost basis

  // Fetch additional expirations in range
  const now = new Date();
  const relevantExpirations = chain.expirations.filter((exp) => {
    const dte = Math.ceil((new Date(exp).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return dte >= 20 && dte <= 45;
  });

  let allCalls = chain.calls;
  if (relevantExpirations.length > 0) {
    const additionalChains = await Promise.allSettled(
      relevantExpirations.map((exp) => getOptionsChain(symbol, exp))
    );
    for (const result of additionalChains) {
      if (result.status === "fulfilled" && result.value) {
        allCalls = [...allCalls, ...result.value.calls];
      }
    }
  }

  // De-duplicate
  const seen = new Set<string>();
  const uniqueCalls = allCalls.filter((c) => {
    const key = `${c.strike}-${c.expiry}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const minStrike = price * 1.03;
  const maxStrike = price * 1.10;

  const candidates = uniqueCalls
    .filter((c) => {
      if (c.strike < minStrike || c.strike > maxStrike) return false;
      if (c.dte < 20 || c.dte > 45) return false;
      if (c.mid <= 0.01) return false;
      return true;
    })
    .map((c) => {
      const premium = c.mid;
      const annualizedReturn = (premium / c.strike) * (365 / c.dte) * 100;
      const probOTM = estimateProbOTM(price, c.strike, c.dte);
      const maxProfit = (c.strike - basis) * 100 + premium * 100;

      return {
        strike: c.strike,
        expiry: c.expiry,
        dte: c.dte,
        premium,
        annualizedReturn,
        probOTM,
        maxProfit,
      };
    })
    .sort((a, b) => a.expiry.localeCompare(b.expiry) || a.strike - b.strike);

  return { symbol, currentPrice: price, candidates };
}
