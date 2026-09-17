"use client";

import { useEffect, useState } from "react";
import { Group, Row } from "./ui";

interface PendingRequest {
  user_id: string;
  email: string;
  requested_at: string;
}

/**
 * Pending Portfolio access requests, with Approve/Deny right here — the
 * same actions the alert banner offers, for when the admin isn't chasing
 * it down from there. Self-hides for anyone the admin API 403s (never
 * trusts a client-side admin flag).
 */
export default function AdminAccessSection() {
  const [requests, setRequests] = useState<PendingRequest[] | null>(null);
  const [visible, setVisible] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [decideError, setDecideError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/admin/portfolio-access");
      if (res.status === 401 || res.status === 403) {
        setVisible(false);
        return;
      }
      const data = await res.json();
      if (res.ok) setRequests(data.requests ?? []);
    } catch {
      // best-effort — stay hidden rather than show a broken section
    }
  }

  useEffect(() => {
    // Data fetch on mount, from an admin-gated API route — the setState
    // happens inside `load`'s own async callback, not synchronously in the
    // effect body itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function decide(userId: string, decision: "approved" | "denied") {
    setDeciding(userId);
    setDecideError(null);
    try {
      const res = await fetch("/api/admin/portfolio-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, decision }),
      });
      if (res.ok) {
        setRequests((prev) => (prev ?? []).filter((r) => r.user_id !== userId));
        return;
      }
      const body = await res.json().catch(() => ({}));
      setDecideError(body.error || `${decision === "approved" ? "Approve" : "Deny"} failed (${res.status})`);
    } catch {
      setDecideError("Network error — try again");
    } finally {
      setDeciding(null);
    }
  }

  if (!visible || !requests || requests.length === 0) return null;

  return (
    <Group
      header="Portfolio access requests"
      footer={decideError ? <span className="text-red-500 dark:text-loss">{decideError}</span> : undefined}
    >
      {requests.map((r) => (
        <Row key={r.user_id} label={r.email} sub={new Date(r.requested_at).toLocaleDateString()}>
          <button
            onClick={() => decide(r.user_id, "approved")}
            disabled={deciding === r.user_id}
            className="text-[13px] font-semibold text-emerald-600 dark:text-gain disabled:opacity-40"
          >
            {deciding === r.user_id ? "Working…" : "Approve"}
          </button>
          <button
            onClick={() => decide(r.user_id, "denied")}
            disabled={deciding === r.user_id}
            className="text-[13px] font-semibold text-red-500 dark:text-loss disabled:opacity-40"
          >
            Deny
          </button>
        </Row>
      ))}
    </Group>
  );
}
