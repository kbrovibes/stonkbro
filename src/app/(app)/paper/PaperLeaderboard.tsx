"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataRow, DataRowSkeleton, MonoNumber, SegmentedSwitch, Sparkline } from "@/components/refresh";
import type { RowBadge } from "@/components/refresh";
import { useCachedJson } from "@/lib/client-cache";
import { dateEyebrow, money, relativeTime, sessionLabel, signedMoney, signedPct, STYLE_LABEL, tone } from "./format";
import RunSessionControl from "./RunSessionControl";

export interface LeaderboardProfile {
  profile: { id: string; name: string; tagline: string; style: string[]; plan: string[] };
  series: Array<{ date: string; equity: number }>;
  equity: number;
  dayPnl: number;
  dayPct: number;
  totalPnl: number;
  totalReturnPct: number;
  openPositions: number;
}

export interface LeaderboardPayload {
  asOf: string | null;
  session: string | null;
  startCash: number;
  profiles: LeaderboardProfile[];
  desk: { date: string; highlights: string[]; learnings: string[]; narrative: string | null } | null;
  lastRun: { date: string; session: string; status: string; startedAt: string; finishedAt: string | null } | null;
}

type Metric = "today" | "total";
const METRICS = [
  { key: "today", label: "TODAY" },
  { key: "total", label: "TOTAL" },
] as const;

const EYEBROW: React.CSSProperties = { marginTop: 4, fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" };

function DeskNotes({ desk }: { desk: LeaderboardPayload["desk"] }) {
  const [open, setOpen] = useState(false);
  const body = desk?.narrative ?? desk?.highlights.join(" ") ?? null;
  return (
    <section style={{ margin: "0 var(--gutter)", borderRadius: 18, background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="refresh-pressable"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", color: "inherit", textAlign: "left", borderRadius: 18 }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>Desk notes</span>
        <span className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-dim)" }}>
          {desk ? `${dateEyebrow(desk.date)} · ${open ? "HIDE" : "SHOW"}` : "NONE YET"}
        </span>
      </button>
      {open && desk ? (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {body ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-body)" }}>{body}</p> : null}
          {desk.narrative ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
              {desk.highlights.map((h) => <li key={h}>{h}</li>)}
            </ul>
          ) : null}
          {desk.learnings.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: "var(--text-dim)" }}>
              {desk.learnings.map((l) => <li key={l}>{l}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export default function PaperLeaderboard({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [metric, setMetric] = useState<Metric>("total");
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const url = `/api/paper${reload ? `?r=${reload}` : ""}`;
  const apply = useCallback((d: LeaderboardPayload) => setData(d), []);
  useCachedJson<LeaderboardPayload>(url, apply, { ttlMs: 60_000 });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const ranked = useMemo(() => {
    if (!data) return [];
    const key = metric === "today" ? "dayPct" : "totalReturnPct";
    return [...data.profiles].sort((a, b) => b[key] - a[key]);
  }, [data, metric]);

  const combined = data
    ? data.profiles.reduce((s, p) => s + (metric === "today" ? p.dayPnl : p.totalPnl), 0)
    : 0;
  const startMillions = data ? (data.startCash * data.profiles.length) / 1_000_000 : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <header style={{ padding: "12px var(--gutter) 0" }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1 }}>Paper</h1>
        <div className="refresh-mono" style={EYEBROW}>
          {data?.asOf ? `${dateEyebrow(data.asOf)} · ${sessionLabel(data.session)} RUN` : data ? "NO RUN YET" : "LOADING"}
        </div>
      </header>

      <section style={{ padding: "4px var(--gutter) 0" }}>
        <MonoNumber
          value={combined}
          size={56}
          weight={600}
          letterSpacing="-0.04em"
          color={tone(combined)}
          format={signedMoney}
          style={{ lineHeight: 0.95 }}
        />
        <div className="refresh-mono" style={{ ...EYEBROW, marginTop: 8 }}>
          {data ? `${data.profiles.length} BOTS · $${startMillions.toFixed(1)}M START` : "10 BOTS · $1.0M START"}
        </div>
      </section>

      <div style={{ padding: "0 var(--gutter)" }}>
        <SegmentedSwitch segments={METRICS} active={metric} onChange={setMetric} aria-label="Rank by" />
      </div>

      <DeskNotes desk={data?.desk ?? null} />

      {isAdmin ? <RunSessionControl onDone={() => setReload((r) => r + 1)} /> : null}

      <div className="refresh-mono" style={{ ...EYEBROW, marginTop: 0, padding: "0 var(--gutter)" }}>
        {data?.lastRun
          ? `LAST RUN ${relativeTime(data.lastRun.finishedAt ?? data.lastRun.startedAt, now).toUpperCase()} · ${sessionLabel(data.lastRun.session)} · ${data.lastRun.status.toUpperCase()}`
          : data
            ? "LAST RUN NEVER"
            : ""}
      </div>

      <section style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 var(--gutter)" }}>
        {!data
          ? Array.from({ length: 10 }, (_, i) => <DataRowSkeleton key={i} sparkline />)
          : ranked.map((row, i) => {
              const value = metric === "today" ? row.dayPct : row.totalReturnPct;
              const badges: RowBadge[] = [
                { label: `#${i + 1}`, tone: i === 0 ? "info" : "fact" },
                ...row.profile.style.slice(0, 2).map((s) => ({ label: STYLE_LABEL[s] ?? s.toUpperCase(), tone: "fact" as const })),
              ];
              const points = row.series.map((p) => p.equity);
              return (
                <DataRow
                  key={row.profile.id}
                  index={i}
                  ticker={row.profile.name}
                  badges={badges}
                  caption={row.profile.tagline}
                  sparkline={points.length >= 2 ? <Sparkline points={points} /> : undefined}
                  value={
                    <MonoNumber value={value} size={17} weight={600} color={tone(value)} format={(n) => signedPct(n)} countUp={false} />
                  }
                  subValue={
                    <span className="refresh-mono" style={{ fontSize: 12, color: "var(--text-dim)" }}>{money(row.equity)}</span>
                  }
                  onPress={() => router.push(`/paper/${row.profile.id}`)}
                />
              );
            })}
      </section>
    </div>
  );
}
