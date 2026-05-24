import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { tradierGetOptionsChain } from "@/lib/market/tradier";

export const dynamic = "force-dynamic";

const ALLOWED_EMAIL = "k4rthikr@gmail.com";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.email !== ALLOWED_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const underlying = searchParams.get("underlying");
  const option_type = searchParams.get("option_type"); // "CALL" | "PUT"
  const strikeParam = searchParams.get("strike");
  const expiry = searchParams.get("expiry"); // YYYY-MM-DD

  if (!underlying || !option_type || !strikeParam || !expiry) {
    return NextResponse.json({ error: "Missing required params: underlying, option_type, strike, expiry" }, { status: 400 });
  }

  const strike = Number(strikeParam);
  if (isNaN(strike)) {
    return NextResponse.json({ error: "Invalid strike value" }, { status: 400 });
  }

  const chain = await tradierGetOptionsChain(underlying, expiry);

  // Match: option_type CALL → "call", PUT → "put"
  const targetType = option_type.toLowerCase() === "call" ? "call" : "put";
  const contracts = targetType === "call" ? chain.calls : chain.puts;

  const match = contracts.find((c) => Math.abs(c.strike - strike) < 0.01);

  if (!match) {
    return NextResponse.json(
      { error: `No ${targetType} contract found for ${underlying} strike ${strike} expiry ${expiry}` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    bid: match.bid,
    ask: match.ask,
    mid: match.mid,
    iv: match.iv ?? match.impliedVolatility ?? null,
    openInterest: match.openInterest,
    volume: match.volume,
    expiry: match.expiry,
    strike: match.strike,
  });
}
