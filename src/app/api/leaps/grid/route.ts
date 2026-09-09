import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getOptionsChain, getQuote } from "@/lib/market/yahoo";
import type { OptionContract } from "@/lib/market/types";
import { buildLeapsGrid, contractIv, type GridResponse, type PricedStrike } from "@/lib/options/leaps-grid";

const CACHE_TTL_MS = 5 * 60_000;
const MAX_STRIKES = 6;

interface CachedChain {
  at: number;
  spot: number;
  chainAsOf: string;
  calls: OptionContract[];
}

const chainCache = new Map<string, CachedChain>();

async function loadChain(symbol: string, expiry: string): Promise<CachedChain | null> {
  const key = `${symbol}:${expiry}`;
  const hit = chainCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;

  const [quote, chain] = await Promise.all([getQuote(symbol), getOptionsChain(symbol, expiry)]);
  if (!quote || quote.price <= 0 || !chain) return null;
  const entry: CachedChain = {
    at: Date.now(),
    spot: quote.price,
    chainAsOf: new Date().toISOString(),
    calls: chain.calls.filter((c) => c.expiry === expiry),
  };
  chainCache.set(key, entry);
  return entry;
}

function priceStrike(strike: number, chain: CachedChain, expiry: string, now: Date): PricedStrike {
  const c = chain.calls.find((x) => x.strike === strike);
  if (!c) return { strike, unavailable: true, reason: "Not listed for this expiry" };
  if (!(c.mid > 0)) return { strike, unavailable: true, reason: "No bid/ask quoted" };
  const iv = contractIv(c);
  if (!(iv > 0)) return { strike, unavailable: true, reason: "No implied volatility quoted" };
  return {
    strike,
    unavailable: false,
    bid: c.bid,
    ask: c.ask,
    mid: c.mid,
    iv,
    delta: typeof c.delta === "number" ? Math.abs(c.delta) : null,
    openInterest: c.openInterest,
    volume: c.volume,
    dte: c.dte,
    grid: buildLeapsGrid({ spot: chain.spot, strike, expiry, mid: c.mid, iv, now }),
  };
}

/** GET ?symbol=GOOG&expiry=2028-01-21&strikes=145,165 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const symbol = (params.get("symbol") ?? "").trim().toUpperCase();
  const expiry = (params.get("expiry") ?? "").slice(0, 10);
  if (!/^[A-Z][A-Z.\-]{0,6}$/.test(symbol) || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
    return NextResponse.json({ error: "symbol and expiry are required" }, { status: 400 });
  }
  const strikes = [
    ...new Set(
      (params.get("strikes") ?? "")
        .split(",")
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].slice(0, MAX_STRIKES);

  const chain = await loadChain(symbol, expiry);
  if (!chain) {
    return NextResponse.json({ error: `No chain for ${symbol} ${expiry}` }, { status: 404 });
  }

  const now = new Date();
  const body: GridResponse = {
    symbol,
    expiry,
    spot: chain.spot,
    chainAsOf: chain.chainAsOf,
    listedStrikes: chain.calls.map((c) => c.strike).sort((a, b) => a - b),
    strikes: strikes.map((k) => priceStrike(k, chain, expiry, now)),
  };
  return NextResponse.json(body);
}
