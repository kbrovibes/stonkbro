import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { analyzeEarningsPlay } from "@/lib/earnings-play/analyze";
import { writeThesis } from "@/lib/earnings-play/thesis";
import { etToday } from "@/lib/paper/dates";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const symbol = (await params).symbol.toUpperCase();
  if (!/^[A-Z][A-Z.]{0,5}$/.test(symbol)) {
    return NextResponse.json({ ok: false, symbol, reason: "That doesn't look like a ticker." }, { status: 400 });
  }
  try {
    const analyze = unstable_cache(async () => analyzeEarningsPlay(symbol), ["earnings-play-analysis", symbol, etToday()], { revalidate: 900 });
    const result = await analyze();
    if (!result.ok) return NextResponse.json(result, { status: 404 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const thesis = user
      ? await unstable_cache(async () => writeThesis(result.analysis), ["earnings-play-thesis", symbol, result.analysis.asOf], { revalidate: 3600 })()
      : null;
    return NextResponse.json({ ...result, analysis: { ...result.analysis, thesis } });
  } catch (e) {
    console.error(`[earnings-play] ${symbol} failed:`, e);
    return NextResponse.json({ ok: false, symbol, reason: "Analysis failed — try again in a minute." }, { status: 500 });
  }
}
