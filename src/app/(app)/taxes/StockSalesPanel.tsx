"use client";

import { useState } from "react";
import { usePrivacy } from "@/components/PrivacyProvider";
import type { NeedsBasisItem } from "./PeriodCard";
import { fmtDate, fmtMoney } from "./format";

const cardClass =
  "bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-2xl";

/**
 * Stock-sales sync + basis entry. Sales matched to real purchase lots flow
 * into the period math automatically; sales whose shares arrived via
 * transfer/RSU have no basis in the connector data and are listed here
 * until the user supplies cost basis + acquisition date.
 */
export default function StockSalesPanel({
  equities,
  onChanged,
}: {
  equities: { lastSyncedAt: string | null; saleCount: number; needsBasis: NeedsBasisItem[] };
  onChanged: () => void;
}) {
  const { locked } = usePrivacy();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  async function sync() {
    setSyncing(true);
    setSyncError("");
    try {
      const res = await fetch("/api/taxes/equities", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncError(body.error || `Sync failed (${res.status})`);
        return;
      }
      onChanged();
    } catch {
      setSyncError("Network error — the sync may still be running (check Jobs).");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="px-4 py-3 border-b border-stone-100 dark:border-border-subtle flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-text">Stock sales</h2>
          <p className="text-[11px] text-stone-400 dark:text-text-faint">
            {equities.lastSyncedAt
              ? `${equities.saleCount} sale${equities.saleCount !== 1 ? "s" : ""} this year · synced ${new Date(equities.lastSyncedAt).toLocaleString()}`
              : "Never synced — run a sync to pull sell history from your brokers"}
          </p>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-surface-muted text-white dark:text-text hover:bg-stone-800 transition-colors disabled:opacity-50 shrink-0"
        >
          {syncing ? "Syncing… (minutes)" : "Sync"}
        </button>
      </div>

      {syncError && <p className="px-4 py-2 text-xs text-red-500 dark:text-red-400">{syncError}</p>}

      {equities.needsBasis.length > 0 && (
        <div>
          <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            Needs cost basis ({equities.needsBasis.length}) — shares arrived via transfer/RSU, so the
            broker feed has no purchase record. Enter what you paid (from your transfer statement or
            RSU vest confirmation) and when you acquired them.
          </p>
          <ul className="divide-y divide-stone-100 dark:divide-border-subtle">
            {equities.needsBasis.map((n) => (
              <li key={n.key} className="px-4 py-2.5">
                <button
                  className="w-full flex items-center justify-between text-sm"
                  onClick={() => setOpenKey(openKey === n.key ? null : n.key)}
                >
                  <span className="font-medium text-stone-900 dark:text-text">
                    {n.symbol}
                    <span className="ml-2 text-xs font-normal text-stone-400 dark:text-text-faint">
                      {n.units % 1 === 0 ? n.units : n.units.toFixed(2)} sh · {n.institution} · sold {fmtDate(n.sell_date)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-stone-900 dark:text-text">
                    {fmtMoney(locked, n.proceeds)}
                  </span>
                </button>
                {openKey === n.key && (
                  <BasisForm item={n} onSaved={() => { setOpenKey(null); onChanged(); }} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {equities.lastSyncedAt && equities.needsBasis.length === 0 && (
        <p className="px-4 py-3 text-xs text-stone-400 dark:text-text-faint">
          All stock sales have cost basis — everything is included in the quarterly math above.
        </p>
      )}
    </section>
  );
}

function BasisForm({ item, onSaved }: { item: NeedsBasisItem; onSaved: () => void }) {
  const [basis, setBasis] = useState("");
  const [acquired, setAcquired] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const costBasis = Number(basis);
    if (!Number.isFinite(costBasis) || costBasis < 0) {
      setError("Enter the total cost basis in dollars");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(acquired)) {
      setError("Enter the acquisition date");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/taxes/basis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_key: item.key, cost_basis: costBasis, acquired_date: acquired }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Save failed (${res.status})`);
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-stone-200 dark:border-border-default bg-transparent px-2.5 py-1.5 text-sm text-stone-900 dark:text-text placeholder:text-stone-300 dark:placeholder:text-text-faint focus:outline-none focus:border-stone-400";

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-text-faint">
            Total cost basis ($)
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={basis}
            onChange={(e) => setBasis(e.target.value.replace(/[^0-9.]/g, ""))}
            className={inputClass}
            placeholder={`for ${item.units % 1 === 0 ? item.units : item.units.toFixed(2)} shares`}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-text-faint">
            Acquired on
          </label>
          <input
            type="date"
            value={acquired}
            onChange={(e) => setAcquired(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving || !basis || !acquired}
        className="self-end text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-surface-muted text-white dark:text-text disabled:opacity-40"
      >
        {saving ? "Saving…" : "Save basis"}
      </button>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
