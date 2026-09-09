"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Badge, ChipRow, HeroChart, MonoNumber, StatTile } from "@/components/refresh";
import type { Chip } from "@/components/refresh";
import { useCachedJson } from "@/lib/client-cache";
import { dateEyebrow, money, sessionLabel, shortDate, signedMoney, signedPct, STYLE_LABEL, tone } from "../format";
import {
  NotesBlock,
  PlanDisclosure,
  PositionsList,
  SectionHeading,
  TradesList,
  type MarkedPositionView,
  type NoteView,
  type TradeView,
} from "./ProfileSections";

interface ProfilePayload {
  profile: { id: string; name: string; tagline: string; style: string[]; plan: string[]; margin: boolean };
  account: { cash: number; realizedPnl: number; fees: number; interest: number; startedOn: string } | null;
  date: string | null;
  dates: string[];
  snapshot: {
    date: string; session: string; equity: number; cash: number; marginUsed: number; positionsValue: number;
    dayPnl: number; totalPnl: number; totalReturnPct: number;
  } | null;
  positions: MarkedPositionView[];
  trades: TradeView[];
  note: NoteView | null;
  series: Array<{ date: string; equity: number }>;
  winRate: { wins: number; losses: number; pct: number | null };
}

const START = 100_000;

function Circle({ value }: { value: number }) {
  return (
    <div
      aria-label={`Total return ${signedPct(value)}`}
      style={{
        width: 64, height: 64, flex: "none", borderRadius: "50%",
        border: "2px solid var(--accent)", background: "var(--accent-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <MonoNumber value={value} size={13} weight={700} color="var(--accent)" format={(n) => signedPct(n, 1)} countUp={false} />
    </div>
  );
}

export default function ProfileScreen({ profileId }: { profileId: string }) {
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const url = `/api/paper/${profileId}${date ? `?date=${date}` : ""}`;
  const apply = useCallback((d: ProfilePayload) => setData(d), []);
  useCachedJson<ProfilePayload>(url, apply, { ttlMs: 60_000 });

  const chips = useMemo<Chip[]>(() => (data?.dates ?? []).slice(0, 30).map((d) => ({ key: d, label: shortDate(d) })), [data?.dates]);
  const snap = data?.snapshot ?? null;
  const equity = snap?.equity ?? START;
  const totalReturn = snap?.totalReturnPct ?? 0;
  const points = data?.series.map((p) => p.equity) ?? [];

  if (!data) {
    return (
      <div style={{ padding: "12px var(--gutter)" }}>
        <Link href="/paper" className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" }}>← PAPER</Link>
        <div className="refresh-skeleton" style={{ marginTop: 16, height: 120, borderRadius: 18, background: "var(--surface-1)" }} aria-hidden="true" />
      </div>
    );
  }

  const { profile, winRate } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 24 }}>
      <header style={{ padding: "12px var(--gutter) 0" }}>
        <Link href="/paper" className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)", textDecoration: "none" }}>
          ← PAPER
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1, margin: 0 }}>{profile.name}</h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.4, color: "var(--text-subtle)" }}>{profile.tagline}</p>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {profile.style.map((s) => <Badge key={s} label={STYLE_LABEL[s] ?? s.toUpperCase()} tone="fact" />)}
            </div>
          </div>
          <Circle value={totalReturn} />
        </div>
        <div className="refresh-mono" style={{ marginTop: 10, fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" }}>
          {snap ? `${dateEyebrow(snap.date)} · ${sessionLabel(snap.session)} RUN` : "NO RUN YET"}
        </div>
      </header>

      <PlanDisclosure plan={profile.plan} open={planOpen} onToggle={() => setPlanOpen((v) => !v)} />

      <section style={{ padding: "0 var(--gutter)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <StatTile label="Equity" value={<MonoNumber value={equity} size={17} format={(n) => money(n)} countUp={false} />} />
          <StatTile label="Cash" value={<MonoNumber value={snap?.cash ?? START} size={17} format={(n) => money(n)} countUp={false} />} />
          <StatTile label="Margin used" value={<MonoNumber value={snap?.marginUsed ?? 0} size={17} format={(n) => money(n)} countUp={false} />} accent={(snap?.marginUsed ?? 0) > 0} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <StatTile label="Day P&L" color={tone(snap?.dayPnl ?? 0)} value={<MonoNumber value={snap?.dayPnl ?? 0} size={17} color={tone(snap?.dayPnl ?? 0)} format={signedMoney} countUp={false} />} />
          <StatTile label="Total P&L" color={tone(snap?.totalPnl ?? 0)} value={<MonoNumber value={snap?.totalPnl ?? 0} size={17} color={tone(snap?.totalPnl ?? 0)} format={signedMoney} countUp={false} />} />
          <StatTile label="Win rate" value={winRate.pct == null ? "—" : `${winRate.pct.toFixed(0)}%`} />
        </div>
      </section>

      <section style={{ margin: "0 var(--gutter)", padding: "14px 0 6px", borderRadius: 18, background: "var(--surface-1)", border: "1px solid var(--hairline)" }}>
        <div className="refresh-eyebrow" style={{ padding: "0 16px 8px" }}>
          Equity since {data.account ? shortDate(data.account.startedOn) : "start"}
        </div>
        {points.length >= 2 ? (
          <HeroChart points={points} height={110} />
        ) : (
          <div style={{ padding: "24px 16px", fontSize: 13, color: "var(--text-dim)" }}>The chart draws after the second close.</div>
        )}
      </section>

      {chips.length > 0 ? (
        <ChipRow chips={chips} active={data.date} onChange={(d) => setDate(d)} variant="outlined" aria-label="Day" />
      ) : null}

      <section>
        <SectionHeading title="Positions" aside={`${data.positions.length} OPEN`} />
        <PositionsList positions={data.positions} />
      </section>

      <section>
        <SectionHeading title="Trades" aside={data.date ? dateEyebrow(data.date) : undefined} />
        <TradesList trades={data.trades} />
      </section>

      <section>
        <SectionHeading title="Notes" aside={data.date ? dateEyebrow(data.date) : undefined} />
        <NotesBlock note={data.note} />
      </section>
    </div>
  );
}
