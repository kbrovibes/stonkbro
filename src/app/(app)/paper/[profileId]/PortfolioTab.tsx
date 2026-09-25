"use client";

import { useCallback, useState } from "react";
import { useSort, type SortDir } from "@/hooks/useSort";
import { useCachedJson } from "@/lib/client-cache";
import { expiryLabel, signedMoney, signedPct, tone } from "../format";
import { TradesList, type TradeView } from "./ProfileSections";

export interface PortfolioPositionView {
  id: string;
  symbol: string;
  kind: "stock" | "call" | "put";
  side: "long" | "short";
  qty: number;
  strike: number | null;
  expiry: string | null;
  avgPrice: number;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  realizedPnl: number;
  status: "open" | "closed";
}

interface PortfolioPayload {
  trades: TradeView[];
  positions: PortfolioPositionView[];
}

const CARD: React.CSSProperties = {
  borderRadius: 18,
  background: "var(--surface-1)",
  border: "1px solid var(--hairline)",
  overflow: "hidden",
};

const TH: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)",
  fontWeight: 500, textAlign: "right", padding: "0 0 10px 16px", whiteSpace: "nowrap",
};
const TD: React.CSSProperties = {
  fontSize: 13, textAlign: "right", padding: "11px 0 11px 16px",
  borderTop: "1px solid var(--hairline-soft)", whiteSpace: "nowrap",
};

function SortTh<K extends string>({
  label, sortKey, currentKey, currentDir, onToggle, align = "right", thStyle,
}: {
  label: string;
  sortKey: K;
  currentKey: K;
  currentDir: SortDir;
  onToggle: (key: K) => void;
  align?: "left" | "right";
  thStyle?: React.CSSProperties;
}) {
  const active = currentKey === sortKey;
  const arrow = !active ? "↕" : currentDir === "asc" ? "↑" : "↓";
  return (
    <th style={{ ...TH, textAlign: align, ...thStyle }}>
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

function typeLabel(p: PortfolioPositionView): string {
  if (p.kind === "stock") return "stock";
  return `${p.side} ${p.kind}`;
}

function contractLabel(p: PortfolioPositionView): string {
  if (p.kind === "stock") return p.symbol;
  return `${p.symbol} ${p.strike ?? ""}${p.kind === "call" ? "C" : "P"}${p.expiry ? ` ${expiryLabel(p.expiry)}` : ""}`;
}

/** Cost basis in $, matching how the engine sizes P&L: shares at 1x, contracts at 100x. */
function costBasis(p: PortfolioPositionView): number {
  const mult = p.kind === "stock" ? 1 : 100;
  return p.avgPrice * Math.abs(p.qty) * mult;
}

type ClosedSortKey = "contract" | "type" | "qty" | "avg" | "exit" | "opened" | "closed" | "pnl" | "return";

/** Every position the bot has ever closed, with the realized P&L the engine booked at close. */
export function ClosedPositionsTable({ positions }: { positions: PortfolioPositionView[] }) {
  const closed = positions.filter((p) => p.status === "closed");
  const { sorted, sortKey, sortDir, toggleSort } = useSort<PortfolioPositionView, ClosedSortKey>(
    closed,
    (p, key) => {
      switch (key) {
        case "contract": return contractLabel(p);
        case "type": return typeLabel(p);
        case "qty": return Math.abs(p.qty);
        case "avg": return p.avgPrice;
        case "exit": return p.closePrice ?? 0;
        case "opened": return p.openedAt;
        case "closed": return p.closedAt ?? "";
        case "pnl": return p.realizedPnl;
        case "return": {
          const basis = costBasis(p);
          return basis > 0 ? (p.realizedPnl / basis) * 100 : 0;
        }
      }
    },
    "closed",
    { ascKeys: ["contract", "type", "opened"] }
  );
  if (closed.length === 0) {
    return <div style={CARD}><div style={{ padding: 18, fontSize: 13, color: "var(--text-dim)" }}>No closed positions yet.</div></div>;
  }
  const sortProps = { currentKey: sortKey, currentDir: sortDir, onToggle: toggleSort };
  return (
    <div style={{ ...CARD, padding: "14px 16px 4px" }}>
      <div className="paper-scroll">
        <table className="refresh-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>
              <SortTh<ClosedSortKey> label="Position" sortKey="contract" align="left" thStyle={{ paddingLeft: 0 }} {...sortProps} />
              <SortTh<ClosedSortKey> label="Type" sortKey="type" align="left" {...sortProps} />
              <SortTh<ClosedSortKey> label="Qty" sortKey="qty" {...sortProps} />
              <SortTh<ClosedSortKey> label="Avg entry" sortKey="avg" {...sortProps} />
              <SortTh<ClosedSortKey> label="Exit" sortKey="exit" {...sortProps} />
              <SortTh<ClosedSortKey> label="Opened" sortKey="opened" {...sortProps} />
              <SortTh<ClosedSortKey> label="Closed" sortKey="closed" {...sortProps} />
              <SortTh<ClosedSortKey> label="Realized" sortKey="pnl" {...sortProps} />
              <SortTh<ClosedSortKey> label="Return" sortKey="return" {...sortProps} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const basis = costBasis(p);
              const returnPct = basis > 0 ? (p.realizedPnl / basis) * 100 : 0;
              return (
                <tr key={p.id}>
                  <td style={{ ...TD, textAlign: "left", paddingLeft: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                    {contractLabel(p)}
                  </td>
                  <td style={{ ...TD, textAlign: "left", color: "var(--text-dim)", fontSize: 12 }}>{typeLabel(p)}</td>
                  <td style={TD}>{p.qty}</td>
                  <td style={TD}>{p.avgPrice.toFixed(2)}</td>
                  <td style={TD}>{p.closePrice != null ? p.closePrice.toFixed(2) : "—"}</td>
                  <td style={{ ...TD, color: "var(--text-dim)", fontSize: 12 }}>{p.openedAt.slice(0, 10)}</td>
                  <td style={{ ...TD, color: "var(--text-dim)", fontSize: 12 }}>{p.closedAt?.slice(0, 10) ?? "—"}</td>
                  <td style={{ ...TD, color: tone(p.realizedPnl), fontWeight: 600 }}>{signedMoney(p.realizedPnl)}</td>
                  <td style={{ ...TD, color: tone(returnPct), fontWeight: 600 }}>{signedPct(returnPct, 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const EYEBROW: React.CSSProperties = { fontSize: 11, letterSpacing: "0.14em", color: "var(--text-dim)" };

/**
 * The bot's full-history portfolio view: every trade it's ever made and
 * every position it's ever closed, independent of the day-chip selector
 * that scopes the Soul/Positions/Trades/Journal tabs to a single session.
 */
export default function PortfolioTab({ profileId }: { profileId: string }) {
  const [data, setData] = useState<PortfolioPayload | null>(null);
  const url = `/api/paper/${profileId}/portfolio`;
  const apply = useCallback((d: PortfolioPayload) => setData(d), []);
  useCachedJson<PortfolioPayload>(url, apply, { ttlMs: 60_000 });

  if (!data) {
    return <div className="refresh-skeleton" style={{ height: 240, borderRadius: 18, background: "var(--surface-1)" }} aria-hidden="true" />;
  }

  const closed = data.positions.filter((p) => p.status === "closed");
  const totalRealized = closed.reduce((s, p) => s + p.realizedPnl, 0);
  const wins = closed.filter((p) => p.realizedPnl > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={EYEBROW}>Realized P&amp;L (all-time)</div>
          <div className="refresh-mono" style={{ fontSize: 22, fontWeight: 600, color: tone(totalRealized), marginTop: 4 }}>
            {signedMoney(totalRealized)}
          </div>
        </div>
        <div>
          <div style={EYEBROW}>Closed positions</div>
          <div className="refresh-mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{closed.length}</div>
        </div>
        <div>
          <div style={EYEBROW}>Win rate</div>
          <div className="refresh-mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>
            {winRate != null ? `${winRate.toFixed(0)}%` : "—"}
          </div>
        </div>
        <div>
          <div style={EYEBROW}>Total trades</div>
          <div className="refresh-mono" style={{ fontSize: 22, fontWeight: 600, marginTop: 4 }}>{data.trades.length}</div>
        </div>
      </div>

      <div>
        <div className="refresh-eyebrow" style={{ marginBottom: 8 }}>Closed positions &amp; realized P&amp;L</div>
        <ClosedPositionsTable positions={data.positions} />
      </div>

      <div>
        <div className="refresh-eyebrow" style={{ marginBottom: 8 }}>
          Full trade history — every buy/sell, at its own price and date (e.g. each DCA leg)
        </div>
        <TradesList trades={data.trades} />
      </div>
    </div>
  );
}
