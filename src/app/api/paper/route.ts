import { NextResponse } from "next/server";
import * as db from "@/lib/db/paper";
import { PROFILES } from "@/lib/paper/profiles";
import { START_CASH } from "@/lib/paper/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [accounts, latest, series, lastRun] = await Promise.all([
      db.getAccounts(),
      db.getLatestSnapshots(),
      db.getCloseSeries(40),
      db.getLastRun(),
    ]);

    let asOf: string | null = null;
    let session: string | null = null;
    for (const s of latest.values()) {
      if (!asOf || s.snap_date > asOf) {
        asOf = s.snap_date;
        session = s.session;
      }
    }
    const desk = asOf ? await db.getNoteFor(null, asOf) : null;

    const profiles = PROFILES.map((p) => {
      const account = accounts.get(p.id) ?? null;
      const snapshot = latest.get(p.id) ?? null;
      const points = (series.get(p.id) ?? []).map((pt) => ({ date: pt.date, equity: pt.equity }));
      const equity = snapshot ? Number(snapshot.equity) : START_CASH;
      return {
        profile: { id: p.id, name: p.name, tagline: p.tagline, style: p.style, plan: p.plan, margin: p.margin },
        account: account
          ? { cash: account.cash, realizedPnl: account.realizedPnl, fees: account.fees, interest: account.interest, startedOn: account.startedOn }
          : null,
        snapshot: snapshot
          ? {
              date: snapshot.snap_date, session: snapshot.session, equity, cash: Number(snapshot.cash),
              marginUsed: Number(snapshot.margin_used), positionsValue: Number(snapshot.positions_value),
            }
          : null,
        series: points,
        equity,
        dayPnl: snapshot ? Number(snapshot.day_pnl) : 0,
        dayPct: snapshot && equity - Number(snapshot.day_pnl) > 0 ? (Number(snapshot.day_pnl) / (equity - Number(snapshot.day_pnl))) * 100 : 0,
        totalPnl: snapshot ? Number(snapshot.total_pnl) : 0,
        totalReturnPct: snapshot ? Number(snapshot.total_return_pct) : 0,
        openPositions: snapshot ? snapshot.positions.length : 0,
      };
    });

    return NextResponse.json({
      asOf,
      session,
      startCash: START_CASH,
      profiles,
      desk: desk ? { date: desk.note_date, highlights: desk.highlights, learnings: desk.learnings, narrative: desk.narrative } : null,
      lastRun: lastRun
        ? { date: lastRun.run_date, session: lastRun.session, status: lastRun.status, startedAt: lastRun.started_at, finishedAt: lastRun.finished_at }
        : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load paper desk" }, { status: 500 });
  }
}
