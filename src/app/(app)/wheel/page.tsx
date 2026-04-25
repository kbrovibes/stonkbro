import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { getPositions } from "@/lib/db/positions";

export const dynamic = "force-dynamic";

const stepIcons: Record<string, { emoji: string; color: string }> = {
  sell_put: { emoji: "P", color: "bg-amber-100 text-amber-700" },
  assigned: { emoji: "A", color: "bg-sky-100 text-sky-700" },
  sell_call: { emoji: "C", color: "bg-emerald-100 text-emerald-700" },
  called_away: { emoji: "X", color: "bg-violet-100 text-violet-700" },
};

type TimelineEvent = {
  step: "sell_put" | "assigned" | "sell_call" | "called_away";
  description: string;
  date: string;
  premium: number;
  cumulativeIncome: number;
  status: "active" | "closed" | "rolled";
};

type WheelSymbol = {
  symbol: string;
  currentStep: string;
  totalIncome: number;
  startingCash: number;
  totalCycles: number;
  avgCycleReturn: number;
  startDate: string;
  annualizedReturn: string;
  cycles: TimelineEvent[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatExpiry(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildWheelData(positions: any[]): WheelSymbol[] {
  const wheelStrategies = ["The Wheel", "Cash-Secured Put", "Covered Call"];
  const wheelPositions = positions.filter((p) =>
    wheelStrategies.includes(p.strategy)
  );

  // Group by symbol
  const grouped: Record<string, typeof wheelPositions> = {};
  for (const pos of wheelPositions) {
    const sym = pos.symbol;
    if (!grouped[sym]) grouped[sym] = [];
    grouped[sym].push(pos);
  }

  const result: WheelSymbol[] = [];

  for (const [symbol, posGroup] of Object.entries(grouped)) {
    // Sort positions by entry_date or created_at ascending
    const sorted = [...posGroup].sort((a, b) => {
      const da = new Date(a.entry_date ?? a.created_at).getTime();
      const db = new Date(b.entry_date ?? b.created_at).getTime();
      return da - db;
    });

    const cycles: TimelineEvent[] = [];
    let cumulativeIncome = 0;
    let cycleCount = 0;
    let latestStep = "sell_put";

    for (const pos of sorted) {
      const legs = pos.position_legs ?? [];
      const posDate =
        pos.entry_date ?? pos.created_at?.slice(0, 10) ?? "unknown";

      // Process short_put legs (CSP entries)
      const shortPuts = legs.filter(
        (l: { type: string }) => l.type === "short_put"
      );
      for (const leg of shortPuts) {
        const premium =
          Math.abs(leg.entry_price) * (leg.quantity ?? 1) * 100;
        cumulativeIncome += premium;
        cycles.push({
          step: "sell_put",
          description: `Sell $${leg.strike} Put @ ${formatExpiry(leg.expiry)}`,
          date: formatDate(posDate),
          premium: Math.round(premium),
          cumulativeIncome: Math.round(cumulativeIncome),
          status: pos.status ?? "active",
        });
        latestStep = "sell_put";
      }

      // If a CSP position was closed/rolled and there are shares, it was assigned
      const shares = legs.filter(
        (l: { type: string }) => l.type === "shares"
      );
      if (
        shares.length > 0 ||
        (shortPuts.length > 0 &&
          (pos.status === "closed" || pos.status === "rolled") &&
          pos.strategy !== "Cash-Secured Put")
      ) {
        // Assignment event - no direct premium, but mark the transition
        if (shortPuts.length > 0) {
          const assignStrike = shortPuts[0].strike;
          cycles.push({
            step: "assigned",
            description: `Assigned at $${assignStrike} - 100 shares`,
            date: formatDate(posDate),
            premium: 0,
            cumulativeIncome: Math.round(cumulativeIncome),
            status: pos.status ?? "active",
          });
          latestStep = "assigned";
          cycleCount++;
        }
      }

      // Process short_call legs (CC entries)
      const shortCalls = legs.filter(
        (l: { type: string }) => l.type === "short_call"
      );
      for (const leg of shortCalls) {
        const premium =
          Math.abs(leg.entry_price) * (leg.quantity ?? 1) * 100;
        cumulativeIncome += premium;
        cycles.push({
          step: "sell_call",
          description: `Sell $${leg.strike} Call @ ${formatExpiry(leg.expiry)}`,
          date: formatDate(posDate),
          premium: Math.round(premium),
          cumulativeIncome: Math.round(cumulativeIncome),
          status: pos.status ?? "active",
        });
        latestStep = "sell_call";
      }

      // If CC position was closed and strategy implies shares were called away
      if (
        shortCalls.length > 0 &&
        pos.status === "closed" &&
        pos.strategy !== "Covered Call"
      ) {
        const callStrike = shortCalls[0].strike;
        cycles.push({
          step: "called_away",
          description: `Called away at $${callStrike}`,
          date: formatDate(posDate),
          premium: 0,
          cumulativeIncome: Math.round(cumulativeIncome),
          status: "closed",
        });
        latestStep = "called_away";
        cycleCount++;
      }
    }

    if (cycles.length === 0) continue;

    // Calculate starting cash from first put strike
    const firstPutCycle = cycles.find((c) => c.step === "sell_put");
    const strikeMatch = firstPutCycle?.description.match(/\$(\d+)/);
    const startingCash = strikeMatch ? parseInt(strikeMatch[1]) * 100 : 10000;

    // Full cycles = pairs of assignments + called away
    const fullCycles = Math.max(
      cycleCount,
      Math.ceil(cycles.length / 2)
    );

    const totalIncome = Math.round(cumulativeIncome);
    const avgReturn =
      fullCycles > 0 ? Math.round(totalIncome / fullCycles) : totalIncome;

    // Annualized return estimation
    const startDate =
      sorted[0].entry_date ?? sorted[0].created_at?.slice(0, 10) ?? "";
    const daysSinceStart = startDate
      ? Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 365;
    const annReturn =
      startingCash > 0
        ? ((totalIncome / startingCash) * (365 / daysSinceStart) * 100).toFixed(
            1
          )
        : "0.0";

    const currentStepLabel: Record<string, string> = {
      sell_put: "Selling Put",
      assigned: "Holding Shares",
      sell_call: "Selling Call",
      called_away: "Completed",
    };

    result.push({
      symbol,
      currentStep: currentStepLabel[latestStep] ?? latestStep,
      totalIncome,
      startingCash,
      totalCycles: fullCycles,
      avgCycleReturn: avgReturn,
      startDate,
      annualizedReturn: annReturn,
      cycles,
    });
  }

  // Sort by total income descending
  result.sort((a, b) => b.totalIncome - a.totalIncome);
  return result;
}

export default async function WheelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let positions: any[] = [];
  let fetchError = false;

  if (user) {
    try {
      positions = await getPositions(user.id);
    } catch {
      fetchError = true;
    }
  }

  const wheelData = buildWheelData(positions);
  const overallIncome = wheelData.reduce((s, w) => s + w.totalIncome, 0);

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5">
      <Link
        href="/portfolio"
        className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 w-fit"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5 8.25 12l7.5-7.5"
          />
        </svg>
        Portfolio
      </Link>

      <div>
        <h2 className="text-lg font-extrabold text-stone-900">The Wheel</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Sell puts &rarr; get assigned &rarr; sell calls &rarr; repeat
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap">
        {Object.entries(stepIcons).map(([key, { emoji, color }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-[10px] font-bold`}
            >
              {emoji}
            </span>
            <span className="text-[10px] text-stone-400 capitalize">
              {key.replace("_", " ")}
            </span>
          </div>
        ))}
      </div>

      {fetchError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">
            Failed to load positions. Please try again.
          </p>
        </div>
      )}

      {/* Overall income summary */}
      {wheelData.length > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-stone-400 uppercase tracking-wide">
                Total Wheel Income
              </p>
              <p className="text-lg font-extrabold text-emerald-700">
                +${overallIncome.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-stone-400">Active Tickers</p>
              <p className="text-sm font-bold text-stone-900">
                {wheelData.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!fetchError && wheelData.length === 0 && (
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-stone-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            No Wheel Positions Yet
          </h3>
          <p className="text-xs text-stone-500 mb-1 max-w-xs mx-auto">
            The Wheel is a systematic income strategy: sell cash-secured puts on
            stocks you want to own. If assigned, sell covered calls on the
            shares. Collect premium at every step.
          </p>
          <p className="text-xs text-stone-400 mb-4 max-w-xs mx-auto">
            Start by selling a cash-secured put on a stock you would be happy
            owning at a lower price.
          </p>
          <Link
            href="/positions/new"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 px-4 py-2 rounded-lg transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            New Position
          </Link>
        </div>
      )}

      {/* Wheel cards */}
      {wheelData.map((pos) => (
        <div
          key={pos.symbol}
          className="rounded-xl border border-stone-200 bg-white overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-stone-900">
                  {pos.symbol}
                </span>
                <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                  {pos.currentStep}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-emerald-700">
                  +${pos.totalIncome.toLocaleString()}
                </p>
                <p className="text-[10px] text-stone-400">
                  {pos.annualizedReturn}% ann.
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="px-4 py-3">
            <div className="flex flex-col gap-0">
              {pos.cycles.map((cycle, i) => {
                const icon = stepIcons[cycle.step];
                const isLast = i === pos.cycles.length - 1;
                return (
                  <div key={i} className="flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded-full ${icon.color} flex items-center justify-center text-[10px] font-bold shrink-0 ${cycle.status === "active" ? "ring-2 ring-offset-1 ring-sky-300" : ""}`}
                      >
                        {icon.emoji}
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 bg-stone-200 min-h-[16px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-stone-800">
                            {cycle.description}
                          </p>
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            {cycle.date}
                          </p>
                        </div>
                        {cycle.premium > 0 && (
                          <span
                            className={`text-xs font-semibold ${cycle.step === "assigned" ? "text-stone-500" : "text-emerald-600"}`}
                          >
                            +${cycle.premium.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Cumulative bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (cycle.cumulativeIncome / pos.startingCash) * 100 * 5)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-stone-400">
                          ${cycle.cumulativeIncome.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-3 border-t border-stone-100">
            <div className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-stone-400">Cycles</p>
              <p className="text-xs font-bold text-stone-900">
                {pos.totalCycles}
              </p>
            </div>
            <div className="px-3 py-2.5 text-center border-x border-stone-100">
              <p className="text-[10px] text-stone-400">Avg/Cycle</p>
              <p className="text-xs font-bold text-stone-900">
                ${pos.avgCycleReturn.toLocaleString()}
              </p>
            </div>
            <div className="px-3 py-2.5 text-center">
              <p className="text-[10px] text-stone-400">Started</p>
              <p className="text-xs font-bold text-stone-900">
                {pos.startDate ? pos.startDate.slice(5) : "--"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
