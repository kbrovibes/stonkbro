import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getQuotes } from "@/lib/market/yahoo";
import { runDeepResearch } from "@/lib/research/analyzer";
import { runHybridResearch } from "@/lib/research/hybrid-analyzer";
import { saveResearchReport, saveTradeSuggestion } from "@/lib/db/research";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbols: string[] = body.symbols;
    const mode: "hybrid" | "deep" = body.mode || "hybrid";

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: "symbols array is required" }, { status: 400 });
    }

    if (symbols.length > 20) {
      return NextResponse.json({ error: "Maximum 20 symbols per research run" }, { status: 400 });
    }

    const normalizedSymbols = symbols.map((s) => s.trim().toUpperCase());

    const quotes = await getQuotes(normalizedSymbols);
    if (quotes.length === 0) {
      return NextResponse.json({ error: "Could not fetch quotes for any of the provided symbols" }, { status: 400 });
    }

    // Run research based on mode
    let report: string;
    let suggestions: { symbol: string; strategy: string; action: string; strike?: number; expiry?: string; premium?: number; reasoning: string }[];
    let technicals = undefined;
    let tokensSaved = undefined;

    if (mode === "hybrid") {
      const result = await runHybridResearch(normalizedSymbols, quotes);
      report = result.report;
      suggestions = result.suggestions;
      technicals = result.technicals;
      tokensSaved = result.tokensSaved;
    } else {
      const result = await runDeepResearch(normalizedSymbols, quotes);
      report = result.report;
      suggestions = result.suggestions;
    }

    // Save to Supabase
    let reportId: string | null = null;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      try {
        const savedReport = await saveResearchReport(
          user.id,
          "manual",
          quotes.map((q) => q.symbol),
          report
        );
        reportId = savedReport.id;

        for (const suggestion of suggestions) {
          await saveTradeSuggestion({
            report_id: reportId || undefined,
            user_id: user.id,
            symbol: suggestion.symbol,
            strategy: suggestion.strategy,
            action: suggestion.action,
            strike: suggestion.strike,
            expiry: suggestion.expiry,
            premium: suggestion.premium,
            reasoning: suggestion.reasoning,
          });
        }
      } catch (e) {
        console.error("Failed to save research to DB:", e);
      }
    }

    return NextResponse.json({
      report,
      suggestions,
      symbolsAnalyzed: quotes.map((q) => q.symbol),
      timestamp: new Date().toISOString(),
      reportId,
      mode,
      technicals,
      tokensSaved,
    });
  } catch (e) {
    console.error("Research API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
