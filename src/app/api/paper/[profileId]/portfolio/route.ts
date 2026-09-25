import { NextResponse } from "next/server";
import * as db from "@/lib/db/paper";
import { getProfile } from "@/lib/paper/profiles";

export const dynamic = "force-dynamic";

/**
 * The bot's full-history view: every trade it's ever made and every position
 * it's ever closed, independent of the day-chip selector the main
 * `/api/paper/[profileId]` route scopes Soul/Positions/Trades/Journal to.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const profile = getProfile(profileId);
  if (!profile) return NextResponse.json({ error: "Unknown profile" }, { status: 404 });

  try {
    const [trades, positions] = await Promise.all([
      db.getAllTradesFor(profileId),
      db.getAllPositionsFor(profileId),
    ]);

    return NextResponse.json({
      trades: trades.map((t) => ({
        id: t.id, ts: t.ts, session: t.session, symbol: t.symbol, kind: t.kind, action: t.action, qty: Number(t.qty),
        price: Number(t.price), strike: t.strike == null ? null : Number(t.strike), expiry: t.expiry,
        amount: Number(t.amount), fees: Number(t.fees), reason: t.reason, status: t.status,
      })),
      positions: positions.map((p) => ({
        id: p.id, symbol: p.symbol, kind: p.kind, side: p.side, qty: p.qty, strike: p.strike, expiry: p.expiry,
        avgPrice: p.avgPrice, openedAt: p.openedAt, closedAt: p.closedAt, closePrice: p.closePrice,
        realizedPnl: p.realizedPnl, status: p.status,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to load portfolio" }, { status: 500 });
  }
}
