import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { getWatchlistWithItems } from "@/lib/db/watchlists";
import { deleteWatchlistAction, removeTickerAction } from "../actions";
import TickerSearch from "@/components/TickerSearch";
import type { EarningsEvent } from "@/lib/market/earnings";

async function getEarningsBadges(symbols: string[]): Promise<Map<string, number>> {
  const badges = new Map<string, number>();
  if (!symbols.length) return badges;
  try {
    const { data } = await supabaseAdmin
      .from("market_cache")
      .select("data, updated_at")
      .eq("key", "earnings")
      .single();
    if (!data) return badges;
    const age = Date.now() - new Date(data.updated_at).getTime();
    if (age > 26 * 60 * 60 * 1000) return badges;
    const all = data.data as EarningsEvent[];
    const symSet = new Set(symbols.map((s) => s.toUpperCase()));
    for (const e of all) {
      if (symSet.has(e.symbol) && e.daysUntil >= 0 && e.daysUntil <= 7) {
        badges.set(e.symbol, e.daysUntil);
      }
    }
  } catch {
    // cache unavailable — no badges
  }
  return badges;
}

export default async function WatchlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const watchlist: any = await getWatchlistWithItems(id);

  if (!watchlist) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
        <p className="text-sm text-stone-500 mb-4">Watchlist not found</p>
        <Link
          href="/watchlists"
          className="text-sm font-semibold text-stone-900 hover:underline"
        >
          Back to watchlists
        </Link>
      </div>
    );
  }

  const items: { id: string; symbol: string }[] = watchlist.watchlist_items || [];
  const earningsBadges = await getEarningsBadges(items.map((i) => i.symbol));

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/watchlists"
          className="w-8 h-8 rounded-lg border border-stone-200 bg-white flex items-center justify-center hover:border-stone-300 transition-colors"
        >
          <svg
            className="w-4 h-4 text-stone-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900 truncate">
              {watchlist.name}
            </h2>
            {watchlist.is_default && (
              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full shrink-0">
                Default
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-stone-400 mb-5 ml-11">
        {items.length}{" "}
        {items.length === 1 ? "ticker" : "tickers"}
      </p>

      <div className="mb-5">
        <TickerSearch watchlistId={id} />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-stone-400">
            No tickers yet. Add one above.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((item) => {
            const daysUntil = earningsBadges.get(item.symbol);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-white"
              >
                <Link
                  href={`/ticker/${item.symbol}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span className="text-sm font-bold text-stone-900">
                    {item.symbol}
                  </span>
                  {daysUntil !== undefined && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                      {daysUntil === 0 ? "Earnings today" : daysUntil === 1 ? "Earnings tomorrow" : `Earnings in ${daysUntil}d`}
                    </span>
                  )}
                </Link>
                <form action={removeTickerAction.bind(null, id, item.symbol)}>
                  <button
                    type="submit"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove ticker"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {!watchlist.is_default && (
        <div className="mt-8 pt-6 border-t border-stone-100">
          <form action={deleteWatchlistAction.bind(null, id)}>
            <button
              type="submit"
              className="w-full py-2.5 text-sm font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >
              Delete Watchlist
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
