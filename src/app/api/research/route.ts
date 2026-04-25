import { NextResponse } from "next/server";
import { getQuotes } from "@/lib/market/yahoo";
import { runDeepResearch } from "@/lib/research/analyzer";

export const maxDuration = 120; // Claude analysis can take a while

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbols: string[] = body.symbols;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { error: "symbols array is required" },
        { status: 400 }
      );
    }

    if (symbols.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 symbols per research run" },
        { status: 400 }
      );
    }

    // Normalize symbols
    const normalizedSymbols = symbols.map((s) => s.trim().toUpperCase());

    // Fetch live quotes
    const quotes = await getQuotes(normalizedSymbols);
    if (quotes.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch quotes for any of the provided symbols" },
        { status: 400 }
      );
    }

    // Run deep research
    const result = await runDeepResearch(normalizedSymbols, quotes);

    return NextResponse.json({
      report: result.report,
      suggestions: result.suggestions,
      symbolsAnalyzed: quotes.map((q) => q.symbol),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Research API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
