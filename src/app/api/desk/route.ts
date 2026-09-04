import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { runDesk, type DeskResult } from "@/lib/desk/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * A full desk run scans the universe, reads news and rates every candidate —
 * far too expensive to repeat on every page load. Ten minutes is short enough
 * that the regime and the option quotes are still honest, and long enough that
 * a user flipping the AI toggle back and forth pays for it once.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = { at: number; result: DeskResult };

/**
 * Anchored on globalThis, not module scope: Next re-evaluates route modules on
 * every hot reload in dev, which would throw the cache away between requests.
 */
const globalCache = globalThis as typeof globalThis & {
  __deskCache?: Map<string, CacheEntry>;
};
const cache = (globalCache.__deskCache ??= new Map<string, CacheEntry>());

/**
 * `holdings` is part of the key, not just a flag on the result: a signed-in run
 * folds the owner's real positions into the risk math, and sharing that entry
 * with a guest would hand them the portfolio.
 */
function cacheKey(capital: number, tickers: string[] | undefined, useAI: boolean, holdings: boolean): string {
  return `${capital}|${(tickers ?? []).join(",")}|${useAI ? "ai" : "noai"}|${holdings ? "holdings" : "market"}`;
}

/**
 * GET — public, same as the CSP Hunter feed, so guest mode works. The market
 * half of the desk is open; folding in real holdings requires a session.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const capitalParam = Number(url.searchParams.get("capital"));
  const capital = Number.isFinite(capitalParam) && capitalParam > 0 ? capitalParam : 100_000;

  const useAI = url.searchParams.get("ai") !== "0";

  const tickersParam = url.searchParams.get("tickers");
  const tickers = tickersParam
    ? tickersParam
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean)
    : undefined;

  // Holdings fusion is a signed-in feature. Never let a query param drive it —
  // the session is the only thing that may.
  let includeHoldings = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    includeHoldings = !!user;
  } catch {
    // No session resolvable — stay on the guest path.
  }

  const key = cacheKey(capital, tickers, useAI, includeHoldings);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...hit.result, cached: true });
  }

  try {
    const result = await runDesk({ capital, tickers, useAI, includeHoldings });
    cache.set(key, { at: Date.now(), result });
    return NextResponse.json({ ...result, cached: false });
  } catch (e) {
    console.error("[Desk] run failed:", e);
    return NextResponse.json({ error: "Desk run failed", detail: String(e) }, { status: 500 });
  }
}
