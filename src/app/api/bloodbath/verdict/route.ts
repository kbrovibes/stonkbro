import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  generateBloodbathVerdicts,
  MAX_VERDICT_TICKERS,
  type BenchmarkContext,
  type VerdictInputTicker,
} from "@/lib/analysis/bloodbath-verdict";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const tickers: VerdictInputTicker[] = Array.isArray(body.tickers)
      ? body.tickers.slice(0, MAX_VERDICT_TICKERS)
      : [];
    if (tickers.length === 0) {
      return NextResponse.json({ error: "tickers array is required" }, { status: 400 });
    }

    const benchmarks: BenchmarkContext[] = Array.isArray(body.benchmarks) ? body.benchmarks : [];
    const result = await generateBloodbathVerdicts(tickers, user.id, benchmarks);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Bloodbath verdict error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
