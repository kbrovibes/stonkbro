import { NextResponse } from "next/server";
import { getQuotes, getAllOptionsChains } from "@/lib/market/yahoo";
import { getEarningsCalendar } from "@/lib/market/earnings";
import { analyzeEarningsIV, buildEarningsPlayPrompt } from "@/lib/options/earnings-plays";
import type { EarningsPlayData } from "@/lib/options/earnings-plays";
import { generateText } from "@/lib/ai/provider";

export const dynamic = "force-dynamic";

// Tickers to scan for earnings plays
const EARNINGS_UNIVERSE = [
  "NVDA", "AAPL", "MSFT", "GOOGL", "AMZN", "META", "TSLA", "NFLX",
  "AMD", "AVGO", "PLTR", "CRWD", "COIN", "SHOP", "SNOW", "DDOG",
  "JPM", "GS", "COST", "DIS", "BA", "UBER", "SOFI", "RKLB",
];

export async function GET() {
  try {
    // 1. Get earnings calendar for the universe
    const earnings = await getEarningsCalendar(EARNINGS_UNIVERSE);

    // Filter to stocks with earnings in the next 14 days
    const upcoming = earnings.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 14);

    if (upcoming.length === 0) {
      return NextResponse.json({
        plays: [],
        suggestions: [],
        message: "No earnings in the next 14 days for tracked tickers",
      });
    }

    // 2. Fetch quotes for upcoming earnings tickers
    const symbols = upcoming.map((e) => e.symbol);
    const quotes = await getQuotes(symbols);
    const quoteMap = new Map(quotes.map((q) => [q.symbol, q]));

    // 3. Fetch options chains and analyze IV (sequential to avoid rate limits)
    const plays: EarningsPlayData[] = [];
    for (const event of upcoming) {
      const quote = quoteMap.get(event.symbol);
      if (!quote) continue;

      const chain = await getAllOptionsChains(event.symbol);
      const play = analyzeEarningsIV(quote, chain, event);
      plays.push(play);
    }

    // 4. If we have chains, generate AI suggestions
    const playsWithChains = plays.filter((p) => p.chainAvailable);
    let suggestions: unknown[] = [];

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (playsWithChains.length > 0) {
      try {
        const prompt = buildEarningsPlayPrompt(playsWithChains);
        const result = await generateText({
          prompt,
          maxTokens: 2000,
          feature: "earnings-plays",
          userId: user?.id,
        });

        // Parse JSON from response
        const jsonMatch = result.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        }
      } catch (aiError) {
        console.error("AI earnings plays error:", aiError);
        // Return plays data even without AI suggestions
      }
    }

    return NextResponse.json({
      plays,
      suggestions,
      earningsCount: upcoming.length,
      chainsAnalyzed: playsWithChains.length,
    });
  } catch (e) {
    console.error("Earnings plays error:", e);
    return NextResponse.json({ error: "Failed to generate earnings plays" }, { status: 500 });
  }
}
