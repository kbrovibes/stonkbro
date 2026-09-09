"use client";

/**
 * PMCC Income — the PMCC segment of the scanner.
 *
 * The daily scan stores each setup's budget-independent economics; this
 * screen fetches those once and does the budget arithmetic locally, so a
 * new figure in the capital field re-ranks the table with no round trip.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { cachedFetchJson, invalidateCache } from "@/lib/client-cache";
import {
  DEFAULT_PMCC_BUDGET,
  rankForBudget,
  sortSetups,
  type PmccIncomePick,
  type PmccSortKey,
} from "@/lib/options/pmcc-income";
import { ago, LEAPS_URL } from "../leaps/lab-data";
import { fmtMoney } from "../scanner-data";
import BudgetInput from "./BudgetInput";
import IncomeTable from "./IncomeTable";

const URL = "/api/pmcc-income";
const TTL_MS = 5 * 60_000;
const BUDGET_KEY = "stonkbro:pmcc-budget";
const GUTTER = 22;

interface Payload {
  scanAt: string | null;
  picks: PmccIncomePick[];
}

/* The budget lives in localStorage. Read through `useSyncExternalStore` so
   the server render and the first client render agree on the default, and
   the stored figure lands in a proper re-render rather than an effect. */

const budgetListeners = new Set<() => void>();
let memoryBudget: number | null = null;

function readBudget(): number {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_PMCC_BUDGET;
  } catch {
    return memoryBudget ?? DEFAULT_PMCC_BUDGET;
  }
}

function subscribeBudget(cb: () => void): () => void {
  budgetListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    budgetListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function useStoredBudget(): [number, (n: number) => void] {
  const budget = useSyncExternalStore(subscribeBudget, readBudget, () => DEFAULT_PMCC_BUDGET);
  const set = useCallback((n: number) => {
    memoryBudget = n;
    try {
      localStorage.setItem(BUDGET_KEY, String(n));
    } catch {
      /* quota or private mode — the in-memory copy still drives this session */
    }
    budgetListeners.forEach((l) => l());
  }, []);
  return [budget, set];
}

const RUN: React.CSSProperties = {
  minHeight: 44,
  padding: "0 18px",
  borderRadius: 12,
  border: "none",
  background: "var(--accent)",
  color: "var(--surface-0)",
  fontSize: 14,
  fontWeight: 600,
};

export default function PmccIncome() {
  const [budget, setBudget] = useStoredBudget();
  const [picks, setPicks] = useState<PmccIncomePick[]>([]);
  const [scanAt, setScanAt] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<PmccSortKey>("score");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback((fresh = false): Promise<void> => {
    if (fresh) invalidateCache(URL);
    return cachedFetchJson<Payload>(URL, { ttlMs: TTL_MS })
      .then((data) => {
        setPicks(data.picks ?? []);
        setScanAt(data.scanAt);
        setError(null);
      })
      .catch(() => setError("Could not load the PMCC scan."))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runScan = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(LEAPS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      invalidateCache(LEAPS_URL);
      await load(true);
    } catch {
      setError("Scan failed. Try again in a minute.");
    } finally {
      setRunning(false);
    }
  }, [running, load]);

  const setups = useMemo(() => sortSetups(rankForBudget(picks, budget), sort), [picks, budget, sort]);
  const affordable = setups.filter((s) => s.affordable).length;
  const age = ago(scanAt);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          padding: `0 ${GUTTER}px`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 180px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="refresh-eyebrow">Income scenario</span>
          <h2 className="refresh-heading">PMCC candidates</h2>
          <span style={{ fontSize: 12, lineHeight: "16px", color: "var(--text-dim)" }}>
            Long-dated ITM call paired with a 21–50 DTE short call.
          </span>
        </div>
        <BudgetInput value={budget} onChange={setBudget} />
      </div>

      {error && (
        <p style={{ margin: `0 ${GUTTER}px`, fontSize: 13, lineHeight: 1.5, color: "var(--down)" }}>{error}</p>
      )}

      {loaded && picks.length === 0 ? (
        <div style={{ padding: `0 ${GUTTER}px`, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
            {scanAt
              ? "The last scan found no PMCC setups that cleared the filters."
              : "No scan yet. Run one to rank the universe by monthly income."}
          </p>
          <button type="button" className="refresh-pressable" style={{ ...RUN, alignSelf: "flex-start", opacity: running ? 0.6 : 1 }} onClick={runScan} disabled={running}>
            {running ? "Scanning…" : "Run scan"}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              padding: `0 ${GUTTER}px`,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="refresh-eyebrow">Ranked for income</span>
              <h3 className="refresh-heading" style={{ fontSize: 17 }}>
                Top {setups.length} PMCC setups
              </h3>
              <span className="refresh-mono" style={{ fontSize: 11, color: "var(--text-dim)" }}>
                {fmtMoney(budget)} budget · {affordable} affordable · tap a column to sort
                {age ? ` · scanned ${age}` : ""}
              </span>
            </div>
            <button
              type="button"
              className="refresh-mono refresh-pressable"
              onClick={runScan}
              disabled={running}
              aria-busy={running}
              style={{
                flex: "none",
                minHeight: 44,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                background: "var(--surface-1)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.06em",
                opacity: running ? 0.5 : 1,
              }}
            >
              {running ? "SCANNING…" : "RESCAN"}
            </button>
          </div>

          <div style={{ padding: `0 ${GUTTER}px` }}>
            {loaded ? (
              <IncomeTable
                setups={setups}
                sort={sort}
                onSort={setSort}
                expanded={expanded}
                onToggle={(id) => setExpanded((prev) => (prev === id ? null : id))}
              />
            ) : (
              <p className="refresh-mono" style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", color: "var(--text-dim)" }}>
                LOADING…
              </p>
            )}
          </div>

          <p style={{ margin: `0 ${GUTTER}px`, fontSize: 11, lineHeight: 1.5, color: "var(--text-dim)" }}>
            Monthly income assumes the short call expires worthless and is re-sold at the same credit each
            cycle. Setups the budget cannot open sort last.
          </p>
        </>
      )}
    </div>
  );
}
