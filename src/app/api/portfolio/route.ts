import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortfolio, getTransactions } from "@/lib/snaptrade/client";

export const dynamic = "force-dynamic";

const ALLOWED_EMAIL = "k4rthikr@gmail.com";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.email !== ALLOWED_EMAIL) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const include = searchParams.get("include") ?? "portfolio";

  try {
    if (include === "transactions") {
      const days = Number(searchParams.get("days") ?? 90);
      const transactions = await getTransactions(days);
      return NextResponse.json({ transactions });
    }

    const portfolio = await getPortfolio();
    return NextResponse.json(portfolio);
  } catch (err) {
    console.error("SnapTrade error:", err);
    return NextResponse.json({ error: "Failed to fetch portfolio data" }, { status: 500 });
  }
}
