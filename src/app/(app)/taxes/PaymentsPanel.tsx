"use client";

import { useState } from "react";
import { usePrivacy } from "@/components/PrivacyProvider";
import type { TaxPaymentRow } from "@/lib/db/tax-payments";
import { fmtDate, fmtMoney } from "./format";

const inputClass =
  "w-full rounded-lg border border-stone-200 dark:border-border-subtle bg-white dark:bg-surface-muted px-3 py-2 text-sm text-stone-900 dark:text-text placeholder:text-stone-300 dark:placeholder:text-text-faint focus:outline-none focus:ring-2 focus:ring-accent/40";

export default function PaymentsPanel({
  payments,
  onChanged,
}: {
  payments: TaxPaymentRow[];
  onChanged: () => void;
}) {
  const { locked } = usePrivacy();
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(amount);
    if (!paidDate || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a date and a positive amount.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid_date: paidDate, amount: parsed, note: note || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to record payment (${res.status})`);
      }
      setAmount("");
      setNote("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/taxes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to delete (${res.status})`);
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete payment");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="bg-white dark:bg-surface-elevated border border-stone-100 dark:border-border-subtle rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 dark:border-border-subtle">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-text">Recorded payments</h2>
        <p className="text-[11px] text-stone-400 dark:text-text-faint">
          One-off payments you&apos;ve sent (IRS Direct Pay / EFTPS). Recommendations adjust automatically.
        </p>
      </div>

      <form onSubmit={submit} className="px-4 py-3 flex flex-col gap-2 border-b border-stone-100 dark:border-border-subtle">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className={inputClass}
            aria-label="Payment date"
            required
          />
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount ($)"
            className={inputClass}
            aria-label="Payment amount"
            required
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          maxLength={500}
          className={inputClass}
          aria-label="Payment note"
        />
        <button
          type="submit"
          disabled={busy}
          className="self-start px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:opacity-90 transition-colors disabled:opacity-50"
        >
          {busy ? "Recording…" : "Record payment"}
        </button>
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>

      {payments.length === 0 ? (
        <p className="px-4 py-4 text-sm text-stone-400 dark:text-text-faint">
          No payments recorded yet for this tax year.
        </p>
      ) : (
        <ul className="divide-y divide-stone-100 dark:divide-border-subtle">
          {payments.map((p) => (
            <li key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-text tabular-nums">
                  {fmtMoney(locked, p.amount)}
                  <span className="ml-2 text-xs font-normal text-stone-400 dark:text-text-faint">
                    {fmtDate(p.paid_date)}
                  </span>
                </p>
                {p.note && (
                  <p className="text-xs text-stone-400 dark:text-text-faint truncate">{p.note}</p>
                )}
              </div>
              <button
                onClick={() => remove(p.id)}
                disabled={deleting === p.id}
                className="shrink-0 text-xs font-medium text-stone-400 dark:text-text-faint hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                aria-label={`Delete payment of ${p.amount} on ${p.paid_date}`}
              >
                {deleting === p.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
