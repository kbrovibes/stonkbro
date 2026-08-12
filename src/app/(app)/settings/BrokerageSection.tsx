"use client";

import { useState, useEffect } from "react";
import { Group, Row, ActionRow } from "./ui";

interface Connection {
  id: string;
  brokerage: string;
  slug: string;
  type: string;
  disabled: boolean;
  created_date: string;
}

interface AccountInfo {
  id: string;
  name: string;
  number: string;
  institution: string;
}

/**
 * Brokerage connections via SnapTrade. All connections hang off the app's
 * single SnapTrade user, so a newly linked brokerage (e.g. Chase) flows
 * into Portfolio/Hindsight automatically — the backfill action just
 * rebuilds the cached 2026 math so history includes the new accounts.
 */
export default function BrokerageSection() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [visible, setVisible] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [linking, setLinking] = useState<"idle" | "generating" | string>("idle");
  const [backfill, setBackfill] = useState<"idle" | "chains" | "snapshots" | "done" | string>("idle");

  async function load() {
    try {
      const res = await fetch("/api/portfolio/connections");
      if (res.status === 401 || res.status === 403) {
        setVisible(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error || `Failed to load connections (${res.status})`);
        setConnections([]);
        return;
      }
      setConnections(data.connections ?? []);
      setAccounts(data.accounts ?? []);
    } catch {
      setLoadError("Network error — check your connection");
      setConnections([]);
    }
  }

  useEffect(() => {
    load();
    // Re-check when the user returns from the SnapTrade portal tab.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openPortal(reconnect?: string) {
    setLinking("generating");
    try {
      const res = await fetch("/api/portfolio/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reconnect ? { reconnect } : {}),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setLinking(data.error || `Failed to generate link (${res.status})`);
        return;
      }
      window.open(data.url, "_blank", "noopener");
      setLinking("idle");
    } catch {
      setLinking("Network error — check your connection");
    }
  }

  async function runBackfill() {
    setBackfill("chains");
    try {
      // startDate must match CHAIN_CACHE_START_DATE or the refreshed scan
      // won't be written back to the cache the portfolio page reads.
      const chainRes = await fetch("/api/portfolio?include=option-chains&startDate=2025-01-01&refresh=1");
      if (!chainRes.ok) {
        const data = await chainRes.json().catch(() => ({}));
        setBackfill(data.error || `Chain rebuild failed (${chainRes.status})`);
        return;
      }
      setBackfill("snapshots");
      const tmRes = await fetch("/api/portfolio/time-machine/backfill", { method: "POST" });
      if (!tmRes.ok) {
        const data = await tmRes.json().catch(() => ({}));
        setBackfill(data.error || `Snapshot backfill failed (${tmRes.status})`);
        return;
      }
      setBackfill("done");
    } catch {
      setBackfill("Network error — the rebuild may still be running server-side");
    }
  }

  if (!visible) return null;

  const accountsFor = (institution: string) =>
    accounts.filter((a) => a.institution === institution);

  const backfillBusy = backfill === "chains" || backfill === "snapshots";

  return (
    <Group
      header="Brokerages"
      footer={
        <>
          Connections sync through SnapTrade (read-only). After linking a new brokerage,
          run the rebuild so 2026 income, chains, and monthly snapshots include its history —
          it re-pulls every transaction and takes a few minutes.
        </>
      }
    >
      {connections === null && <Row label="Loading connections…" />}

      {connections?.map((c) => {
        const accts = accountsFor(c.brokerage);
        return (
          <Row
            key={c.id}
            label={c.brokerage}
            sub={
              accts.length > 0
                ? accts.map((a) => `${a.name} ••${a.number.slice(-4)}`).join(" · ")
                : c.created_date
                ? `Linked ${c.created_date.slice(0, 10)}`
                : undefined
            }
          >
            {c.disabled ? (
              <button
                onClick={() => openPortal(c.id)}
                className="text-[12px] font-medium text-red-500 dark:text-loss"
              >
                Disabled — Fix
              </button>
            ) : (
              <span className="text-[12px] font-medium text-emerald-600 dark:text-gain">Active</span>
            )}
          </Row>
        );
      })}

      {connections !== null && connections.length === 0 && !loadError && (
        <Row label="No brokerages connected" />
      )}

      <ActionRow onClick={() => openPortal()} disabled={linking === "generating"}>
        {linking === "generating" ? "Opening SnapTrade portal…" : "Connect a Brokerage…"}
      </ActionRow>
      {linking !== "idle" && linking !== "generating" && (
        <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{linking}</p>
      )}

      <ActionRow onClick={runBackfill} disabled={backfillBusy}>
        {backfill === "chains"
          ? "Rebuilding option chains… (takes a few minutes)"
          : backfill === "snapshots"
          ? "Rebuilding monthly snapshots…"
          : backfill === "done"
          ? "Done — 2026 data rebuilt"
          : "Rebuild 2026 Data"}
      </ActionRow>
      {backfill !== "idle" && backfill !== "done" && !backfillBusy && (
        <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{backfill}</p>
      )}

      {loadError && <p className="px-4 py-2 text-[12px] text-red-500 dark:text-loss">{loadError}</p>}
    </Group>
  );
}
