import { createClient } from "@/lib/supabase-server";

export async function getWatchlists(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*, watchlist_items(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data.map((w) => ({
    ...w,
    item_count: w.watchlist_items?.[0]?.count ?? 0,
  }));
}

export async function getWatchlistWithItems(watchlistId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*, watchlist_items(*)")
    .eq("id", watchlistId)
    .single();

  if (error) throw error;
  return data;
}

export async function createWatchlist(
  userId: string,
  name: string,
  isDefault = false
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .insert({ user_id: userId, name, is_default: isDefault })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWatchlist(watchlistId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("id", watchlistId);

  if (error) throw error;
}

export async function addToWatchlist(watchlistId: string, symbol: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .insert({ watchlist_id: watchlistId, symbol: symbol.toUpperCase() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeFromWatchlist(
  watchlistId: string,
  symbol: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("watchlist_items")
    .delete()
    .eq("watchlist_id", watchlistId)
    .eq("symbol", symbol.toUpperCase());

  if (error) throw error;
}

export async function getDefaultWatchlist(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*, watchlist_items(*)")
    .eq("user_id", userId)
    .eq("is_default", true)
    .single();

  if (error && error.code === "PGRST116") {
    // No default watchlist found — create one
    return createWatchlist(userId, "My Watchlist", true);
  }

  if (error) throw error;
  return data;
}

export async function getWatchlistsWithItems(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*, watchlist_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getAllWatchlistSymbols(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("watchlist_items")
    .select("symbol, watchlists!inner(user_id)")
    .eq("watchlists.user_id", userId);

  if (error) throw error;

  const unique = [...new Set(data.map((d) => d.symbol))];
  return unique;
}
