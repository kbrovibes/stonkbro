"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UpcomingEarning, UpcomingResponse } from "@/lib/earnings-play/types";
import { CARD, EYEBROW, dayLabel, signedPct, timingShort, tone, usd } from "./format";

function Row({ e }: { e: UpcomingEarning }) {
  return (
    <Link
      href={`/earnings-play/${e.symbol}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-surface-muted transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-extrabold text-stone-900 dark:text-text">{e.symbol}</span>
          <span className="text-xs text-stone-500 dark:text-text-subtle truncate">{e.name}</span>
        </div>
        <p className="text-[11px] text-stone-500 dark:text-text-subtle mt-0.5">
          {timingShort(e.timing)} · {e.daysUntil === 0 ? "today" : `in ${e.daysUntil}d`}
        </p>
      </div>
      {e.price != null ? (
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-semibold text-stone-900 dark:text-text">{usd(e.price, 2)}</p>
          {e.changePct != null ? <p className={`text-[11px] font-mono ${tone(e.changePct)}`}>{signedPct(e.changePct, 2)}</p> : null}
        </div>
      ) : null}
      <span className="text-stone-300 dark:text-text-faint" aria-hidden>›</span>
    </Link>
  );
}

function Week({ title, events }: { title: string; events: UpcomingEarning[] }) {
  const byDay = new Map<string, UpcomingEarning[]>();
  for (const e of events) byDay.set(e.earningsDate, [...(byDay.get(e.earningsDate) ?? []), e]);
  return (
    <section className="flex flex-col gap-2">
      <h2 className={EYEBROW}>{title}</h2>
      {events.length === 0 ? (
        <div className={`${CARD} p-4 text-xs text-stone-500 dark:text-text-subtle`}>No reports from the names we watch.</div>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <div key={day} className={`${CARD} overflow-hidden`}>
            <div className="px-4 py-2 bg-stone-50 dark:bg-surface-muted text-[11px] font-bold text-stone-600 dark:text-text-muted">{dayLabel(day)}</div>
            <div className="divide-y divide-stone-100 dark:divide-border-subtle">
              {list.map((e) => <Row key={e.symbol} e={e} />)}
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export default function EarningsPlayList() {
  const router = useRouter();
  const [data, setData] = useState<UpcomingResponse | null>(null);
  const [error, setError] = useState(false);
  const [ticker, setTicker] = useState("");

  useEffect(() => {
    fetch("/api/earnings-play")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const s = ticker.trim().toUpperCase();
    if (/^[A-Z][A-Z.]{0,5}$/.test(s)) router.push(`/earnings-play/${s}`);
  };

  const thisWeek = data?.events.filter((e) => e.week === "this") ?? [];
  const nextWeek = data?.events.filter((e) => e.week === "next") ?? [];

  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-5 max-w-3xl w-full mx-auto">
      <div>
        <h1 className="text-lg font-extrabold text-stone-900 dark:text-text">Earnings Play</h1>
        <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
          Every report this week and next. Tap one for four priced option strategies — what each makes or loses on a 5–10% move, closed the session after.
        </p>
      </div>

      <form onSubmit={go} className="flex gap-2">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="Any ticker with a report coming — e.g. MU"
          autoCapitalize="characters"
          className="flex-1 px-3 py-2 rounded-lg border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated text-sm text-stone-900 dark:text-text placeholder:text-stone-400 dark:placeholder:text-text-faint"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-surface-sunken text-white text-sm font-semibold">Analyze</button>
      </form>

      {error ? (
        <div className={`${CARD} p-4 text-sm text-stone-600 dark:text-text-muted`}>Couldn’t load the earnings calendar. Try again shortly.</div>
      ) : !data ? (
        <div className="flex items-center gap-3 py-3">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-xs text-stone-500 dark:text-text-subtle">Loading this week’s reports…</span>
        </div>
      ) : (
        <>
          <Week title={`This week · from ${dayLabel(data.thisWeekOf, false)}`} events={thisWeek} />
          <Week title="Next week" events={nextWeek} />
        </>
      )}
    </div>
  );
}
