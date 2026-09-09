import { NextResponse } from "next/server";
import * as db from "@/lib/db/paper";
import { identityFor } from "@/lib/paper/identity";
import { getProfile } from "@/lib/paper/profiles";
import { START_CASH } from "@/lib/paper/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = getProfile(profileId);
  if (!profile) return NextResponse.json({ error: "Unknown profile" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("date");

  try {
    const [accounts, dates, series, winRate, memories] = await Promise.all([
      db.getAccounts(),
      db.getAvailableDates(profileId),
      db.getCloseSeries(400, profileId),
      db.getClosedTradeStats(profileId),
      db.getMemories(profileId).catch(() => []),
    ]);
    const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && dates.includes(requested) ? requested : dates[0] ?? null;
    const [snapshot, trades, note] = date
      ? await Promise.all([db.getSnapshotFor(profileId, date), db.getTradesFor(profileId, date), db.getNoteFor(profileId, date)])
      : [null, [], null];
    const account = accounts.get(profileId) ?? null;
    const equity = snapshot ? Number(snapshot.equity) : START_CASH;

    return NextResponse.json({
      profile: { id: profile.id, name: profile.name, tagline: profile.tagline, style: profile.style, plan: profile.plan, margin: profile.margin },
      identity: (() => {
        const i = identityFor(profile.id);
        return { role: i.role, creed: i.creed, hue: i.hue };
      })(),
      memories: memories.map((m) => ({
        kind: m.kind, headline: m.headline, detail: m.detail,
        weight: m.weight, hits: m.hits, firstSeen: m.firstSeen, lastSeen: m.lastSeen,
      })),
      account: account
        ? { cash: account.cash, realizedPnl: account.realizedPnl, fees: account.fees, interest: account.interest, startedOn: account.startedOn }
        : null,
      date,
      dates,
      snapshot: snapshot
        ? {
            date: snapshot.snap_date, session: snapshot.session, equity, cash: Number(snapshot.cash),
            marginUsed: Number(snapshot.margin_used), positionsValue: Number(snapshot.positions_value),
            dayPnl: Number(snapshot.day_pnl), totalPnl: Number(snapshot.total_pnl), totalReturnPct: Number(snapshot.total_return_pct),
          }
        : null,
      positions: snapshot?.positions ?? [],
      trades: trades.map((t) => ({
        id: t.id, ts: t.ts, session: t.session, symbol: t.symbol, kind: t.kind, action: t.action, qty: Number(t.qty),
        price: Number(t.price), strike: t.strike == null ? null : Number(t.strike), expiry: t.expiry,
        amount: Number(t.amount), fees: Number(t.fees), reason: t.reason, status: t.status,
      })),
      note: note ? { highlights: note.highlights, learnings: note.learnings, narrative: note.narrative, stats: note.stats } : null,
      series: (series.get(profileId) ?? []).map((p) => ({ date: p.date, equity: p.equity })),
      winRate: { ...winRate, pct: winRate.wins + winRate.losses > 0 ? (winRate.wins / (winRate.wins + winRate.losses)) * 100 : null },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load profile" }, { status: 500 });
  }
}
