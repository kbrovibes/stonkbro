import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { deletePin, getLatestLeapsScan, getPin, updatePin, upsertPin, type PinRecommendation } from "@/lib/db/leaps";
import { getAllOptionsChains, getQuote } from "@/lib/market/yahoo";
import { pickLeapsExpiry, recommendStrikes, scoreLeaps } from "@/lib/options/leaps-grid";
import type { LeapsPick } from "@/lib/options/leaps-scan";

const SYMBOL_RE = /^[A-Z][A-Z.\-]{0,6}$/;

function cleanSymbol(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  return SYMBOL_RE.test(s) ? s : null;
}

function fromPick(pick: LeapsPick): PinRecommendation {
  return {
    strike: pick.recommended.strike,
    mid: pick.recommended.mid,
    iv: pick.recommended.iv,
    delta: pick.recommended.delta,
    score: pick.score,
    why: pick.why,
    capturedAt: new Date().toISOString(),
    itm: pick.itm,
    otm: pick.otm,
  };
}

/** Price the chain now — for a symbol the daily scan did not rank. */
async function priceLive(
  symbol: string,
  expiry: string | null
): Promise<{ expiry: string; recommended: PinRecommendation } | null> {
  const [quote, chain] = await Promise.all([getQuote(symbol), getAllOptionsChains(symbol)]);
  if (!quote || quote.price <= 0 || !chain) return null;
  const chosen = expiry && chain.expirations.includes(expiry) ? expiry : pickLeapsExpiry(chain.expirations);
  if (!chosen) return null;
  const calls = chain.calls.filter((c) => c.expiry === chosen);
  const rec = recommendStrikes(quote.price, calls);
  if (!rec.recommended) return null;
  const contract = calls.find((c) => c.strike === rec.recommended!.strike);
  if (!contract) return null;
  const { score, why } = scoreLeaps({ quote, contract });
  return {
    expiry: chosen,
    recommended: {
      strike: rec.recommended.strike,
      mid: rec.recommended.mid,
      iv: rec.recommended.iv,
      delta: rec.recommended.delta,
      score,
      why,
      capturedAt: new Date().toISOString(),
      itm: rec.itm,
      otm: rec.otm,
    },
  };
}

/** POST { symbol, expiry?, recommended? } — pin, filling the recommendation when omitted. */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { symbol?: unknown; expiry?: unknown; recommended?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const symbol = cleanSymbol(body.symbol);
  if (!symbol) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
  const requestedExpiry = typeof body.expiry === "string" ? body.expiry.slice(0, 10) : null;

  let expiry = requestedExpiry;
  let recommended =
    body.recommended && typeof body.recommended === "object"
      ? (body.recommended as PinRecommendation)
      : null;

  if (!recommended || !expiry) {
    const scan = await getLatestLeapsScan();
    const pick = scan?.leaps.find(
      (p) => p.symbol === symbol && (!requestedExpiry || p.expiry === requestedExpiry)
    );
    if (pick) {
      expiry = pick.expiry;
      recommended = recommended ?? fromPick(pick);
    } else {
      const live = await priceLive(symbol, requestedExpiry);
      if (!live) {
        return NextResponse.json(
          { error: `No LEAPS chain priced for ${symbol} — check the symbol and try again.` },
          { status: 404 }
        );
      }
      expiry = live.expiry;
      recommended = recommended ?? live.recommended;
    }
  }

  const pin = await upsertPin(user.id, { symbol, expiry, recommended });
  return NextResponse.json({ pin });
}

/** PATCH { symbol, addStrike?, removeStrike?, compareStrike?, notes? } */
export async function PATCH(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    symbol?: unknown;
    addStrike?: unknown;
    removeStrike?: unknown;
    compareStrike?: unknown;
    notes?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const symbol = cleanSymbol(body.symbol);
  if (!symbol) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  const existing = await getPin(user.id, symbol);
  if (!existing) return NextResponse.json({ error: "Not pinned" }, { status: 404 });

  const patch: Parameters<typeof updatePin>[2] = {};
  let strikes = [...existing.strikes];

  if (typeof body.addStrike === "number" && Number.isFinite(body.addStrike) && body.addStrike > 0) {
    const strike = Math.round(body.addStrike * 100) / 100;
    if (!strikes.some((s) => s.strike === strike)) {
      strikes.push({ strike, label: `$${strike}`, addedAt: new Date().toISOString() });
      patch.strikes = strikes;
    }
  }
  if (typeof body.removeStrike === "number") {
    const strike = body.removeStrike;
    strikes = strikes.filter((s) => s.strike !== strike);
    patch.strikes = strikes;
    if (existing.compare_strike === strike) patch.compare_strike = null;
  }
  if (body.compareStrike === null) {
    patch.compare_strike = null;
  } else if (typeof body.compareStrike === "number" && Number.isFinite(body.compareStrike)) {
    patch.compare_strike = body.compareStrike;
  }
  if (typeof body.notes === "string") {
    patch.notes = body.notes.slice(0, 500);
  } else if (body.notes === null) {
    patch.notes = null;
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ pin: existing });
  const pin = await updatePin(user.id, symbol, patch);
  return NextResponse.json({ pin });
}

/** DELETE ?symbol= */
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = cleanSymbol(new URL(request.url).searchParams.get("symbol"));
  if (!symbol) return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });

  await deletePin(user.id, symbol);
  return NextResponse.json({ ok: true });
}
