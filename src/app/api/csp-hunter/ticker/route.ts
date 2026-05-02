import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { scanTickerCSPs } from "@/lib/options/csp-scanner";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase();
  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  const candidates = await scanTickerCSPs(symbol);

  return NextResponse.json({ symbol, candidates });
}
