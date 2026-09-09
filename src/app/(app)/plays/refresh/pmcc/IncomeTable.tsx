"use client";

/**
 * The ranked income table. Scrolls sideways inside its own container with
 * the ticker column pinned; the page never does. An opened row's detail
 * spans every column but is pinned to the container's left edge and sized
 * to it, so the card reads at full width and does not scroll with the grid.
 */

import { useEffect, useRef, useState } from "react";
import type { PmccIncomeSetup, PmccSortKey } from "@/lib/options/pmcc-income";
import { fmtMoney } from "../scanner-data";
import SetupDetail from "./SetupDetail";

interface IncomeTableProps {
  setups: PmccIncomeSetup[];
  sort: PmccSortKey;
  onSort: (key: PmccSortKey) => void;
  expanded: string | null;
  onToggle: (id: string) => void;
}

export function setupId(s: PmccIncomeSetup): string {
  return `${s.symbol}-${s.leaps.strike}-${s.shortCall.strike}-${s.shortCall.expiry}`;
}

const COLUMNS: { key: PmccSortKey; label: string; width: number }[] = [
  { key: "debit", label: "Debit", width: 78 },
  { key: "monthly", label: "Monthly", width: 92 },
  { key: "aroc", label: "AROC", width: 72 },
  { key: "score", label: "Score", width: 62 },
];

const FIRST_W = 112;

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver !== "function") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

const HEAD_CELL: React.CSSProperties = {
  padding: 0,
  borderBottom: "1px solid var(--hairline)",
  background: "var(--surface-1)",
};

const CELL: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "right",
  whiteSpace: "nowrap",
  borderBottom: "1px solid var(--hairline-soft)",
  verticalAlign: "middle",
};

export default function IncomeTable({ setups, sort, onSort, expanded, onToggle }: IncomeTableProps) {
  const { ref, width } = useContainerWidth();

  return (
    <div
      ref={ref}
      style={{
        overflowX: "auto",
        borderRadius: 16,
        border: "1px solid var(--hairline)",
        background: "var(--surface-1)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        className="refresh-mono"
        aria-label="PMCC setups ranked for income"
        style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: FIRST_W + COLUMNS.reduce((n, c) => n + c.width, 0) }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{ ...HEAD_CELL, position: "sticky", left: 0, zIndex: 2, minWidth: FIRST_W, textAlign: "left", borderRight: "1px solid var(--hairline)" }}
            >
              <span className="refresh-eyebrow" style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 10px" }}>
                Rank · setup
              </span>
            </th>
            {COLUMNS.map((col) => {
              const on = col.key === sort;
              return (
                <th key={col.key} scope="col" aria-sort={on ? "descending" : "none"} style={{ ...HEAD_CELL, minWidth: col.width }}>
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="refresh-eyebrow"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      padding: "0 8px",
                      border: "none",
                      background: "none",
                      textAlign: "right",
                      color: on ? "var(--accent)" : "var(--text-dim)",
                      cursor: "pointer",
                    }}
                  >
                    {col.label}
                    {on ? " ↓" : ""}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {setups.map((s, i) => {
            const id = setupId(s);
            const open = expanded === id;
            const dim = !s.affordable;
            const primary = dim ? "var(--text-dim)" : "var(--text-primary)";
            return [
              <tr key={id} onClick={() => onToggle(id)} style={{ cursor: "pointer", background: open ? "var(--pressed)" : undefined }}>
                <th
                  scope="row"
                  style={{
                    ...CELL,
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    textAlign: "left",
                    background: open ? "var(--pressed)" : "var(--surface-1)",
                    borderRight: "1px solid var(--hairline)",
                    fontWeight: 400,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 10, color: i === 0 && !dim ? "var(--accent)" : "var(--text-dim)", fontWeight: 600 }}>#{i + 1}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: primary }}>{s.symbol}</span>
                  </span>
                  <span style={{ display: "block", fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                    ${s.leaps.strike} / ${s.shortCall.strike}
                  </span>
                </th>
                <td style={{ ...CELL, fontSize: 13, color: primary }}>{fmtMoney(s.netDebitPerSpread)}</td>
                <td style={{ ...CELL }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: dim ? "var(--text-dim)" : "var(--up)" }}>
                    {s.affordable ? fmtMoney(s.monthlyIncome) : "—"}
                  </span>
                  <span style={{ display: "block", fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>
                    {s.affordable ? `${s.spreads} spread${s.spreads === 1 ? "" : "s"}` : "over budget"}
                  </span>
                </td>
                <td style={{ ...CELL, fontSize: 13, color: primary }}>{s.arocPct.toFixed(0)}%</td>
                <td style={{ ...CELL, fontSize: 13, fontWeight: 600, color: open ? "var(--accent)" : primary }}>{s.pmccScore}</td>
              </tr>,
              open ? (
                <tr key={`${id}-detail`}>
                  <td colSpan={1 + COLUMNS.length} style={{ padding: 0, borderBottom: "1px solid var(--hairline)" }}>
                    <div style={{ position: "sticky", left: 0, width: width || "100%", boxSizing: "border-box" }}>
                      <SetupDetail setup={s} rank={i + 1} />
                    </div>
                  </td>
                </tr>
              ) : null,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
