"use client";

/**
 * The strike comparison grid: stock move down the side, time across the
 * top, the modelled return in each cell. Wide tables scroll inside their
 * own container with the move column pinned — the page never scrolls
 * sideways.
 */

import type { LeapsGrid } from "@/lib/options/leaps-grid";
import { cellTint, fmtPct, fmtStrike, type PricedStrike } from "./lab-data";

type Priced = Extract<PricedStrike, { unavailable: false }>;

interface GridCellView {
  text: string;
  sub?: string;
  /** Signed value the tint scales on. */
  tone: number;
}

interface GridRowView {
  label: string;
  sub: string;
  cells: GridCellView[];
}

const CELL_W = 78;
const FIRST_W = 76;

function moveLabel(movePct: number): string {
  return movePct === 0 ? "0%" : `${movePct > 0 ? "+" : ""}${movePct}%`;
}

function GridTable({ columns, rows, ariaLabel }: { columns: string[]; rows: GridRowView[]; ariaLabel: string }) {
  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 14,
        border: "1px solid var(--hairline)",
        background: "var(--surface-1)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <table
        className="refresh-mono"
        aria-label={ariaLabel}
        style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: FIRST_W + columns.length * CELL_W }}
      >
        <thead>
          <tr>
            <th
              scope="col"
              style={{
                position: "sticky",
                left: 0,
                zIndex: 2,
                background: "var(--surface-1)",
                minWidth: FIRST_W,
                padding: "10px 10px 8px",
                textAlign: "left",
                borderBottom: "1px solid var(--hairline)",
                borderRight: "1px solid var(--hairline)",
              }}
            >
              <span className="refresh-eyebrow">Move</span>
            </th>
            {columns.map((col) => (
              <th
                key={col}
                scope="col"
                style={{
                  minWidth: CELL_W,
                  padding: "10px 8px 8px",
                  textAlign: "right",
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                <span className="refresh-eyebrow">{col}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                style={{
                  position: "sticky",
                  left: 0,
                  zIndex: 1,
                  background: "var(--surface-1)",
                  padding: "7px 10px",
                  textAlign: "left",
                  borderRight: "1px solid var(--hairline)",
                  borderBottom: "1px solid var(--hairline-soft)",
                  fontWeight: 400,
                }}
              >
                <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  {row.label}
                </span>
                <span style={{ display: "block", fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>
                  {row.sub}
                </span>
              </th>
              {row.cells.map((cell, i) => (
                <td
                  key={i}
                  style={{
                    padding: "7px 8px",
                    textAlign: "right",
                    background: cellTint(cell.tone),
                    borderBottom: "1px solid var(--hairline-soft)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: cell.tone >= 0 ? "var(--up)" : "var(--down)",
                    }}
                  >
                    {cell.text}
                  </span>
                  {cell.sub && (
                    <span style={{ display: "block", fontSize: 10, color: "var(--text-dim)", marginTop: 1 }}>
                      {cell.sub}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function returnRows(grid: LeapsGrid): GridRowView[] {
  return grid.rows.map((row) => ({
    label: moveLabel(row.movePct),
    sub: `$${row.price.toFixed(row.price >= 1000 ? 0 : 2)}`,
    cells: row.cells.map((c) => ({
      text: fmtPct(c.returnPct, Math.abs(c.returnPct) >= 100 ? 0 : 1),
      sub: `$${c.value.toFixed(2)}`,
      tone: c.returnPct,
    })),
  }));
}

/** Primary − compare, per cell, in percentage points. */
function deltaRows(a: LeapsGrid, b: LeapsGrid): GridRowView[] {
  return a.rows.map((row, r) => ({
    label: moveLabel(row.movePct),
    sub: `$${row.price.toFixed(row.price >= 1000 ? 0 : 2)}`,
    cells: row.cells.map((c, i) => {
      const other = b.rows[r]?.cells[i];
      const diff = other ? c.returnPct - other.returnPct : 0;
      return {
        text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)} pp`,
        tone: diff,
      };
    }),
  }));
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span className="refresh-eyebrow">{eyebrow}</span>
        <span className="refresh-mono" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

interface ScenarioGridProps {
  primary: Priced | null;
  compare: Priced | null;
}

export default function ScenarioGrid({ primary, compare }: ScenarioGridProps) {
  if (!primary) return null;
  const columns = primary.grid.columns.map((c) => c.label);
  const sameColumns = compare && compare.grid.columns.length === primary.grid.columns.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Section eyebrow={`Primary · ${fmtStrike(primary.strike)}`} title={`vs mid $${primary.mid.toFixed(2)}`}>
        <GridTable columns={columns} rows={returnRows(primary.grid)} ariaLabel={`Returns for the ${primary.strike} strike`} />
      </Section>

      {compare && (
        <Section eyebrow={`Compare · ${fmtStrike(compare.strike)}`} title={`vs mid $${compare.mid.toFixed(2)}`}>
          <GridTable
            columns={compare.grid.columns.map((c) => c.label)}
            rows={returnRows(compare.grid)}
            ariaLabel={`Returns for the ${compare.strike} strike`}
          />
        </Section>
      )}

      {compare && sameColumns && (
        <Section
          eyebrow={`Δ · ${fmtStrike(primary.strike)} − ${fmtStrike(compare.strike)}`}
          title="return, percentage points"
        >
          <GridTable
            columns={columns}
            rows={deltaRows(primary.grid, compare.grid)}
            ariaLabel={`Return difference, ${primary.strike} minus ${compare.strike}`}
          />
        </Section>
      )}

      <p style={{ fontSize: 11, lineHeight: 1.5, color: "var(--text-dim)", margin: 0 }}>
        Black–Scholes, r = 4%, IV held at each contract&apos;s latest value. No IV crush, dividends, or early
        exercise modelled. Returns are against the midpoint, per share.
      </p>
    </div>
  );
}
