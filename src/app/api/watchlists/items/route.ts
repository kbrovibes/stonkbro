import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { addToWatchlist } from "@/lib/db/watchlists";
import { getQuote } from "@/lib/market/yahoo";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { watchlistId, symbol } = await request.json();
  if (!watchlistId || !symbol) {
    return NextResponse.json({ error: "Missing watchlistId or symbol" }, { status: 400 });
  }

  try {
    await addToWatchlist(watchlistId, symbol);

    // Fetch live quote for the newly added ticker
    const quote = await getQuote(symbol.toUpperCase());

    return NextResponse.json({
      success: true,
      ticker: quote
        ? { symbol: quote.symbol, price: quote.price, changePct: quote.changePct }
        : { symbol: symbol.toUpperCase(), price: 0, changePct: 0 },
    });
  } catch (e) {
    console.error("Add to watchlist error:", e);
    return NextResponse.json({ error: "Failed to add ticker" }, { status: 500 });
  }
}
