import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getOptionChains } from "@/lib/snaptrade/client";
import { getLatestChainScan } from "@/lib/db/portfolio-chain-scans";
import { hasPortfolioAccess } from "@/lib/portfolio-access";
import {
  deleteTaxPayment,
  insertTaxPayment,
  listTaxPayments,
} from "@/lib/db/tax-payments";
import {
  computePeriods,
  computeYearSummary,
  defaultTaxYearForPayment,
  realizedEventsForYear,
} from "@/lib/taxes/estimates";
import { TAX_ASSUMPTIONS, TAX_YEAR } from "@/lib/taxes/config";
import { equityRealizedEvents } from "@/lib/taxes/equities";
import { getLatestEquityScan, listBasisOverrides } from "@/lib/db/tax-equities";

// Serve the cron-cached chain scan up to this age; covers weekends.
const CHAIN_CACHE_MAX_AGE_HOURS = 72;

export const dynamic = "force-dynamic";
// The live-fetch fallback walks SnapTrade activities under rate-limit pacing.
export const maxDuration = 300;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!hasPortfolioAccess(user.email)) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return error;

  try {
    // Prefer the cron-cached scan (window starts 2025-01-01, which is a
    // superset of tax-year 2026 closes); fall back to a live fetch.
    let chains;
    let chainsAsOf: string | null = null;
    let cached = false;
    try {
      const scan = await getLatestChainScan(CHAIN_CACHE_MAX_AGE_HOURS);
      if (scan) {
        chains = scan.chains;
        chainsAsOf = scan.created_at;
        cached = true;
      }
    } catch (e) {
      console.error("Tax Center: chain cache read failed, falling back to live fetch:", e);
    }
    if (!chains) {
      chains = await getOptionChains("2026-01-01");
      chainsAsOf = new Date().toISOString();
    }

    const optionEvents = realizedEventsForYear(chains, TAX_YEAR);
    const payments = await listTaxPayments(user.id, TAX_YEAR);
    const todayISO = new Date().toISOString().slice(0, 10);

    // Stock sales: latest cached FIFO scan + this user's basis overrides.
    // Missing scan just means the equities section shows "never synced".
    let equityInfo: {
      lastSyncedAt: string | null;
      saleCount: number;
      needsBasis: ReturnType<typeof equityRealizedEvents>["needsBasis"];
    } = { lastSyncedAt: null, saleCount: 0, needsBasis: [] };
    let equityEvents: ReturnType<typeof equityRealizedEvents>["events"] = [];
    try {
      const [scan, overrides] = await Promise.all([
        getLatestEquityScan(),
        listBasisOverrides(user.id),
      ]);
      if (scan?.events) {
        const realized = equityRealizedEvents(scan.events, overrides, TAX_YEAR);
        equityEvents = realized.events;
        equityInfo = {
          lastSyncedAt: scan.created_at,
          saleCount: scan.events.filter((s) => s.sell_date.startsWith(`${TAX_YEAR}-`)).length,
          needsBasis: realized.needsBasis,
        };
      }
    } catch (e) {
      console.error("Tax Center: equity scan read failed (continuing without):", e);
    }

    const events = [...optionEvents, ...equityEvents];

    return NextResponse.json({
      periods: computePeriods(events, payments, todayISO),
      yearSummary: computeYearSummary(events, payments, TAX_YEAR),
      payments,
      assumptions: TAX_ASSUMPTIONS,
      chainsAsOf,
      cached,
      equities: equityInfo,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Tax Center GET failed:", detail);
    return NextResponse.json(
      { error: "Failed to compute tax estimates", detail: detail.slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;

  let body: { paid_date?: unknown; amount?: unknown; note?: unknown; tax_year?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const paidDate = typeof body.paid_date === "string" ? body.paid_date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate) || Number.isNaN(Date.parse(paidDate))) {
    return NextResponse.json({ error: "paid_date must be YYYY-MM-DD" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
    return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
  }

  const note =
    typeof body.note === "string" && body.note.trim().length > 0
      ? body.note.trim().slice(0, 500)
      : null;

  const taxYear =
    typeof body.tax_year === "number" && Number.isInteger(body.tax_year)
      ? body.tax_year
      : defaultTaxYearForPayment(paidDate);

  try {
    const payment = await insertTaxPayment(user.id, {
      tax_year: taxYear,
      paid_date: paidDate,
      amount,
      note,
    });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Tax Center POST failed:", detail);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { user, error } = await requireUser();
  if (!user) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await deleteTaxPayment(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("Tax Center DELETE failed:", detail);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
