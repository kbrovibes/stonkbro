"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import BotAvatar from "@/components/paper/BotAvatar";
import { MonoNumber, SegmentedSwitch, Sparkline, StatTile } from "@/components/refresh";
import { useCachedJson } from "@/lib/client-cache";
import { useSort, type SortDir } from "@/hooks/useSort";
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

const BOARD_TH: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)",
  fontWeight: 500, textAlign: "right", padding: "0 0 8px 14px", whiteSpace: "nowrap",
};

type BoardSortKey = "name" | "positions" | "equity" | "today" | "total";

/** A `<th>` matching BOARD_TH whose label is a click-to-sort toggle. */
function BoardSortTh({
  label, sortKey, currentKey, currentDir, onToggle, align = "right", thStyle,
}: {
  label: string;
  sortKey: BoardSortKey;
  currentKey: BoardSortKey;
  currentDir: SortDir;
  onToggle: (key: BoardSortKey) => void;
  align?: "left" | "right";
  thStyle?: React.CSSProperties;
}) {
  const active = currentKey === sortKey;
  const arrow = !active ? "↕" : currentDir === "asc" ? "↑" : "↓";
  return (
    <th style={{ ...BOARD_TH, textAlign: align, ...thStyle }}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
          background: "none", border: "none", padding: 0, font: "inherit",
          color: active ? "var(--text-primary)" : "var(--text-dim)",
          justifyContent: align === "right" ? "flex-end" : "flex-start",
          width: align === "right" ? "100%" : undefined,
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: 8, opacity: active ? 1 : 0.4 }}>{arrow}</span>
      </button>
    </th>
  );
}

function BoardRow({ rank, row, onPress }: {
  rank: number;
  row: LeaderboardProfile;
  onPress: () => void;
}) {
  const points = row.series.map((p) => p.equity);
  return (
    <tr
      onClick={onPress}
      className="refresh-pressable"
      style={{ cursor: "pointer", borderTop: "1px solid var(--hairline-soft)" }}
    >
      <td style={{ padding: "10px 0 10px 10px", borderLeft: `2px solid ${rank === 1 ? row.identity.hue : "transparent"}` }}>
        <span className="refresh-mono" style={{ ...EYEBROW, fontSize: 11 }}>{String(rank).padStart(2, "0")}</span>
      </td>
      <td style={{ padding: "10px 0 10px 14px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <BotAvatar profileId={row.profile.id} size={32} ring="hairline" />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14.5, fontWeight: 600, lineHeight: "19px", color: "var(--text-primary)" }}>
              {row.profile.name}
            </span>
            <span style={{ display: "block", fontSize: 12, lineHeight: "16px", color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.identity.role}
            </span>
          </span>
        </span>
      </td>
      <td style={{ padding: "10px 0 10px 14px", textAlign: "right" }}>
        {points.length >= 2 ? (
          <span style={{ display: "inline-block", width: 54, opacity: 0.75 }}><Sparkline points={points} /></span>
        ) : null}
      </td>
      <td style={{ padding: "10px 0 10px 14px", textAlign: "right" }}>
        <MonoNumber value={row.openPositions} size={13} weight={500} countUp={false} />
      </td>
      <td style={{ padding: "10px 0 10px 14px", textAlign: "right" }}>
        <MonoNumber value={row.equity} size={14.5} weight={600} format={(n) => money(n)} countUp={false} />
      </td>
      <td style={{ padding: "10px 0 10px 14px", textAlign: "right" }}>
        <MonoNumber value={row.dayPct} size={13} weight={600} color={tone(row.dayPct)} format={(n) => signedPct(n)} countUp={false} />
      </td>
      <td style={{ padding: "10px 14px 10px 14px", textAlign: "right" }}>
        <MonoNumber value={row.totalReturnPct} size={13} weight={600} color={tone(row.totalReturnPct)} format={(n) => signedPct(n)} countUp={false} />
      </td>
    </tr>
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

  const { sorted: ranked, sortKey: boardSortKey, sortDir: boardSortDir, toggleSort: toggleBoardSort } = useSort<LeaderboardProfile, BoardSortKey>(
    data?.profiles ?? [],
    (p, key) => {
      switch (key) {
        case "name": return p.profile.name;
        case "positions": return p.openPositions;
        case "equity": return p.equity;
        case "today": return p.dayPct;
        case "total": return p.totalReturnPct;
      }
    },
    "total",
    { ascKeys: ["name"] }
  );

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
            SORTED BY {boardSortKey.toUpperCase()} {boardSortDir === "asc" ? "↑" : "↓"}
          </span>
        </div>
        {!data ? (
          <div className="paper-board" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="refresh-skeleton" style={{ height: 64, borderTop: "1px solid var(--hairline-soft)" }} aria-hidden="true" />
            ))}
          </div>
        ) : (
          <div className="paper-scroll" style={{ borderBottom: "1px solid var(--hairline-soft)" }}>
            <table className="refresh-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  <BoardSortTh label="#" sortKey="name" align="left" thStyle={{ paddingLeft: 10 }} currentKey={boardSortKey} currentDir={boardSortDir} onToggle={toggleBoardSort} />
                  <BoardSortTh label="Bot" sortKey="name" align="left" currentKey={boardSortKey} currentDir={boardSortDir} onToggle={toggleBoardSort} />
                  <th style={{ ...BOARD_TH, textAlign: "right" }}>Trend</th>
                  <BoardSortTh label="Positions" sortKey="positions" currentKey={boardSortKey} currentDir={boardSortDir} onToggle={toggleBoardSort} />
                  <BoardSortTh label="Equity" sortKey="equity" currentKey={boardSortKey} currentDir={boardSortDir} onToggle={toggleBoardSort} />
                  <BoardSortTh label="Today" sortKey="today" currentKey={boardSortKey} currentDir={boardSortDir} onToggle={toggleBoardSort} />
                  <BoardSortTh label="Total" sortKey="total" align="right" thStyle={{ paddingRight: 14 }} currentKey={boardSortKey} currentDir={boardSortDir} onToggle={toggleBoardSort} />
                </tr>
              </thead>
              <tbody>
                {ranked.map((row, i) => (
                  <BoardRow
                    key={row.profile.id}
                    rank={i + 1}
                    row={row}
                    onPress={() => router.push(`/paper/${row.profile.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
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
