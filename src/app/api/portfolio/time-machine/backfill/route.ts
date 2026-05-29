/**
 * Generates Time Machine snapshots for the last business day of every
 * month from `from` (default 2025-01-31) through last month, and stores
 * them in the time_machine_snapshots table.
 *
 * Idempotent: upserts by (snapshot_date, owner_email). Safe to re-run
 * after a business-logic fix.
 *
 * Long-running — relies on Vercel's 60s Fluid Compute max for this user
 * (~12 months × ~3-5s each). For the rare case of needing more, the
 * client can re-POST with a narrower `from` window.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getAllActivities, getPortfolio } from "@/lib/snaptrade/client";
import { simulateTimeMachine } from "@/lib/time-machine/simulate";
import { SnapTradeTxn } from "@/lib/time-machine/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

import { hasPortfolioAccess } from "@/lib/portfolio-access";

/** Last calendar day of the month for a given (year, monthIndex 0-11). */
function lastDayOfMonth(year: number, monthIdx: number): string {
  const d = new Date(Date.UTC(year, monthIdx + 1, 0));
  return d.toISOString().slice(0, 10);
}

/** Snap a date to the most-recent weekday on/before it (skip Sat/Sun). */
function toWeekday(dateISO: string): string {
  const d = new Date(dateISO + "T12:00:00Z");
  const day = d.getUTCDay();   // 0 = Sun, 6 = Sat
  if (day === 0) d.setUTCDate(d.getUTCDate() - 2);
  else if (day === 6) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPortfolioAccess(user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const fromISO = searchParams.get("from") ?? "2025-01-01";
  const fromDate = new Date(fromISO);
  const today = new Date();

  // Build the list of last-day-of-month dates to backfill.
  const targets: string[] = [];
  {
    let y = fromDate.getUTCFullYear();
    let m = fromDate.getUTCMonth();
    while (y < today.getUTCFullYear() || (y === today.getUTCFullYear() && m < today.getUTCMonth())) {
      targets.push(toWeekday(lastDayOfMonth(y, m)));
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }

  if (!targets.length) {
    return NextResponse.json({ error: "No targets in range" }, { status: 400 });
  }

  try {
    // Fetch once — feed the same data to every snapshot date.
    const [activities, portfolio] = await Promise.all([
      getAllActivities("2010-01-01"),
      getPortfolio(),
    ]);

    if (!activities.length) {
      return NextResponse.json({ error: "No transaction history" }, { status: 502 });
    }

    const txns = activities as SnapTradeTxn[];
    let earliestAvailable: string | null = null;
    for (const t of activities as any[]) {
      const d = (t?.trade_date ?? t?.settlement_date ?? "").slice(0, 10);
      if (!d) continue;
      if (earliestAvailable === null || d < earliestAvailable) earliestAvailable = d;
    }

    const stocksMV = portfolio.summary.total_market_value;
    const optionsMV = portfolio.options.reduce((s, o) => s + o.market_value, 0);
    const cashTotal = portfolio.summary.cash;
    const actualTotal = stocksMV + optionsMV + cashTotal;

    const results: Array<{ date: string; status: "ok" | "skipped" | "error"; reason?: string; delta?: number }> = [];

    for (const date of targets) {
      if (earliestAvailable && date < earliestAvailable) {
        results.push({ date, status: "skipped", reason: `before earliest activity (${earliestAvailable})` });
        continue;
      }
      try {
        const sim = await simulateTimeMachine({ snapshotDate: date, txns, actualTotal });
        const payload = { ...sim, earliestAvailable };

        const { error: upErr } = await supabase
          .from("time_machine_snapshots")
          .upsert({
            snapshot_date: date,
            owner_email: user.email!,
            payload,
            delta_absolute: sim.delta.absolute,
            favorable_to_hold: sim.delta.favorableToHold,
            computed_at: new Date().toISOString(),
          }, { onConflict: "snapshot_date,owner_email" });

        if (upErr) {
          results.push({ date, status: "error", reason: upErr.message });
        } else {
          results.push({ date, status: "ok", delta: sim.delta.absolute });
        }
      } catch (e: any) {
        results.push({ date, status: "error", reason: e?.message ?? String(e) });
      }
    }

    return NextResponse.json({
      targets: targets.length,
      ok: results.filter((r) => r.status === "ok").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    });
  } catch (err: any) {
    console.error("Time Machine backfill error:", err);
    return NextResponse.json({ error: "Backfill failed", detail: String(err).slice(0, 300) }, { status: 500 });
  }
}
