import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getWatchlists } from "@/lib/db/watchlists";
import WatchlistCard from "@/components/WatchlistCard";

export default async function WatchlistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const watchlists = await getWatchlists(user.id);

  return (
    <div className="flex flex-col flex-1 px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-stone-900">Watchlists</h2>
        <Link
          href="/watchlists/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New
        </Link>
      </div>

      {watchlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-stone-900 mb-1">
            No watchlists yet
          </p>
          <p className="text-xs text-stone-400 mb-4">
            Create one to start tracking tickers
          </p>
          <Link
            href="/watchlists/new"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition-colors"
          >
            Create watchlist
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {watchlists.map((wl) => (
            <WatchlistCard
              key={wl.id}
              id={wl.id}
              name={wl.name}
              itemCount={wl.item_count}
              isDefault={wl.is_default}
            />
          ))}
        </div>
      )}
    </div>
  );
}
