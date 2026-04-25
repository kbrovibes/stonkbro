"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createWatchlist,
  deleteWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/db/watchlists";

export async function createWatchlistAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const name = formData.get("name") as string;
  if (!name || !name.trim()) throw new Error("Name is required");

  const watchlist = await createWatchlist(user.id, name.trim(), false);
  redirect(`/watchlists/${watchlist.id}`);
}

export async function deleteWatchlistAction(watchlistId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await deleteWatchlist(watchlistId);
  redirect("/watchlists");
}

export async function addTickerAction(watchlistId: string, symbol: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const cleaned = symbol.toUpperCase().trim();
  if (!cleaned || cleaned.length > 5 || !/^[A-Z]+$/.test(cleaned)) {
    throw new Error("Invalid ticker symbol");
  }

  await addToWatchlist(watchlistId, cleaned);
  revalidatePath(`/watchlists/${watchlistId}`);
}

export async function removeTickerAction(
  watchlistId: string,
  symbol: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await removeFromWatchlist(watchlistId, symbol);
  revalidatePath(`/watchlists/${watchlistId}`);
}
