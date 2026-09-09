"use client";

import { MonoNumber } from "@/components/refresh";
import { clockTime, expiryLabel, money, sessionLabel, signedMoney, signedPct, tone } from "../format";

export interface MarkedPositionView {
  id: string;
  symbol: string;
  kind: "stock" | "call" | "put";
  side: "long" | "short";
  qty: number;
  strike: number | null;
  expiry: string | null;
  avgPrice: number;
  mark: number;
  value: number;
  pnl: number;
  pnlPct: number;
  delta: number | null;
}

export interface TradeView {
  id: string;
  ts: string;
  session: string;
  symbol: string;
  kind: string;
  action: string;
  qty: number;
  price: number;
  strike: number | null;
  expiry: string | null;
  amount: number;
  reason: string;
  status: string;
}

export interface NoteView {
  highlights: string[];
  learnings: string[];
  narrative: string | null;
}

export interface MemoryView {
  kind: string;
  headline: string;
  detail: string | null;
  weight: number;
  hits: number;
  firstSeen: string;
  lastSeen: string;
}

const CARD: React.CSSProperties = {
  borderRadius: 18,
  background: "var(--surface-1)",
  border: "1px solid var(--hairline)",
  overflow: "hidden",
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderTop: "1px solid var(--hairline-soft)",
};

function Empty({ text }: { text: string }) {
  return <div style={{ padding: 18, fontSize: 13, color: "var(--text-dim)" }}>{text}</div>;
}

/* -- the rulebook ------------------------------------------------------ */

export function Rulebook({ plan, margin, startCash, marginLimit }: {
  plan: string[];
  margin: boolean;
  startCash: number;
  marginLimit: number;
}) {
  const facts: Array<[string, string]> = [
    ["Starting cash", money(startCash)],
    ["Margin ceiling", margin ? money(marginLimit) : "None — cash only"],
    ["Execution", "Open, midday, close"],
  ];
  return (
    <aside style={{ ...CARD, alignSelf: "start", background: "var(--surface-2)", borderColor: "var(--hairline-strong)", padding: "16px 18px" }}>
      <div className="refresh-eyebrow" style={{ marginBottom: 10 }}>Rulebook</div>
      <ol style={{ margin: 0, padding: "0 0 0 17px", display: "flex", flexDirection: "column", gap: 7 }}>
        {plan.map((rule) => (
          <li key={rule} style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text-body)" }}>{rule}</li>
        ))}
      </ol>
      <dl style={{ margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 0 }}>
        {facts.map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid var(--hairline)" }}>
            <dt style={{ fontSize: 13, color: "var(--text-dim)" }}>{label}</dt>
            <dd className="refresh-mono" style={{ margin: 0, fontSize: 13, color: "var(--text-primary)" }}>{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

/* -- soul -------------------------------------------------------------- */

const KIND_TONE: Record<string, string> = {
  creed: "var(--accent)",
  conviction: "var(--up)",
  milestone: "var(--up)",
  streak: "var(--text-secondary)",
  lesson: "var(--warn-orange)",
  scar: "var(--down)",
};

export function SoulList({ memories }: { memories: MemoryView[] }) {
  if (memories.length === 0) {
    return <div style={CARD}><Empty text="Nothing learned yet. Memory is written at the close." /></div>;
  }
  const order = ["creed", "scar", "milestone", "streak", "conviction", "lesson"];
  const sorted = [...memories].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.weight - a.weight,
  );
  return (
    <div style={CARD}>
      {sorted.map((m, i) => (
        <div key={`${m.kind}-${m.headline}`} style={{ padding: "13px 16px", borderTop: i === 0 ? "none" : "1px solid var(--hairline-soft)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
            <span
              className="refresh-mono"
              style={{
                fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", flex: "none",
                color: KIND_TONE[m.kind] ?? "var(--text-dim)",
                border: `1px solid ${KIND_TONE[m.kind] ?? "var(--hairline-strong)"}`,
                borderRadius: 6, padding: "2px 6px", opacity: 0.9,
              }}
            >
              {m.kind}
            </span>
            <span className="refresh-mono" style={{ fontSize: 10, color: "var(--text-dim)", marginLeft: "auto", flex: "none" }}>
              {m.hits > 1 ? `×${m.hits} · ` : ""}{m.lastSeen}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-body)" }}>{m.headline}</p>
          {m.detail ? (
            <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--text-dim)" }}>{m.detail}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* -- positions --------------------------------------------------------- */

function typeLabel(p: MarkedPositionView): string {
  if (p.kind === "stock") return "stock";
  return `${p.side} ${p.kind}`;
}

function positionLabel(p: MarkedPositionView): string {
  if (p.kind === "stock") return p.symbol;
  return `${p.symbol} ${p.strike ?? ""}${p.kind === "call" ? "C" : "P"}${p.expiry ? ` ${expiryLabel(p.expiry)}` : ""}`;
}

const TH: React.CSSProperties = {
  fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)",
  fontWeight: 500, textAlign: "right", padding: "0 0 10px 16px", whiteSpace: "nowrap",
};
const TD: React.CSSProperties = {
  fontSize: 13, textAlign: "right", padding: "11px 0 11px 16px",
  borderTop: "1px solid var(--hairline-soft)", whiteSpace: "nowrap",
};

export function PositionsTable({ positions }: { positions: MarkedPositionView[] }) {
  if (positions.length === 0) return <div style={CARD}><Empty text="No open positions." /></div>;
  const sorted = [...positions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return (
    <div style={{ ...CARD, padding: "14px 16px 4px" }}>
      <div className="paper-scroll">
        <table className="refresh-mono" style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead>
            <tr>
              <th style={{ ...TH, textAlign: "left", paddingLeft: 0 }}>Position</th>
              <th style={{ ...TH, textAlign: "left" }}>Type</th>
              <th style={TH}>Qty</th>
              <th style={TH}>Avg</th>
              <th style={TH}>Mark</th>
              <th style={TH}>Market value</th>
              <th style={TH}>Unrealized</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id}>
                <td style={{ ...TD, textAlign: "left", paddingLeft: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                  {positionLabel(p)}
                </td>
                <td style={{ ...TD, textAlign: "left", color: "var(--text-dim)", fontSize: 12 }}>{typeLabel(p)}</td>
                <td style={TD}>{p.side === "short" ? "−" : ""}{p.qty}</td>
                <td style={TD}>{p.avgPrice.toFixed(2)}</td>
                <td style={TD}>{p.mark.toFixed(2)}</td>
                <td style={TD}>{money(p.value)}</td>
                <td style={{ ...TD, color: tone(p.pnl), fontWeight: 600 }}>
                  {signedMoney(p.pnl)}
                  <span style={{ display: "block", fontSize: 11, fontWeight: 400, opacity: 0.8 }}>{signedPct(p.pnlPct, 1)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -- trades ------------------------------------------------------------ */

function tradeLabel(t: TradeView): string {
  const leg = t.kind === "call" || t.kind === "put"
    ? ` ${t.strike ?? ""}${t.kind === "call" ? "C" : "P"}${t.expiry ? ` ${expiryLabel(t.expiry)}` : ""}`
    : "";
  switch (t.action) {
    case "buy": return `Buy ${t.qty} ${t.symbol}${leg} @ ${t.price.toFixed(2)}`;
    case "sell": return `Sell ${t.qty} ${t.symbol}${leg} @ ${t.price.toFixed(2)}`;
    case "assign": return `Assigned ${t.symbol}${leg}`;
    case "called_away": return `Called away ${t.symbol}${leg}`;
    case "expire": return `Expired ${t.symbol}${leg}`;
    case "settle": return `Settled ${t.symbol}${leg} @ ${t.price.toFixed(2)}`;
    case "interest": return "Margin interest";
    case "reject": return `Rejected ${t.qty} ${t.symbol}${leg}`;
    default: return `${t.action} ${t.symbol}${leg}`;
  }
}

export function TradesList({ trades }: { trades: TradeView[] }) {
  if (trades.length === 0) return <div style={CARD}><Empty text="No trades on this day." /></div>;
  return (
    <div style={CARD}>
      {trades.map((t, i) => {
        const rejected = t.status === "rejected";
        return (
          <div key={t.id} style={{ ...ROW, alignItems: "flex-start", borderTop: i === 0 ? "none" : ROW.borderTop }}>
            <div className="refresh-mono" style={{ flex: "none", width: 62, fontSize: 11, color: "var(--text-dim)", lineHeight: "20px" }}>
              {clockTime(t.ts)}
              <div style={{ fontSize: 9, letterSpacing: "0.1em" }}>{sessionLabel(t.session)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="refresh-mono" style={{ fontSize: 14, fontWeight: 600, lineHeight: "20px", color: rejected ? "var(--down)" : "var(--text-primary)" }}>
                {tradeLabel(t)}
              </div>
              <div style={{ fontSize: 12.5, lineHeight: "17px", color: "var(--text-dim)", marginTop: 2 }}>{t.reason}</div>
            </div>
            {!rejected && t.amount !== 0 ? (
              <span className="refresh-mono" style={{ flex: "none", fontSize: 13, fontWeight: 600, color: tone(t.amount), lineHeight: "20px" }}>
                {signedMoney(t.amount)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* -- journal ----------------------------------------------------------- */

export function JournalBlock({ note }: { note: NoteView | null }) {
  if (!note) return <div style={CARD}><Empty text="The journal is written at the close." /></div>;
  return (
    <div style={{ ...CARD, padding: 18, display: "flex", flexDirection: "column", gap: 15 }}>
      {note.narrative ? <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--text-body)" }}>{note.narrative}</p> : null}
      <div>
        <span className="refresh-eyebrow" style={{ display: "block", marginBottom: 7 }}>Highlights</span>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--text-secondary)" }}>
          {note.highlights.map((h) => <li key={h}>{h}</li>)}
        </ul>
      </div>
      {note.learnings.length > 0 ? (
        <div>
          <span className="refresh-eyebrow" style={{ display: "block", marginBottom: 7 }}>Learnings</span>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: "var(--text-dim)" }}>
            {note.learnings.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* -- tabs -------------------------------------------------------------- */

export interface TabDef {
  key: string;
  label: string;
  count: number;
}

export function TabBar({ tabs, active, onChange }: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="tablist" className="paper-scroll" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--hairline)" }}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className="refresh-pressable"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "11px 14px",
              background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
              borderBottom: `2px solid ${on ? "var(--accent)" : "transparent"}`,
              color: on ? "var(--text-primary)" : "var(--text-dim)",
              fontSize: 14, fontWeight: on ? 600 : 500, marginBottom: -1,
            }}
          >
            {t.label}
            <span
              className="refresh-mono"
              style={{
                fontSize: 10.5, padding: "1px 6px", borderRadius: 6,
                background: on ? "var(--accent-bg)" : "var(--inset)",
                color: on ? "var(--accent)" : "var(--text-dim)",
              }}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
      <h2 className="refresh-heading" style={{ margin: 0 }}>{title}</h2>
      {aside ? <span className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-dim)" }}>{aside}</span> : null}
    </div>
  );
}

export function MonoStat({ label, value, color, accent }: {
  label: string;
  value: number;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div style={{ padding: "13px 14px", background: accent ? "var(--surface-2)" : "transparent" }}>
      <div className="refresh-eyebrow" style={{ marginBottom: 5 }}>{label}</div>
      <MonoNumber value={value} size={19} weight={600} color={color} format={(n) => (color ? signedMoney(n) : money(n))} countUp={false} />
    </div>
  );
}
