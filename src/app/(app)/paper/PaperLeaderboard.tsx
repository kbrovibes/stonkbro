"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BotAvatar from "@/components/paper/BotAvatar";
import { MonoNumber, SegmentedSwitch, Sparkline, StatTile } from "@/components/refresh";
import { useCachedJson } from "@/lib/client-cache";
import { dateEyebrow, money, relativeTime, sessionLabel, signedMoney, signedPct, tone } from "./format";
import RunSessionControl from "./RunSessionControl";

export interface LeaderboardProfile {
  profile: { id: string; name: string; tagline: string; style: string[]; plan: string[] };
  identity: { role: string; creed: string; hue: string };
  memoryCount: number;
  series: Array<{ date: string; equity: number }>;
  equity: number;
  cash: number;
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

const EYEBROW: React.CSSProperties = { fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" };

function DeskNotes({ desk }: { desk: LeaderboardPayload["desk"] }) {
  const [open, setOpen] = useState(false);
  return (
    <section style={{ borderRadius: 18, background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="refresh-pressable"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", color: "inherit", textAlign: "left", borderRadius: 18 }}
        aria-expanded={open}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>Desk notes</span>
        <span className="refresh-mono" style={{ ...EYEBROW, letterSpacing: "0.1em" }}>
          {desk ? `${dateEyebrow(desk.date)} · ${open ? "HIDE" : "SHOW"}` : "NONE YET"}
        </span>
      </button>
      {open && desk ? (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {desk.narrative ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-body)" }}>{desk.narrative}</p> : null}
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            {desk.highlights.map((h) => <li key={h}>{h}</li>)}
          </ul>
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

function BoardRow({ rank, row, metric, onPress }: {
  rank: number;
  row: LeaderboardProfile;
  metric: Metric;
  onPress: () => void;
}) {
  const value = metric === "today" ? row.dayPct : row.totalReturnPct;
  const points = row.series.map((p) => p.equity);
  return (
    <button
      type="button"
      onClick={onPress}
      className="refresh-pressable"
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
        padding: "13px 14px 13px 10px", background: "none", color: "inherit",
        border: "none", borderTop: "1px solid var(--hairline-soft)",
        borderLeft: `2px solid ${rank === 1 ? row.identity.hue : "transparent"}`,
      }}
    >
      <span className="refresh-mono" style={{ ...EYEBROW, width: 20, flex: "none" }}>
        {String(rank).padStart(2, "0")}
      </span>
      <BotAvatar profileId={row.profile.id} size={38} ring="hairline" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 15, fontWeight: 600, lineHeight: "20px", color: "var(--text-primary)" }}>
          {row.profile.name}
        </span>
        <span style={{ display: "block", fontSize: 12.5, lineHeight: "17px", color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {row.identity.role}
        </span>
      </span>
      {points.length >= 2 ? (
        <span style={{ flex: "none", width: 54, opacity: 0.75 }}><Sparkline points={points} /></span>
      ) : null}
      <span style={{ flex: "none", textAlign: "right" }}>
        <MonoNumber value={row.equity} size={14.5} weight={600} format={(n) => money(n)} countUp={false} />
        <span style={{ display: "block", marginTop: 2 }}>
          <MonoNumber value={value} size={12.5} weight={600} color={tone(value)} format={(n) => signedPct(n)} countUp={false} />
        </span>
      </span>
    </button>
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

  const combined = data ? data.profiles.reduce((s, p) => s + (metric === "today" ? p.dayPnl : p.totalPnl), 0) : 0;
  const startMillions = data ? (data.startCash * data.profiles.length) / 1_000_000 : 1;
  const memories = data ? data.profiles.reduce((s, p) => s + p.memoryCount, 0) : 0;
  const done = data?.lastRun?.status === "completed";

  const totalEquity = data ? data.profiles.reduce((s, p) => s + p.equity, 0) : 0;
  const totalCash = data ? data.profiles.reduce((s, p) => s + p.cash, 0) : 0;
  const totalStartCash = data ? data.startCash * data.profiles.length : 0;
  const combinedBaseline = metric === "today" ? totalEquity - combined : totalStartCash;
  const combinedPct = combinedBaseline > 0 ? (combined / combinedBaseline) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "12px var(--gutter) 28px" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1, margin: 0 }}>Paper</h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)", maxWidth: "52ch" }}>
            Ten bots, each with its own rulebook and its own memory. Every one starts at{" "}
            <b style={{ color: "var(--text-primary)", fontWeight: 600 }}>$100,000</b> cash with a{" "}
            <b style={{ color: "var(--text-primary)", fontWeight: 600 }}>$200,000</b> margin line, and every ledger stays separate.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "none" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
              <span className={`refresh-status-dot ${done ? "refresh-status-dot-live" : "refresh-status-dot-busy"}`} aria-hidden="true" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{done ? "Cycle complete" : data?.lastRun ? "Cycle running" : "No run yet"}</span>
            </div>
            <div className="refresh-mono" style={{ ...EYEBROW, marginTop: 3 }}>
              {data?.asOf ? `${sessionLabel(data.session)} · ${dateEyebrow(data.asOf)}` : "AWAITING FIRST RUN"}
            </div>
          </div>
        </div>
      </header>

      <section>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <MonoNumber
            value={combined}
            size={52}
            weight={600}
            letterSpacing="-0.04em"
            color={tone(combined)}
            format={signedMoney}
            style={{ lineHeight: 0.95 }}
          />
          <MonoNumber
            value={combinedPct}
            size={17}
            weight={600}
            color={tone(combinedPct)}
            prefix={combinedPct >= 0 ? "+" : ""}
            suffix="%"
            countUp={false}
          />
        </div>
        <div className="refresh-mono" style={{ ...EYEBROW, marginTop: 8 }}>
          {data
            ? `${data.profiles.length} BOTS · $${startMillions.toFixed(1)}M START · ${memories} MEMORIES`
            : "10 BOTS · $1.0M START"}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <StatTile label="Portfolio value" value={<MonoNumber value={totalEquity} size={17} weight={600} format={money} countUp={false} />} />
          <StatTile label="Cash" value={<MonoNumber value={totalCash} size={17} weight={600} format={money} countUp={false} />} />
        </div>
      </section>

      <SegmentedSwitch segments={METRICS} active={metric} onChange={setMetric} aria-label="Rank by" />

      {isAdmin ? <RunSessionControl onDone={() => setReload((r) => r + 1)} /> : null}

      <section>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <div>
            <div className="refresh-eyebrow">Portfolio standings</div>
            <h2 className="refresh-heading" style={{ margin: "4px 0 0" }}>The board</h2>
          </div>
          <span className="refresh-mono" style={{ ...EYEBROW, letterSpacing: "0.1em" }}>
            {metric === "today" ? "BY TODAY" : "BY TOTAL RETURN"}
          </span>
        </div>
        <div className="paper-board" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
          {!data
            ? Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="refresh-skeleton" style={{ height: 64, borderTop: "1px solid var(--hairline-soft)" }} aria-hidden="true" />
              ))
            : ranked.map((row, i) => (
                <BoardRow
                  key={row.profile.id}
                  rank={i + 1}
                  row={row}
                  metric={metric}
                  onPress={() => router.push(`/paper/${row.profile.id}`)}
                />
              ))}
        </div>
      </section>

      <DeskNotes desk={data?.desk ?? null} />

      <div className="refresh-mono" style={EYEBROW}>
        {data?.lastRun
          ? `LAST RUN ${relativeTime(data.lastRun.finishedAt ?? data.lastRun.startedAt, now).toUpperCase()} · ${sessionLabel(data.lastRun.session)} · ${data.lastRun.status.toUpperCase()}`
          : data
            ? "LAST RUN NEVER"
            : ""}
      </div>
    </div>
  );
}
