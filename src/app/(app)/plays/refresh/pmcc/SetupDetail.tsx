"use client";

/**
 * One PMCC setup, opened: the two legs, the per-spread economics, and what
 * the budget makes of it. Every figure here is arithmetic on the chain's
 * midpoints — the disclosure at the bottom spells the formula out.
 */

import Link from "next/link";
import { StatTile } from "@/components/refresh";
import type { PmccIncomeSetup, PmccLeg } from "@/lib/options/pmcc-income";
import { fmtExpiry, fmtMoney, fmtMoney2 } from "../scanner-data";
import ScoreCircle from "../leaps/ScoreCircle";
import { fmtIv } from "../leaps/lab-data";

interface SetupDetailProps {
  setup: PmccIncomeSetup;
  rank: number;
}

const ACTION: React.CSSProperties = {
  textAlign: "center",
  padding: "12px 0",
  lineHeight: "20px",
  borderRadius: 12,
  fontSize: 14,
};

function addHref(s: PmccIncomeSetup): string {
  const q = new URLSearchParams({
    symbol: s.symbol,
    strategy: "PMCC",
    leaps_strike: String(s.leaps.strike),
    leaps_expiry: s.leaps.expiry,
    leaps_price: String(s.leaps.mid),
    short_strike: String(s.shortCall.strike),
    short_expiry: s.shortCall.expiry,
    short_price: String(s.shortCall.mid),
  });
  return `/positions/new?${q.toString()}`;
}

function bigValue(text: string, sub: string, color?: string) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="refresh-mono" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: color ?? "var(--text-primary)" }}>
        {text}
      </span>
      <span style={{ fontSize: 11, lineHeight: "14px", color: "var(--text-dim)" }}>{sub}</span>
    </span>
  );
}

function LegCard({ eyebrow, leg, rows }: { eyebrow: string; leg: PmccLeg; rows: [string, string][] }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: "var(--inset)", borderRadius: 12, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="refresh-eyebrow">{eyebrow}</span>
      <span className="refresh-mono" style={{ fontSize: 15, fontWeight: 600 }}>
        ${leg.strike} call
      </span>
      <span className="refresh-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
        {fmtExpiry(leg.expiry)} · {leg.dte} DTE
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, lineHeight: "16px" }}>
            <span style={{ color: "var(--text-secondary)" }}>{label}</span>
            <span className="refresh-mono" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <StatTile
      label={label}
      value={
        <span className="refresh-mono" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          {value}
        </span>
      }
    />
  );
}

export default function SetupDetail({ setup: s, rank }: SetupDetailProps) {
  const deployedLine = s.affordable
    ? `${s.spreads} spread${s.spreads === 1 ? "" : "s"} · ${fmtMoney(s.deployed)} deployed`
    : `0 spreads · ${fmtMoney(s.netDebitPerSpread)} debit exceeds ${fmtMoney(s.budget)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 12px 12px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="refresh-eyebrow">#{rank} PMCC candidate</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="refresh-mono" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {s.symbol}
            </span>
            <span className="refresh-mono" style={{ fontSize: 14, color: "var(--text-secondary)" }}>
              ${s.stockPrice.toFixed(2)}
            </span>
          </span>
          <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--text-dim)" }}>
            {s.name !== s.symbol ? `${s.name} · ` : ""}diagonal call spread
          </span>
        </div>
        <ScoreCircle score={s.pmccScore} label="PMCC score" />
      </div>

      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-body)" }}>
        <span style={{ color: "var(--text-dim)" }}>Why it ranks: </span>
        {s.why}
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <StatTile
          label="Est. monthly income"
          accent={s.affordable}
          value={bigValue(s.affordable ? fmtMoney(s.monthlyIncome) : "—", deployedLine, s.affordable ? "var(--accent)" : "var(--text-dim)")}
        />
        <StatTile
          label="Est. annual income"
          value={bigValue(
            s.affordable ? fmtMoney(s.annualIncome) : "—",
            `${s.arocPct.toFixed(1)}% annual return on deployed capital`
          )}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <LegCard
          eyebrow="Buy long LEAPS"
          leg={s.leaps}
          rows={[
            ["Midpoint", fmtMoney2(s.leaps.mid)],
            ["Delta", s.leaps.delta.toFixed(2)],
            ["IV", fmtIv(s.leaps.iv)],
            ["Open interest", s.leaps.openInterest.toLocaleString("en-US")],
          ]}
        />
        <LegCard
          eyebrow="Sell near-term call"
          leg={s.shortCall}
          rows={[
            ["Credit", fmtMoney2(s.shortCall.mid)],
            ["Delta", s.shortCall.delta.toFixed(2)],
            ["Monthly / spread", fmtMoney(s.monthlyIncomePerSpread)],
            ["Open interest", s.shortCall.openInterest.toLocaleString("en-US")],
          ]}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <Stat label="Net debit / spread" value={fmtMoney(s.netDebitPerSpread)} />
        <Stat label="Annual income / spread" value={fmtMoney(s.monthlyIncomePerSpread * 12)} />
        <Stat label="Annualized ROC" value={`${s.arocPct.toFixed(1)}%`} />
        <Stat label="Breakeven" value={fmtMoney2(s.breakeven)} />
        <Stat label="Spread width" value={fmtMoney(s.spreadWidth)} />
        <Stat label="Max profit at short expiry" value={s.maxProfitAtShortExpiry > 0 ? fmtMoney(s.maxProfitAtShortExpiry) : "$0 — debit exceeds width"} />
      </div>

      <details style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-secondary)" }}>
        <summary
          className="refresh-mono"
          style={{ cursor: "pointer", minHeight: 44, display: "flex", alignItems: "center", fontSize: 11, letterSpacing: "0.08em", color: "var(--text-dim)" }}
        >
          ▸ HOW THE INCOME ESTIMATE WORKS
        </summary>
        <p style={{ margin: "0 0 6px" }}>
          One spread costs the LEAPS midpoint minus the short call&apos;s midpoint, times 100. Your budget divided
          by that, rounded down, is how many spreads you can open. Each spread collects the short call&apos;s credit
          once per cycle; scaled to a 30-day month by 30 ÷ DTE, that is the monthly figure, and twelve of those is
          the annual one. Annualized ROC is annual income over the capital deployed.
        </p>
        <p style={{ margin: 0 }}>
          It assumes the short call expires worthless and is re-sold at the same credit every cycle. It is an
          estimate of premium, not a P&amp;L: the LEAPS can lose value, and a short call that goes in the money caps
          the upside at the spread width.
        </p>
      </details>

      <div style={{ display: "flex", gap: 8 }}>
        <Link href={addHref(s)} style={{ ...ACTION, flex: 1, background: "var(--accent)", color: "var(--surface-0)", fontWeight: 600 }}>
          Add to portfolio
        </Link>
        <Link href={`/ticker/${s.symbol}`} style={{ ...ACTION, flex: "none", width: 110, background: "var(--control)", color: "var(--text-primary)", fontWeight: 500 }}>
          Research
        </Link>
      </div>
    </div>
  );
}
