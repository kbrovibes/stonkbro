import { NextResponse } from "next/server";
import { getQuote, getAllOptionsChains } from "@/lib/market/yahoo";
import { findPMCCSetups, PMCCCandidate } from "@/lib/options/pmcc";
import { SECTORS, getSector, getAllSectorTickers } from "@/lib/market/sectors";
import { runTracked } from "@/lib/jobs/tracker";

export const maxDuration = 120;

export type PMCCScanResult = PMCCCandidate & {
  incomeProjection12mo: number;
  capitalEfficiency: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectorSlug = searchParams.get("sector");

  let tickers: string[];
  let scanScope = "top 20";

  if (sectorSlug) {
    const sector = getSector(sectorSlug);
    if (!sector) {
      return NextResponse.json(
        { error: `Unknown sector: ${sectorSlug}` },
        { status: 400 }
      );
    }
    tickers = sector.tickers;
    scanScope = sector.name;
  } else {
    // All sectors but limit to ~20 to avoid timeout
    const all = getAllSectorTickers();
    tickers = all.slice(0, 20);
  }

  const { allSetups, errors, scanned } = await runTracked(
    {
      kind: "pmcc-scan",
      label: `PMCC scan: ${scanScope}`,
      trigger: "manual",
      meta: { sector: sectorSlug ?? "all", tickers: tickers.length },
    },
    async (ctx) => {
      const allSetups: PMCCScanResult[] = [];
      const errors: { symbol: string; error: string }[] = [];
      const scanned: string[] = [];

      // Process sequentially to avoid rate limits
      for (const symbol of tickers) {
        await ctx.progress(`${symbol} (${scanned.length + 1}/${tickers.length})`);
        try {
          const [quote, chain] = await Promise.all([
            getQuote(symbol),
            getAllOptionsChains(symbol),
          ]);

          scanned.push(symbol);

          if (!quote || !chain) continue;

          const setups = findPMCCSetups(symbol, quote.price, chain.calls);

          // Take top 2 setups per ticker to keep results manageable
          for (const setup of setups.slice(0, 2)) {
            const incomeProjection12mo = setup.monthlyPremium * 12;
            const capitalEfficiency = setup.capitalRequired / (setup.stockPrice * 100);

            allSetups.push({
              ...setup,
              incomeProjection12mo,
              capitalEfficiency,
            });
          }
        } catch (e) {
          errors.push({
            symbol,
            error: e instanceof Error ? e.message : "Unknown error",
          });
          scanned.push(symbol);
        }
      }

      // Sort by monthly return %
      allSetups.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
        return b.monthlyReturnPct - a.monthlyReturnPct;
      });

      return { allSetups, errors, scanned };
    }
  );

  return NextResponse.json({
    setups: allSetups,
    scannedTickers: scanned,
    totalTickers: tickers.length,
    errors,
    sectors: SECTORS.map((s) => ({ slug: s.slug, name: s.name, count: s.tickers.length })),
  });
}
