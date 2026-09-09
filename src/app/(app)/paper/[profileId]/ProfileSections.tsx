"use client";

import { MonoNumber } from "@/components/refresh";
import { clockTime, expiryLabel, sessionLabel, signedMoney, signedPct, structureLine, tone } from "../format";

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

export function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 var(--gutter)", marginBottom: 8 }}>
      <h2 className="refresh-heading" style={{ margin: 0 }}>{title}</h2>
      {aside ? <span className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-dim)" }}>{aside}</span> : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: "16px", fontSize: 13, color: "var(--text-dim)" }}>{text}</div>;
}

export function PositionsList({ positions }: { positions: MarkedPositionView[] }) {
  const sorted = [...positions].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return (
    <div style={{ ...CARD, margin: "0 var(--gutter)" }}>
      {sorted.length === 0 ? <Empty text="No open positions." /> : null}
      {sorted.map((p, i) => (
        <div key={p.id} style={{ ...ROW, borderTop: i === 0 ? "none" : ROW.borderTop }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="refresh-mono" style={{ fontSize: 15, fontWeight: 600, lineHeight: "20px" }}>{p.symbol}</div>
            <div className="refresh-mono" style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: "16px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {structureLine(p)} · mark {p.mark.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: "right", flex: "none" }}>
            <MonoNumber value={p.pnl} size={15} weight={600} color={tone(p.pnl)} format={signedMoney} countUp={false} />
            <div className="refresh-mono" style={{ fontSize: 12, color: tone(p.pnlPct) }}>{signedPct(p.pnlPct, 1)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function tradeLabel(t: TradeView): string {
  const leg = t.kind === "call" || t.kind === "put" ? ` ${t.strike ?? ""}${t.kind === "call" ? "C" : "P"}${t.expiry ? ` ${expiryLabel(t.expiry)}` : ""}` : "";
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
  return (
    <div style={{ ...CARD, margin: "0 var(--gutter)" }}>
      {trades.length === 0 ? <Empty text="No trades on this day." /> : null}
      {trades.map((t, i) => {
        const rejected = t.status === "rejected";
        return (
          <div key={t.id} style={{ ...ROW, alignItems: "flex-start", borderTop: i === 0 ? "none" : ROW.borderTop }}>
            <div className="refresh-mono" style={{ flex: "none", width: 64, fontSize: 11, color: "var(--text-dim)", lineHeight: "20px" }}>
              {clockTime(t.ts)}
              <div style={{ fontSize: 9, letterSpacing: "0.1em" }}>{sessionLabel(t.session)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="refresh-mono" style={{ fontSize: 14, fontWeight: 600, lineHeight: "20px", color: rejected ? "var(--down)" : "var(--text-primary)" }}>
                {tradeLabel(t)}
              </div>
              <div style={{ fontSize: 12, lineHeight: "16px", color: "var(--text-dim)" }}>{t.reason}</div>
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

export function NotesBlock({ note }: { note: NoteView | null }) {
  if (!note) return <div style={{ ...CARD, margin: "0 var(--gutter)" }}><Empty text="Notes are written at the close." /></div>;
  return (
    <div style={{ ...CARD, margin: "0 var(--gutter)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      {note.narrative ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-body)" }}>{note.narrative}</p> : null}
      <div>
        <span className="refresh-eyebrow" style={{ display: "block", marginBottom: 6 }}>Highlights</span>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
          {note.highlights.map((h) => <li key={h}>{h}</li>)}
        </ul>
      </div>
      {note.learnings.length > 0 ? (
        <div>
          <span className="refresh-eyebrow" style={{ display: "block", marginBottom: 6 }}>Learnings</span>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5, color: "var(--text-dim)" }}>
            {note.learnings.map((l) => <li key={l}>{l}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function PlanDisclosure({ plan, open, onToggle }: { plan: string[]; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ ...CARD, margin: "0 var(--gutter)" }}>
      <button
        type="button"
        onClick={onToggle}
        className="refresh-pressable"
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "none", border: "none", color: "inherit", textAlign: "left" }}
      >
        <span style={{ fontSize: 15, fontWeight: 600 }}>The plan</span>
        <span className="refresh-mono" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--text-dim)" }}>
          {plan.length} RULES · {open ? "HIDE" : "SHOW"}
        </span>
      </button>
      {open ? (
        <ol style={{ margin: 0, padding: "0 16px 16px 34px", fontSize: 13, lineHeight: 1.55, color: "var(--text-body)", display: "flex", flexDirection: "column", gap: 6 }}>
          {plan.map((rule) => <li key={rule}>{rule}</li>)}
        </ol>
      ) : null}
    </div>
  );
}

