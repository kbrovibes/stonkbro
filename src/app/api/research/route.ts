import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getQuotes } from "@/lib/market/yahoo";
import { runDeepResearch } from "@/lib/research/analyzer";
import { runHybridResearch } from "@/lib/research/hybrid-analyzer";
import {
  createPendingReport,
  completeReport,
  failReport,
  saveTradeSuggestion,
} from "@/lib/db/research";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    // Step 1: Create pending report in DB immediately
    const pendingReport = await createPendingReport(user.id, "manual", normalizedSymbols, mode);
    const reportId = pendingReport.id;

    // Step 2: Return the report ID immediately so the UI can poll
    // But also continue processing (the server will finish even if browser closes)

    // Fetch quotes
    const quotes = await getQuotes(normalizedSymbols);
    if (quotes.length === 0) {
      await failReport(reportId, "Could not fetch quotes for any of the provided symbols");
      return NextResponse.json({ error: "Could not fetch quotes", reportId }, { status: 400 });
    }

    // Step 3: Run research
    let report: string;
    let suggestions: { symbol: string; strategy: string; action: string; strike?: number; expiry?: string; premium?: number; reasoning: string }[];
    let aiProvider: string | undefined;
    let aiModel: string | undefined;

    try {
      if (mode === "hybrid") {
        const result = await runHybridResearch(normalizedSymbols, quotes, undefined, user.id);
        report = result.report;
        suggestions = result.suggestions;
        // hybrid analyzer doesn't return provider/model in the result type yet, need to fix that or handle it
      } else {
        const result = await runDeepResearch(normalizedSymbols, quotes, undefined, user.id);
        report = result.report;
        suggestions = result.suggestions;
        aiProvider = result.provider;
        aiModel = result.model;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Research failed";
      await failReport(reportId, msg);
      return NextResponse.json({ error: msg, reportId }, { status: 500 });
    }

    // Step 4: Complete the report
    await completeReport(reportId, report, aiProvider, aiModel);

    // Step 5: Save suggestions
    for (const suggestion of suggestions) {
      try {
        await saveTradeSuggestion({
          report_id: reportId,
          user_id: user.id,
          symbol: suggestion.symbol,
          strategy: suggestion.strategy,
          action: suggestion.action,
          strike: suggestion.strike,
          expiry: suggestion.expiry,
          premium: suggestion.premium,
          reasoning: suggestion.reasoning,
        });
      } catch {
        // Don't fail for individual suggestion save errors
      }
    }

    return NextResponse.json({
      reportId,
      report,
      suggestions,
      symbolsAnalyzed: quotes.map((q) => q.symbol),
      timestamp: new Date().toISOString(),
      mode,
      aiProvider,
      aiModel,
    });
  } catch (e) {
    console.error("Research API error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
