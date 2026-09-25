"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import BotAvatar from "@/components/paper/BotAvatar";
import { ChipRow, HeroChart, MonoNumber } from "@/components/refresh";
import type { Chip } from "@/components/refresh";
import { useCachedJson } from "@/lib/client-cache";
import { identityFor } from "@/lib/paper/identity";
import { dateEyebrow, sessionLabel, shortDate, signedPct, tone } from "../format";
import {
  JournalBlock,
  MonoStat,
  PositionsTable,
  Rulebook,
  SoulList,
  TabBar,
  TradesList,
  type MarkedPositionView,
  type MemoryView,
  type NoteView,
  type TabDef,
  type TradeView,
} from "./ProfileSections";
import PortfolioTab from "./PortfolioTab";

interface ProfilePayload {
  profile: { id: string; name: string; tagline: string; style: string[]; plan: string[]; margin: boolean };
  identity: { role: string; creed: string; hue: string };
  account: { cash: number; realizedPnl: number; fees: number; interest: number; startedOn: string } | null;
  date: string | null;
  dates: string[];
  snapshot: {
    date: string; session: string; equity: number; cash: number; marginUsed: number; positionsValue: number;
    dayPnl: number; totalPnl: number; totalReturnPct: number;
  } | null;
  positions: MarkedPositionView[];
  trades: TradeView[];
  memories: MemoryView[];
  note: NoteView | null;
  series: Array<{ date: string; equity: number }>;
  winRate: { wins: number; losses: number; pct: number | null };
}

const START = 100_000;
const MARGIN = 200_000;
type TabKey = "soul" | "positions" | "trades" | "portfolio" | "journal";

export default function ProfileScreen({ profileId }: { profileId: string }) {
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<ProfilePayload | null>(null);
  const [tab, setTab] = useState<TabKey>("positions");
  const url = `/api/paper/${profileId}${date ? `?date=${date}` : ""}`;
  const apply = useCallback((d: ProfilePayload) => setData(d), []);
  useCachedJson<ProfilePayload>(url, apply, { ttlMs: 60_000 });

  const chips = useMemo<Chip[]>(
    () => (data?.dates ?? []).slice(0, 30).map((d) => ({ key: d, label: shortDate(d) })),
    [data?.dates],
  );

  if (!data) {
    return (
      <div style={{ padding: "12px var(--gutter)" }}>
        <Link href="/paper" className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" }}>← PAPER</Link>
        <div className="refresh-skeleton" style={{ marginTop: 16, height: 160, borderRadius: 18, background: "var(--surface-1)" }} aria-hidden="true" />
      </div>
    );
  }

  const { profile, winRate } = data;
  const identity = data.identity ?? identityFor(profile.id);
  const snap = data.snapshot;
  const equity = snap?.equity ?? START;
  const totalReturn = snap?.totalReturnPct ?? 0;
  const points = data.series.map((p) => p.equity);

  const tabs: TabDef[] = [
    { key: "soul", label: "Soul", count: data.memories.length },
    { key: "positions", label: "Positions", count: data.positions.length },
    { key: "trades", label: "Trades", count: data.trades.length },
    { key: "portfolio", label: "Portfolio" },
    { key: "journal", label: "Journal", count: data.note ? 1 : 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "12px var(--gutter) 28px" }}>
      <Link href="/paper" className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)", textDecoration: "none" }}>
        ← PAPER
      </Link>

      <header style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        <BotAvatar profileId={profile.id} size={72} ring="rank" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: identity.hue }}>
            {identity.role}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05, margin: "5px 0 0" }}>
            {profile.name}
          </h1>
          <p style={{ margin: "7px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--text-secondary)" }}>{profile.tagline}</p>
        </div>
        <div style={{ flex: "none", textAlign: "right" }}>
          <div className="refresh-eyebrow" style={{ marginBottom: 4 }}>Total return</div>
          <MonoNumber value={totalReturn} size={24} weight={600} color={tone(totalReturn)} format={(n) => signedPct(n)} countUp={false} />
        </div>
      </header>

      <p style={{ margin: 0, paddingLeft: 13, borderLeft: `2px solid ${identity.hue}`, fontSize: 14, lineHeight: 1.55, color: "var(--text-body)", fontStyle: "italic" }}>
        {identity.creed}
      </p>

      <div className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" }}>
        {snap ? `${dateEyebrow(snap.date)} · ${sessionLabel(snap.session)} RUN` : "NO RUN YET"}
      </div>

      <section className="paper-stats" style={{ borderRadius: 14, overflow: "hidden" }}>
        <MonoStat label="Equity" value={equity} />
        <MonoStat label="Day P&L" value={snap?.dayPnl ?? 0} color={tone(snap?.dayPnl ?? 0)} />
        <MonoStat label="Cash" value={snap?.cash ?? START} />
        <MonoStat label="Margin used" value={snap?.marginUsed ?? 0} accent={(snap?.marginUsed ?? 0) > 0} />
      </section>

      <div className="paper-split">
        <section style={{ alignSelf: "start", borderRadius: 18, background: "var(--surface-1)", border: "1px solid var(--hairline)", padding: "14px 0 6px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 16px 10px" }}>
            <span className="refresh-eyebrow">
              Equity since {data.account ? shortDate(data.account.startedOn) : "start"}
            </span>
            <span className="refresh-mono" style={{ fontSize: 10.5, color: "var(--text-dim)" }}>
              {data.series.length} {data.series.length === 1 ? "session" : "sessions"}
              {winRate.pct != null ? ` · ${winRate.pct.toFixed(0)}% WIN` : ""}
            </span>
          </div>
          {points.length >= 2 ? (
            <HeroChart points={points} height={150} />
          ) : (
            <div style={{ padding: "22px 16px 26px", fontSize: 13, color: "var(--text-dim)" }}>
              The chart draws after the second close.
            </div>
          )}
        </section>
        <Rulebook plan={profile.plan} margin={profile.margin} startCash={START} marginLimit={MARGIN} />
      </div>

      {chips.length > 0 ? (
        <ChipRow chips={chips} active={data.date} onChange={(d) => setDate(d)} variant="outlined" aria-label="Day" />
      ) : null}

      <section>
        <TabBar tabs={tabs} active={tab} onChange={(k) => setTab(k as TabKey)} />
        <div style={{ marginTop: 14 }}>
          {tab === "soul" ? <SoulList memories={data.memories} /> : null}
          {tab === "positions" ? <PositionsTable positions={data.positions} /> : null}
          {tab === "trades" ? <TradesList trades={data.trades} /> : null}
          {tab === "portfolio" ? <PortfolioTab profileId={profile.id} /> : null}
          {tab === "journal" ? <JournalBlock note={data.note} /> : null}
        </div>
      </section>
    </div>
  );
}
