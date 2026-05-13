import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getPortfolio, getTransactions, getOptionChains } from "@/lib/snaptrade/client";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

    if (include === "option-chains") {
      const days = Number(searchParams.get("days") ?? 90);
      const chains = await getOptionChains(days);
      return NextResponse.json({ chains });
    }

    const portfolio = await getPortfolio();
    return NextResponse.json(portfolio);
  } catch (err: any) {
    const status = err?.response?.status;
    const detail = err?.response?.data ?? err?.message ?? String(err);
    console.error("SnapTrade error:", status, JSON.stringify(detail));
    return NextResponse.json({ error: "Failed to fetch portfolio data", detail: String(detail).slice(0, 200) }, { status: 500 });
  }
}
