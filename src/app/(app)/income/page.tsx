import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";
import { getSettings } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-3">
      <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-stone-900 dark:text-text mt-1">{value}</p>
      {sub && <p className="text-[10px] text-stone-500 dark:text-text-subtle mt-0.5">{sub}</p>}
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computePremium(legs: any[]) {
  return legs
    .filter((l: { type: string }) => l.type === "short_call" || l.type === "short_put")
    .reduce(
      (sum: number, l: { entry_price: number; quantity?: number }) =>
        sum + Math.abs(l.entry_price) * (l.quantity ?? 1) * 100,
      0
    );
}

export default async function IncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let positions: any[] = [];
  try {
    positions = await getPositions(user.id);
  } catch {
    // If table doesn't exist yet or other error, treat as empty
  }

  const settings = await getSettings(user.id);
  const startingCash = settings?.starting_cash ?? 20000;

  // Calculate totals
  const activePositions = positions.filter((p) => p.status === "active");
  const closedPositions = positions.filter((p) => p.status === "closed");

  const totalPremium = positions.reduce(
    (sum, p) => sum + computePremium(p.position_legs ?? []),
    0
  );

  // Group by month using entry_date
  const monthlyMap = new Map<string, number>();
  for (const p of positions) {
    const date = p.entry_date ? new Date(p.entry_date) : new Date(p.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + computePremium(p.position_legs ?? []));
  }

  // Sort months chronologically
  const monthlyData = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, premium]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1).toLocaleString("en-US", {
        month: "short",
      });
      return { month, label, premium };
    });

  const monthsActive = monthlyData.length || 1;
  const monthlyAvg = Math.round(totalPremium / monthsActive);
  const annualizedYield =
    startingCash > 0
      ? ((totalPremium / startingCash) * (12 / monthsActive) * 100).toFixed(1)
      : "0.0";

  const maxMonthly = Math.max(...monthlyData.map((m) => m.premium), 1);

  // Empty state
  if (positions.length === 0) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-5">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">Income Dashboard</h2>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">Options premium tracker</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
          <div className="w-16 h-16 rounded-full bg-stone-100 dark:bg-surface-muted flex items-center justify-center">
            <svg className="w-8 h-8 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-stone-900 dark:text-text">No income yet</p>
            <p className="text-xs text-stone-500 dark:text-text-subtle mt-1 max-w-[240px]">
              Start tracking your options trades to see premium income here. Add your first position to get started.
            </p>
          </div>
          <Link
            href="/positions/new"
            className="mt-2 px-5 py-2.5 rounded-xl bg-stone-900 dark:bg-surface-elevated text-white text-sm font-semibold hover:bg-stone-800 dark:hover:bg-surface-muted transition-colors"
          >
            Add First Position
          </Link>
        </div>

        {/* Strategy links */}
        <div className="flex flex-col gap-2">
          <StrategyLink href="/covered-calls" title="Covered Call Optimizer" sub="Compare strikes and expirations" />
          <StrategyLink href="/wheel" title="The Wheel Visualizer" sub="Track your sell put &rarr; sell call cycles" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <div>
        <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">Income Dashboard</h2>
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">Options premium tracker</p>
      </div>

      {/* Starting capital callout */}
      <div className="rounded-xl border border-sky-200 dark:border-accent-border bg-sky-50 dark:bg-accent-bg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-sky-800 dark:text-accent-hover">Starting Capital</p>
            <p className="text-2xl font-extrabold text-sky-900 mt-0.5">${fmt(startingCash)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-sky-800 dark:text-accent-hover">Total Premium</p>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-gain-strong mt-0.5">+${fmt(totalPremium)}</p>
          </div>
        </div>
        {totalPremium > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-2 bg-sky-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min((totalPremium / startingCash) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-gain-strong">
              +{((totalPremium / startingCash) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Premium" value={`$${fmt(totalPremium)}`} sub="all time" />
        <StatCard label="Monthly Avg" value={`$${fmt(monthlyAvg)}`} sub="per month" />
        <StatCard label="Ann. Yield" value={`${annualizedYield}%`} sub="on starting capital" />
        <StatCard label="Active" value={`${activePositions.length}`} sub="open trades" />
        <StatCard label="Completed" value={`${closedPositions.length}`} sub="closed trades" />
        <StatCard label="Months Active" value={`${monthsActive}`} sub="tracking" />
      </div>

      {/* Monthly breakdown */}
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4">
        <h3 className="text-sm font-bold text-stone-900 dark:text-text mb-4">Monthly Breakdown</h3>
        <div className="flex flex-col gap-3">
          {monthlyData.map((m) => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-stone-500 dark:text-text-subtle w-8">{m.label}</span>
              <div className="flex-1 flex gap-0.5 h-6">
                <div
                  className="bg-emerald-400 rounded h-full"
                  style={{ width: `${(m.premium / maxMonthly) * 100}%` }}
                />
              </div>
              <span className="text-xs font-bold text-stone-900 dark:text-text w-14 text-right">
                ${fmt(m.premium)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-stone-100 dark:border-border-subtle">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-stone-400 dark:text-text-faint">Premium Collected</span>
          </div>
        </div>
      </div>

      {/* Strategy links */}
      <div className="flex flex-col gap-2">
        <StrategyLink href="/covered-calls" title="Covered Call Optimizer" sub="Compare strikes and expirations" />
        <StrategyLink href="/wheel" title="The Wheel Visualizer" sub="Track your sell put → sell call cycles" />
      </div>
    </div>
  );
}

function StrategyLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated hover:border-stone-300 transition-colors"
    >
      <div>
        <h3 className="text-sm font-bold text-stone-900 dark:text-text">{title}</h3>
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">{sub}</p>
      </div>
      <svg className="w-5 h-5 text-stone-400 dark:text-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
