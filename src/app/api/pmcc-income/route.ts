import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getLatestLeapsScan } from "@/lib/db/leaps";
import { DEFAULT_PMCC_BUDGET, rankForBudget } from "@/lib/options/pmcc-income";

/**
 * GET ?budget=20000 — the latest scan's PMCC picks, ranked for the budget.
 * `picks` carries the budget-independent fields so a client can re-rank a
 * new budget locally; `setups` is the same list already applied.
 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = Number(new URL(request.url).searchParams.get("budget"));
  const budget = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PMCC_BUDGET;

  const scan = await getLatestLeapsScan();
  const picks = scan?.pmcc ?? [];
  return NextResponse.json({
    scanAt: scan?.created_at ?? null,
    scanId: scan?.id ?? null,
    budget,
    picks,
    setups: rankForBudget(picks, budget),
  });
}
