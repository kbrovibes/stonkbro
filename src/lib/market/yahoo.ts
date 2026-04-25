/**
 * Market data provider — routes to Tradier (real) or Mock based on env config.
 *
 * All imports throughout the app use this file. The provider is selected
 * automatically based on whether TRADIER_API_TOKEN is set.
 *
 * Re-exports types so existing imports don't break.
 */

export type { QuoteData, OptionContract, OptionsChain } from "./types";

import type { QuoteData, OptionsChain } from "./types";
import { tradierGetQuote, tradierGetQuotes, tradierGetOptionsChain, tradierGetAllOptionsChains } from "./tradier";
import { mockGetQuote, mockGetQuotes, mockGetOptionsChain, mockGetAllOptionsChains } from "./mock";

function useTradier(): boolean {
  return !!process.env.TRADIER_API_TOKEN;
}

export async function getQuote(symbol: string): Promise<QuoteData | null> {
  if (useTradier()) return tradierGetQuote(symbol);
  return mockGetQuote(symbol);
}

export async function getQuotes(symbols: string[]): Promise<QuoteData[]> {
  if (useTradier()) return tradierGetQuotes(symbols);
  return mockGetQuotes(symbols);
}

export async function getOptionsChain(symbol: string, expirationDate?: string): Promise<OptionsChain | null> {
  if (useTradier()) {
    if (expirationDate) return tradierGetOptionsChain(symbol, expirationDate).then(r => ({
      expirations: [expirationDate],
      ...r,
    }));
    // Without a specific expiration, get the first available
    const { tradierGetExpirations } = await import("./tradier");
    const exps = await tradierGetExpirations(symbol);
    if (exps.length === 0) return null;
    const chain = await tradierGetOptionsChain(symbol, exps[0]);
    return { expirations: exps, ...chain };
  }
  return mockGetOptionsChain(symbol, expirationDate);
}

export async function getAllOptionsChains(symbol: string): Promise<OptionsChain | null> {
  if (useTradier()) return tradierGetAllOptionsChains(symbol);
  return mockGetAllOptionsChains(symbol);
}
