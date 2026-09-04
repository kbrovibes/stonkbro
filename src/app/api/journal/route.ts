import { NextResponse } from "next/server";
import { getDecisionStats } from "@/lib/db/trade-decisions";
import { computeLessonsFromRows, dedupeContracts, formatLessonsBlock } from "@/lib/reflection/lessons";

/**
 * GET — decision journal: lessons, most recent resolved decisions, headline counts.
 * `?symbol=NVDA` focuses the block on one ticker; `?asOf=2026-07-01` replays the
 * lessons as they stood on that date (no lookahead).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? undefined;
  const asOfParam = url.searchParams.get("asOf");
  const asOfDate = asOfParam ? new Date(asOfParam) : undefined;
  const asOf = asOfDate && !Number.isNaN(asOfDate.getTime()) ? asOfDate : undefined;

  const stats = await getDecisionStats();
  const lessons = computeLessonsFromRows(stats.rows, { symbol, asOf });
  // One entry per contract, matching how the lessons above are counted.
  const recent = dedupeContracts(stats.rows).sort((a, b) =>
    (b.expiry ?? "").localeCompare(a.expiry ?? "")
  );

  return NextResponse.json({
    lessons,
    lessonsBlock: formatLessonsBlock(lessons),
    recent: recent.slice(0, 50),
    stats: {
      total: stats.total,
      resolved: stats.resolved,
      unresolved: stats.unresolved,
      uniqueContracts: lessons.uniqueContracts,
      resolvedSightings: lessons.totalRows,
    },
  });
}
