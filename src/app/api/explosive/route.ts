import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getQuotes } from "@/lib/market/yahoo";
import { getSector, getAllSectorTickers } from "@/lib/market/sectors";
import type { QuoteData } from "@/lib/market/yahoo";

export const maxDuration = 120;

function formatQuoteContext(quotes: QuoteData[]): string {
  return quotes
    .map(
      (q) =>
        `${q.symbol} (${q.name}): $${q.price.toFixed(2)}, change ${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%, ` +
        `vol ${(q.volume / 1_000_000).toFixed(1)}M (${q.volumeRatio.toFixed(1)}x avg), ` +
        `mktcap $${(q.marketCap / 1_000_000_000).toFixed(1)}B, ` +
        `50d SMA ${q.above50sma ? "above" : "below"}, 200d SMA ${q.above200sma ? "above" : "below"}, ` +
        `52w range $${q.fiftyTwoWeekLow.toFixed(2)}-$${q.fiftyTwoWeekHigh.toFixed(2)}` +
        (q.earningsDate ? `, next earnings ${q.earningsDate}` : "")
    )
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sector, tickers: rawTickers } = body as {
      sector?: string;
      tickers?: string[];
    };

    let tickerList: string[];
    let sectorName = "All Sectors";

    if (sector && sector !== "all") {
      const sectorData = getSector(sector);
      if (!sectorData) {
        return NextResponse.json(
          { error: `Sector "${sector}" not found` },
          { status: 400 }
        );
      }
      tickerList = sectorData.tickers;
      sectorName = sectorData.name;
    } else if (rawTickers && rawTickers.length > 0) {
      tickerList = rawTickers.map((t) => t.trim().toUpperCase());
    } else {
      tickerList = getAllSectorTickers();
    }

    if (tickerList.length === 0) {
      return NextResponse.json(
        { error: "No tickers to analyze" },
        { status: 400 }
      );
    }

    // Fetch live quotes
    const quotes = await getQuotes(tickerList);
    if (quotes.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch quotes for any tickers" },
        { status: 400 }
      );
    }

    const quoteContext = formatQuoteContext(quotes);

    const client = new Anthropic();

    const prompt = `You are an elite growth investor and options strategist hunting for stocks with 10x potential. Analyze these stocks and find the most explosive opportunities.

SECTOR: ${sectorName}

LIVE MARKET DATA:
${quoteContext}

YOUR TASK:
1. Analyze each stock as a potential 10x opportunity
2. Consider: sector tailwinds, competitive moats, catalyst pipeline, TAM (total addressable market) expansion, and whether it's early-stage vs mature
3. Select your TOP 3-5 picks with the highest conviction for explosive growth

For each recommended stock, provide:
- **WHY** it could 10x (be specific about the growth thesis, not generic)
- **CATALYST** — the specific upcoming event or trend that would trigger a massive move
- **RISK** — the main risk that could derail it (be honest)
- **ENTRY STRATEGY** — recommend one: "Buy shares" (direct), "Sell CSP" (sell cash-secured puts to enter at a discount), or "PMCC" (poor man's covered call for leveraged upside)
- **CONVICTION** — High, Medium, or Low

IMPORTANT:
- Be specific and actionable, not generic. Reference actual market data from above.
- Favor stocks with: high volume ratios (unusual activity), trading above moving averages (momentum), smaller market caps (more room to grow)
- A stock near its 52-week high with strong volume might be breaking out
- A stock with a low market cap and sector tailwinds has more 10x potential than a mega-cap

Format your response in two parts:

PART 1 - NARRATIVE REPORT:
Write a concise sector analysis (2-3 paragraphs) covering the macro theme, where we are in the cycle, and why NOW is the time to look at these stocks.

PART 2 - STRUCTURED PICKS:
Return a JSON array (and ONLY a JSON array, no markdown code fences) on a line starting with "PICKS_JSON:" with this structure:
[
  {
    "symbol": "TICKER",
    "thesis": "Why this could 10x...",
    "catalyst": "The specific catalyst...",
    "risk": "The main risk...",
    "entryStrategy": "Buy shares" | "Sell CSP" | "PMCC",
    "conviction": "High" | "Medium" | "Low"
  }
]`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    // Parse into report + picks
    const picksMarker = "PICKS_JSON:";
    const picksIndex = responseText.indexOf(picksMarker);

    let report: string;
    let picks: Array<{
      symbol: string;
      thesis: string;
      catalyst: string;
      risk: string;
      entryStrategy: string;
      conviction: string;
    }> = [];

    if (picksIndex !== -1) {
      report = responseText.substring(0, picksIndex).trim();
      const picksJson = responseText.substring(picksIndex + picksMarker.length).trim();
      try {
        picks = JSON.parse(picksJson);
      } catch {
        // Try to extract JSON from the remaining text
        const jsonMatch = picksJson.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            picks = JSON.parse(jsonMatch[0]);
          } catch {
            // Fallback: no structured picks
          }
        }
      }
    } else {
      report = responseText;
    }

    return NextResponse.json({
      report,
      picks,
      sector: sectorName,
      tickersAnalyzed: quotes.map((q) => q.symbol),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Explosive API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
