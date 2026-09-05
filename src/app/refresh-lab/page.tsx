"use client";

/**
 * A gallery of the refresh primitives, for reviewing them before any screen
 * is built on top. Every value here is invented — nothing on this page is
 * wired to real data, and nothing on it should be copied into a screen.
 *
 * Delete this route before the refresh merges to main.
 */

import { useEffect, useState } from "react";
import { THEME_STYLE_ATTR } from "@/lib/theme-style";
import {
  BarSeries,
  ChipRow,
  DataRow,
  DataRowSkeleton,
  HeroChart,
  MetricBar,
  MonoNumber,
  SegmentedSwitch,
  Sparkline,
  SplitBar,
  StatTile,
} from "@/components/refresh";

const wave = (seed: number, n = 9) =>
  Array.from({ length: n }, (_, i) => Math.sin(i * seed) * 8 + i * 1.5 + 20);

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 34 }}>
      <div>
        <div style={{ font: "600 11px/1 var(--font-refresh-mono, monospace)", letterSpacing: ".13em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          {title}
        </div>
        {note ? (
          <div style={{ marginTop: 5, fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{note}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function RefreshLab() {
  const [premium, setPremium] = useState(38127);
  const [masked, setMasked] = useState(false);
  const [filter, setFilter] = useState("monthly");
  const [sector, setSector] = useState("ai");
  const [strategy, setStrategy] = useState("pmcc");
  const [scan, setScan] = useState(64);

  // Force the refresh theme for this page only. The primitive styling lives
  // under `[data-theme-style="refresh"]`, so without this the gallery renders
  // as unstyled text. Restores the previous style on the way out, and never
  // touches localStorage — looking at the lab must not change your setting.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute(THEME_STYLE_ATTR);
    root.setAttribute(THEME_STYLE_ATTR, "refresh");
    return () => {
      if (previous === null) root.removeAttribute(THEME_STYLE_ATTR);
      else root.setAttribute(THEME_STYLE_ATTR, previous);
    };
  }, []);

  return (
    <div style={{ minHeight: "100dvh", background: "var(--surface-0)", color: "var(--text-primary)" }}>
      <div style={{ padding: "calc(env(safe-area-inset-top) + 20px) 22px 120px", maxWidth: 520, margin: "0 auto" }}>

        <h1 style={{ font: "600 26px/1.15 var(--font-refresh-sans, system-ui)", letterSpacing: "-.025em", margin: 0 }}>
          Primitives
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          Every number below is invented. Switch to the Refresh theme in Settings if this looks light.
        </p>

        <Section title="MonoNumber" note="Tick the value to watch only the changed digits flash. Nothing shifts sideways — that is tabular figures doing their job.">
          <MonoNumber value={premium} prefix="$" size={47} weight={600} color="var(--up)" letterSpacing="-0.04em" mask={masked} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setPremium((v) => v + 217)} className="refresh-chip-hit" style={{ fontSize: 13, color: "var(--accent)" }}>tick up</button>
            <button onClick={() => setPremium((v) => v - 184)} className="refresh-chip-hit" style={{ fontSize: 13, color: "var(--down)" }}>tick down</button>
            <button onClick={() => setMasked((m) => !m)} className="refresh-chip-hit" style={{ fontSize: 13, color: "var(--text-dim)" }}>
              {masked ? "unmask" : "mask"}
            </button>
          </div>
        </Section>

        <Section title="StatTile" note="Flex weights 1 / 1 / 1.6. The accent variant is for collateral locked — the number that decides whether you can open anything at all.">
          <div style={{ display: "flex", gap: 8 }}>
            <StatTile label="OPEN" value={<MonoNumber value={7} size={17} weight={600} />} flex={1} />
            <StatTile label="ASSIGNED" value={<MonoNumber value={2} size={17} weight={600} color="var(--assigned)" />} flex={1} />
            <StatTile label="COLLATERAL LOCKED" accent flex={1.6} value={<MonoNumber value={164000} prefix="$" size={17} weight={600} color="var(--accent)" />} />
          </div>
        </Section>

        <Section title="ChipRow — filled active">
          <ChipRow
            chips={[
              { key: "monthly", label: "Monthly" }, { key: "open", label: "Open" },
              { key: "closed", label: "Closed" }, { key: "assigned", label: "Assigned" },
              { key: "leaps", label: "LEAPS" }, { key: "archive", label: "Archive" },
            ]}
            active={filter}
            onChange={setFilter}
            variant="filled"
          />
        </Section>

        <Section title="ChipRow — outlined active">
          <ChipRow
            chips={[
              { key: "ai", label: "AI Infra" }, { key: "quantum", label: "Quantum" },
              { key: "nuclear", label: "Nuclear" }, { key: "space", label: "Space" },
            ]}
            active={sector}
            onChange={setSector}
            variant="outlined"
          />
        </Section>

        <Section title="SegmentedSwitch" note="Replaces five separate scanner destinations. Switching preserves sector and scroll.">
          <SegmentedSwitch
            segments={[
              { key: "csp", label: "CSP" }, { key: "cc", label: "CC" }, { key: "pmcc", label: "PMCC" },
              { key: "leaps", label: "LEAPS" }, { key: "wkly", label: "WKLY" },
            ]}
            active={strategy}
            onChange={setStrategy}
          />
        </Section>

        <Section title="MetricBar" note="Progress is flat accent; ROC runs amber into green. Only width animates, and only here.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MetricBar value={scan} variant="progress" fill="accent" />
            <MetricBar value={72} variant="roc" fill="gradient" />
            <button onClick={() => setScan((s) => (s >= 100 ? 12 : s + 18))} className="refresh-chip-hit" style={{ alignSelf: "flex-start", fontSize: 13, color: "var(--text-dim)" }}>
              advance scan
            </button>
          </div>
        </Section>

        <Section title="SplitBar — market breadth">
          <SplitBar up={318} down={182} />
        </Section>

        <Section title="BarSeries" note="Grows on mount with a 40ms stagger. Reload to replay.">
          <BarSeries
            height={44}
            gap={4}
            bars={[
              { value: 41 }, { value: 58 }, { value: 36 }, { value: 67 },
              { value: 52 }, { value: 74 }, { value: 45 }, { value: 100, tone: "up" },
            ]}
          />
        </Section>

        <Section title="Sparkline & HeroChart" note="Inline SVG. No charting library, no dots, no axes.">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Sparkline points={wave(0.8)} width={60} height={26} color="var(--up)" />
            <HeroChart points={wave(0.55, 24)} height={110} color="var(--up)" />
          </div>
        </Section>

        <Section title="DataRow" note="Badges carry why it moved. Risk state is a border only — no icon, no fill.">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <DataRow
              ticker="AVGO" index={0}
              badges={[{ label: "HELD", tone: "info" }]}
              caption="Beat on guidance · 3.1× volume"
              sparkline={<Sparkline points={wave(0.9)} color="var(--up)" />}
              value={<MonoNumber value={6.4} suffix="%" prefix="+" size={15} weight={600} color="var(--up)" decimals={1} />}
              subValue="412.88"
            />
            <DataRow
              ticker="CRWD" index={1} risk
              badges={[{ label: "POSITION AT RISK", tone: "risk" }]}
              caption="Broke below the 50-day average"
              sparkline={<Sparkline points={wave(2.4)} color="var(--down)" />}
              value={<MonoNumber value={-4.2} suffix="%" size={15} weight={600} color="var(--down)" decimals={1} />}
              subValue="298.10"
            />
            <DataRow
              ticker="INTC" index={2}
              badges={[{ label: "SKIPPED 12 JUN", tone: "fact" }]}
              caption="No catalyst in the last five sessions"
              value={<MonoNumber value={0.3} suffix="%" prefix="+" size={15} weight={600} decimals={1} />}
              subValue="24.71"
            />
            <DataRowSkeleton />
          </div>
        </Section>

      </div>
    </div>
  );
}
