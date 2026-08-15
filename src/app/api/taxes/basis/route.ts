import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import { upsertBasisOverride, deleteBasisOverride } from "@/lib/db/tax-equities";

export const dynamic = "force-dynamic";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!hasPortfolioAccess(user.email)) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Set (or replace) the cost basis for a needs-basis stock sale. */
export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;

  const body = await req.json().catch(() => ({}));
  const eventKey = typeof body.event_key === "string" ? body.event_key : "";
  const costBasis = Number(body.cost_basis);
  const acquiredDate = typeof body.acquired_date === "string" ? body.acquired_date : "";

  if (!eventKey || !Number.isFinite(costBasis) || costBasis < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(acquiredDate)) {
    return NextResponse.json(
      { error: "Expected { event_key, cost_basis >= 0, acquired_date: YYYY-MM-DD }" },
      { status: 400 }
    );
  }

  try {
    const row = await upsertBasisOverride(user.id, {
      event_key: eventKey,
      cost_basis: costBasis,
      acquired_date: acquiredDate,
      note: typeof body.note === "string" ? body.note : null,
    });
    return NextResponse.json({ override: row });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;
  const { searchParams } = new URL(req.url);
  const eventKey = searchParams.get("event_key");
  if (!eventKey) return NextResponse.json({ error: "event_key required" }, { status: 400 });
  try {
    await deleteBasisOverride(user.id, eventKey);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
