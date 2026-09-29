"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisResult, EarningsPlayAnalysis } from "@/lib/earnings-play/types";
import { CARD, EYEBROW, dayLabel, signedPct, tone, usd } from "../format";
import { PriceChart } from "./charts";
import { StrategyCard } from "./StrategyCard";

const REGIME: Record<string, { label: string; note: string }> = {
  rich: { label: "Rich", note: "priced above its past moves" },
  fair: { label: "Fair", note: "in line with its past moves" },
  cheap: { label: "Cheap", note: "priced below its past moves" },
  unknown: { label: "—", note: "no report history" },
};

function Chip({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-3 rounded-lg bg-stone-50 dark:bg-surface-muted">
      <p className={EYEBROW}>{label}</p>
      <p className="text-[15px] font-extrabold mt-1 text-stone-900 dark:text-text font-mono">{value}</p>
      {sub ? <p className="text-[10.5px] text-stone-500 dark:text-text-subtle mt-0.5 leading-snug">{sub}</p> : null}
    </div>
  );
}

function Timeline({ a }: { a: EarningsPlayAnalysis }) {
  const steps = [
    { k: "Enter", d: a.entryDate, note: "before the close" },
    { k: "Report", d: a.earningsDate, note: a.timingLabel || "time TBA" },
    { k: "Exit", d: a.exitDate, note: "first session after" },
    { k: "Expiry", d: a.expiry, note: "don't hold to here" },
  ];
  return (
    <ol className="grid grid-cols-4 gap-1.5">
      {steps.map((s, i) => (
        <li key={s.k} className={`p-2 rounded-lg text-center ${i === 2 ? "bg-sky-50 dark:bg-accent-bg" : "bg-stone-50 dark:bg-surface-muted"}`}>
          <p className={EYEBROW}>{s.k}</p>
          <p className="text-xs font-bold text-stone-900 dark:text-text mt-0.5">{dayLabel(s.d)}</p>
          <p className="text-[10px] text-stone-500 dark:text-text-subtle">{s.note}</p>
        </li>
      ))}
    </ol>
  );
}

function SetupRead({ a }: { a: EarningsPlayAnalysis }) {
  const maxW = Math.max(...a.drivers.map((d) => Math.abs(d.weight)), 0.01);
  const leanTone = a.bias === "bullish" ? "text-emerald-700 dark:text-gain-strong" : a.bias === "bearish" ? "text-rose-700 dark:text-loss-strong" : "text-stone-700 dark:text-text-muted";
  return (
    <section className={`${CARD} p-4 flex flex-col gap-4`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-extrabold text-stone-900 dark:text-text">Setup read</h2>
        <span className={`text-xs font-bold ${leanTone}`}>
          Leans {a.bias} · {a.biasScore >= 0 ? "+" : "−"}{Math.abs(a.biasScore).toFixed(2)}
        </span>
      </div>
      {a.thesis ? (
        <div className="flex flex-col gap-3">
          <p className="text-[14px] leading-relaxed text-stone-800 dark:text-text">{a.thesis.read}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[["Watch in the report", a.thesis.watch], ["What breaks it", a.thesis.risks]].map(([t, items]) => (
              (items as string[]).length ? (
                <div key={t as string}>
                  <p className={`${EYEBROW} mb-1`}>{t as string}</p>
                  <ul className="pl-4 list-disc flex flex-col gap-1 marker:text-stone-300">
                    {(items as string[]).map((x) => <li key={x} className="text-[12.5px] text-stone-700 dark:text-text-muted">{x}</li>)}
                  </ul>
                </div>
              ) : null
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <p className={`${EYEBROW} mb-2`}>What sets the lean</p>
        <ul className="flex flex-col gap-1.5">
          {a.drivers.map((d) => (
            <li key={d.label} className="grid grid-cols-[1fr_90px_44px] items-center gap-2 text-[12.5px]">
              <span className="text-stone-700 dark:text-text-muted">{d.label}</span>
              <span className="h-1.5 rounded-full bg-stone-100 dark:bg-surface-muted relative overflow-hidden">
                <span
                  className={`absolute top-0 h-full ${d.weight > 0 ? "bg-emerald-500 dark:bg-gain left-1/2" : "bg-rose-500 dark:bg-loss right-1/2"}`}
                  style={{ width: `${(Math.abs(d.weight) / maxW) * 50}%` }}
                />
              </span>
              <span className={`text-right font-mono text-[11px] ${tone(d.weight)}`}>{d.weight > 0 ? "+" : "−"}{Math.abs(d.weight).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        {a.technicals.signals.length ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {a.technicals.signals.map((s) => (
              <span key={s} className="text-[10.5px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-surface-muted text-stone-600 dark:text-text-muted">{s}</span>
            ))}
          </div>
        ) : null}
        <p className="text-[11px] text-stone-500 dark:text-text-subtle mt-2">
          RSI {a.technicals.rsi14.toFixed(0)} · 5d {signedPct(a.technicals.change5d)} · 20d {signedPct(a.technicals.change20d)} · support ${a.technicals.support.toFixed(2)} · resistance ${a.technicals.resistance.toFixed(2)}
        </p>
      </div>
    </section>
  );
}

function PastReports({ a }: { a: EarningsPlayAnalysis }) {
  if (a.pastReactions.length === 0) return null;
  const estimated = a.pastReactions.some((r) => r.source === "estimated");
  return (
    <section className={`${CARD} p-4`}>
      <h2 className="text-sm font-extrabold text-stone-900 dark:text-text">Last {a.pastReactions.length} reports</h2>
      <p className="text-[11px] text-stone-500 dark:text-text-subtle mt-0.5">
        {estimated ? "Report dates unavailable — biggest move near each expected report date (estimate)." : "How the stock moved the session that reacted to each report."}
      </p>
      <table className="w-full mt-3 text-[12px]">
        <thead>
          <tr className={EYEBROW}>
            <th className="text-left py-1 font-semibold">{estimated ? "Session" : "Reported"}</th>
            <th className="text-right py-1 font-semibold">EPS vs est.</th>
            <th className="text-right py-1 font-semibold">Stock reaction</th>
          </tr>
        </thead>
        <tbody>
          {a.pastReactions.map((r) => (
            <tr key={r.date} className="border-t border-stone-100 dark:border-border-subtle">
              <td className="py-1.5 text-stone-700 dark:text-text-muted">
                {dayLabel(r.reportDate ?? r.date, false)}{r.fiscalQuarter ? <span className="text-stone-400 dark:text-text-faint"> · {r.fiscalQuarter}</span> : null}
              </td>
              <td className={`py-1.5 text-right font-mono ${r.surprisePct == null ? "text-stone-400" : tone(r.surprisePct)}`}>
                {r.surprisePct == null ? "—" : `${r.surprisePct >= 0 ? "beat " : "miss "}${signedPct(r.surprisePct)}`}
              </td>
              <td className={`py-1.5 text-right font-mono font-semibold ${tone(r.movePct)}`}>{signedPct(r.movePct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function News({ a }: { a: EarningsPlayAnalysis }) {
  if (a.news.headlines.length === 0) return null;
  return (
    <section className={`${CARD} p-4`}>
      <h2 className="text-sm font-extrabold text-stone-900 dark:text-text">Recent headlines</h2>
      <p className="text-[11px] text-stone-500 dark:text-text-subtle mt-0.5">{a.news.oneLine}</p>
      <ul className="mt-2 flex flex-col divide-y divide-stone-100 dark:divide-border-subtle">
        {a.news.headlines.map((h) => (
          <li key={h.url} className="py-2">
            <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-[13px] text-stone-800 dark:text-text hover:text-sky-700 dark:hover:text-accent leading-snug">
              {h.title}
            </a>
            <p className="text-[10.5px] text-stone-400 dark:text-text-faint mt-0.5">
              {h.publisher ? `${h.publisher} · ` : ""}{new Date(h.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EarningsPlayView({ a, back }: { a: EarningsPlayAnalysis; back: React.ReactNode }) {
  const regime = REGIME[a.regime];
  return (
    <div className="flex flex-col flex-1 px-4 py-5 gap-4 max-w-3xl w-full mx-auto">
      {back}

      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-text">{a.symbol}</h1>
          <span className="text-sm text-stone-500 dark:text-text-subtle">{a.name}</span>
        </div>
        <p className="text-sm text-stone-700 dark:text-text-muted">
          <span className="font-mono font-bold text-stone-900 dark:text-text">{usd(a.spot, 2)}</span>{" "}
          <span className={tone(a.changePct)}>{signedPct(a.changePct, 2)}</span>
          <span className="text-stone-400 dark:text-text-faint"> · </span>
          Reports {dayLabel(a.earningsDate)} {a.timingLabel ? a.timingLabel : ""} · {a.daysUntil === 0 ? "today" : `in ${a.daysUntil} day${a.daysUntil === 1 ? "" : "s"}`}
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Chip label="Market expects" value={`±${a.impliedMovePct.toFixed(1)}%`} sub={`±${usd(a.impliedMoveUsd, 2)} · ${dayLabel(a.expiry, false)} straddle`} />
        <Chip label="Past reports avg" value={a.histAvgMovePct != null ? `±${a.histAvgMovePct.toFixed(1)}%` : "—"} sub={`last ${a.pastReactions.length} reactions`} />
        <Chip label="Premium" value={regime.label} sub={regime.note} />
        <Chip label="IV crush" value={`${(a.vol.frontIv * 100).toFixed(0)}→${(a.vol.baseIv * 100).toFixed(0)}%`} sub="front-expiry IV before → after" />
      </div>

      <Timeline a={a} />

      <section className={`${CARD} p-4`}>
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-sm font-extrabold text-stone-900 dark:text-text">Three months, the 50-day, and the move being priced</h2>
        </div>
        <PriceChart points={a.chart} spot={a.spot} impliedMovePct={a.impliedMovePct} />
      </section>

      <SetupRead a={a} />

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-stone-900 dark:text-text">Four ways to play it</h2>
          <p className="text-xs text-stone-500 dark:text-text-subtle mt-0.5">
            Ranked by what each does on a 5–10% move — {a.bias === "neutral" ? "weighted evenly both ways" : `weighted toward the ${a.bias} lean`} — closed on {dayLabel(a.exitDate)}. One contract or spread each; scale to taste.
          </p>
        </div>
        {a.strategies.map((s, i) => <StrategyCard key={s.id} plan={s} rank={i + 1} spot={a.spot} />)}
      </section>

      <PastReports a={a} />
      <News a={a} />

      <footer className="text-[11px] leading-relaxed text-stone-500 dark:text-text-subtle pb-4">
        How the numbers are made: every leg is repriced with Black–Scholes at midday on {dayLabel(a.exitDate)} for each stock move, with implied vol cut from {(a.vol.frontIv * 100).toFixed(0)}% to ~{(a.vol.baseIv * 100).toFixed(0)}%
        {a.vol.method === "term-structure" ? " — the level left once the one-day earnings jump priced into the front expiry is stripped out, measured against the next expiry" : " — estimated from realized volatility"}.
        Fills assume 10% of the bid/ask spread away from mid each way, plus $0.65 per contract. Real post-earnings IV and liquidity vary; weekends and holidays aren’t modeled beyond skipping Saturday and Sunday. Not investment advice.
      </footer>
    </div>
  );
}

export default function EarningsPlayDetail({ symbol }: { symbol: string }) {
  const [state, setState] = useState<{ loading: boolean; result: AnalysisResult | null }>({ loading: true, result: null });

  useEffect(() => {
    let live = true;
    fetch(`/api/earnings-play/${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((result: AnalysisResult) => { if (live) setState({ loading: false, result }); })
      .catch(() => { if (live) setState({ loading: false, result: { ok: false, symbol, reason: "Couldn’t reach the server." } }); });
    return () => { live = false; };
  }, [symbol]);

  const back = (
    <Link href="/earnings-play" className="text-xs font-semibold text-sky-700 dark:text-accent">← This week’s reports</Link>
  );

  if (state.loading) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-4">
        {back}
        <div className="flex items-center gap-3 py-6">
          <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="text-xs text-stone-500 dark:text-text-subtle">Pricing {symbol}’s option chain, reading technicals, news and past reports…</span>
        </div>
      </div>
    );
  }
  const r = state.result;
  if (!r || !r.ok) {
    return (
      <div className="flex flex-col flex-1 px-4 py-5 gap-4">
        {back}
        <div className={`${CARD} p-5 text-sm text-stone-600 dark:text-text-muted`}>{r?.reason ?? "Something went wrong."}</div>
      </div>
    );
  }

  return <EarningsPlayView a={r.analysis} back={back} />;
}
