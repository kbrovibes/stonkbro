/**
 * The only paper-trading module that fetches. Everything is cached per run:
 * one quote call, one history call per symbol that needs indicators, and one
 * chain call per (symbol, expiry). Tradier allows ~120 requests a minute, so
 * history and chain fetches go 5 at a time with a pause between batches.
 */
import { getHistory, type DailyBar } from "@/lib/market/history";
import { tradierGetExpirations, tradierGetOptionsChain } from "@/lib/market/tradier";
import type { OptionContract, QuoteData } from "@/lib/market/types";
import { getOptionsChain, getQuotes } from "@/lib/market/yahoo";
import { dteOn } from "./dates";
import type { ChainNeed, MarketView } from "./types";

export interface MarketData {
  date: string;
  quotes: Map<string, QuoteData>;
  histories: Map<string, DailyBar[]>;
  /** Contracts by symbol, across every expiry fetched this run. */
  chains: Map<string, OptionContract[]>;
  expirations: Map<string, string[]>;
  fetchedExpiries: Set<string>;
  errors: string[];
}

export interface HeldContract {
  symbol: string;
  expiry: string;
}

const hasTradier = (): boolean => !!process.env.TRADIER_API_TOKEN;
const BATCH = 5;
const PAUSE_MS = 500;
const HISTORY_PAUSE_MS = 2500;

export function newMarketData(date: string): MarketData {
  return {
    date,
    quotes: new Map(),
    histories: new Map(),
    chains: new Map(),
    expirations: new Map(),
    fetchedExpiries: new Set(),
    errors: [],
  };
}

async function inBatches<T>(items: T[], fn: (item: T) => Promise<void>, pauseMs: number): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH) {
    await Promise.allSettled(items.slice(i, i + BATCH).map(fn));
    if (hasTradier() && i + BATCH < items.length) await new Promise((r) => setTimeout(r, pauseMs));
  }
}

export async function loadQuotes(data: MarketData, symbols: string[]): Promise<void> {
  const missing = [...new Set(symbols)].filter((s) => !data.quotes.has(s));
  if (missing.length === 0) return;
  try {
    for (const q of await getQuotes(missing)) if (q.price > 0) data.quotes.set(q.symbol, q);
  } catch (e) {
    data.errors.push(`quotes: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Mock history is generated from a different base than mock quotes; rescale so the last close is the quote. */
function alignToQuote(data: MarketData, symbol: string, bars: DailyBar[]): DailyBar[] {
  const quote = data.quotes.get(symbol)?.price;
  const last = bars[bars.length - 1]?.close;
  if (hasTradier() || !quote || !last) return bars;
  const k = quote / last;
  return bars.map((b) => ({ ...b, open: b.open * k, high: b.high * k, low: b.low * k, close: b.close * k }));
}

export async function loadHistories(data: MarketData, symbols: string[], days = 300): Promise<void> {
  const missing = [...new Set(symbols)].filter((s) => !data.histories.has(s));
  await inBatches(
    missing,
    async (symbol) => {
      try {
        data.histories.set(symbol, alignToQuote(data, symbol, await getHistory(symbol, days)));
      } catch (e) {
        data.errors.push(`history ${symbol}: ${e instanceof Error ? e.message : String(e)}`);
        data.histories.set(symbol, []);
      }
    },
    HISTORY_PAUSE_MS,
  );
}

function addContracts(data: MarketData, symbol: string, contracts: OptionContract[]): void {
  const list = data.chains.get(symbol) ?? [];
  for (const c of contracts) list.push({ ...c, dte: dteOn(c.expiry, data.date) });
  data.chains.set(symbol, list);
}

async function loadExpirations(data: MarketData, symbol: string): Promise<string[]> {
  const cached = data.expirations.get(symbol);
  if (cached) return cached;
  const exps = await tradierGetExpirations(symbol);
  data.expirations.set(symbol, exps);
  return exps;
}

function pickExpiry(exps: string[], need: ChainNeed, date: string): string | null {
  const inRange = exps.filter((e) => {
    const d = dteOn(e, date);
    return d >= need.minDte && d <= need.maxDte;
  });
  if (inRange.length === 0) return null;
  const target = need.targetDte ?? (need.minDte + need.maxDte) / 2;
  return inRange.reduce((best, e) =>
    Math.abs(dteOn(e, date) - target) < Math.abs(dteOn(best, date) - target) ? e : best,
  );
}

/** Mock mode: one full chain per symbol, every expiry the provider generates. */
async function loadMockChains(data: MarketData, symbols: string[]): Promise<void> {
  for (const symbol of symbols) {
    if (data.fetchedExpiries.has(`${symbol}:*`)) continue;
    data.fetchedExpiries.add(`${symbol}:*`);
    try {
      const chain = await getOptionsChain(symbol);
      if (chain) addContracts(data, symbol, [...chain.calls, ...chain.puts]);
    } catch (e) {
      data.errors.push(`chain ${symbol}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

/**
 * Fetch the chains a set of needs and held contracts require. Under Tradier
 * each need resolves to ONE expiry (nearest its target) and each held contract
 * to its exact expiry; a (symbol, expiry) pair is fetched at most once per run.
 */
export async function loadChains(data: MarketData, needs: ChainNeed[], held: HeldContract[]): Promise<void> {
  const symbols = [...new Set([...needs.map((n) => n.symbol), ...held.map((h) => h.symbol)])];
  if (!hasTradier()) return loadMockChains(data, symbols);

  await inBatches(
    symbols.filter((s) => !data.expirations.has(s)),
    async (symbol) => {
      try {
        await loadExpirations(data, symbol);
      } catch (e) {
        data.errors.push(`expirations ${symbol}: ${e instanceof Error ? e.message : String(e)}`);
        data.expirations.set(symbol, []);
      }
    },
    PAUSE_MS,
  );

  const wanted = new Set<string>();
  for (const need of needs) {
    const expiry = pickExpiry(data.expirations.get(need.symbol) ?? [], need, data.date);
    if (expiry) wanted.add(`${need.symbol}:${expiry}`);
  }
  for (const h of held) {
    if ((data.expirations.get(h.symbol) ?? []).includes(h.expiry)) wanted.add(`${h.symbol}:${h.expiry}`);
  }

  const pending = [...wanted].filter((k) => !data.fetchedExpiries.has(k));
  await inBatches(
    pending,
    async (key) => {
      data.fetchedExpiries.add(key);
      const [symbol, expiry] = key.split(":");
      try {
        const chain = await tradierGetOptionsChain(symbol, expiry);
        addContracts(data, symbol, [...chain.calls, ...chain.puts]);
      } catch (e) {
        data.errors.push(`chain ${key}: ${e instanceof Error ? e.message : String(e)}`);
      }
    },
    PAUSE_MS,
  );
}

export function findContract(
  data: MarketData,
  symbol: string,
  type: "call" | "put",
  strike: number,
  expiry: string,
): OptionContract | null {
  const list = data.chains.get(symbol);
  if (!list) return null;
  return list.find((c) => c.type === type && c.expiry === expiry && Math.abs(c.strike - strike) < 1e-6) ?? null;
}

export function makeView(data: MarketData): MarketView {
  return {
    price: (symbol) => data.quotes.get(symbol)?.price ?? null,
    option: (symbol, type, strike, expiry) => findContract(data, symbol, type, strike, expiry),
    dte: (expiry) => dteOn(expiry, data.date),
  };
}
