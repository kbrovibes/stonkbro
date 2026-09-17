"use client";

import { useEffect, useState } from "react";

type RequestStatus = "loading" | "none" | "pending" | "approved" | "denied" | "error";

/**
 * Shown instead of the Portfolio page when the viewer isn't the owner and
 * hasn't been approved yet. Self-contained: checks their own request status
 * on mount, lets them file (or re-file, after a denial) a request, and
 * reflects back whatever state the admin has put them in.
 */
export function RequestAccessPrompt() {
  const [status, setStatus] = useState<RequestStatus>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/portfolio/access-request")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setStatus(d.status ?? "none"))
      .catch(() => setStatus("error"));
  }, []);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/portfolio/access-request", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setStatus(res.ok ? data.status ?? "pending" : "error");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 p-8 text-center">
      <div className="text-3xl">🔒</div>
      <p className="text-stone-700 dark:text-text-muted font-medium">Portfolio is invite-only</p>
      <p className="text-xs text-stone-400 dark:text-text-faint max-w-xs">
        Live positions and option chains come from your own brokerage — request access and
        you&apos;ll be able to link it once approved.
      </p>

      {status === "loading" && null}

      {status === "none" && (
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="text-sm font-semibold text-sky-600 dark:text-accent hover:underline disabled:opacity-40"
        >
          {submitting ? "Requesting…" : "Request access"}
        </button>
      )}

      {status === "pending" && (
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
          Request pending — you&apos;ll get access as soon as it&apos;s approved.
        </p>
      )}

      {status === "denied" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold text-red-500 dark:text-loss">Access denied.</p>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="text-xs font-semibold text-sky-600 dark:text-accent hover:underline disabled:opacity-40"
          >
            {submitting ? "Requesting…" : "Ask again"}
          </button>
        </div>
      )}

      {status === "error" && (
        <p className="text-xs text-stone-400 dark:text-text-faint">Couldn&apos;t load your request status.</p>
      )}
    </div>
  );
}

/**
 * Shown when the viewer IS approved but hasn't linked a brokerage yet —
 * `/api/portfolio` returns 409 in that state. Sends them through SnapTrade's
 * own hosted connect portal, the same mechanism the owner's account uses;
 * this app never sees or handles their actual brokerage credentials.
 */
export function ConnectBrokeragePrompt() {
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  async function connect() {
    setLinking(true);
    setError("");
    try {
      const res = await fetch("/api/portfolio/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to start linking");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start linking");
      setLinking(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 p-8 text-center">
      <div className="text-3xl">🔗</div>
      <p className="text-stone-700 dark:text-text-muted font-medium">You&apos;re approved — link your brokerage</p>
      <p className="text-xs text-stone-400 dark:text-text-faint max-w-xs">
        You&apos;ll be sent to SnapTrade&apos;s own secure portal to sign into your brokerage there —
        this app never sees your brokerage login, only the positions it reports back.
      </p>
      <button
        type="button"
        onClick={connect}
        disabled={linking}
        className="text-sm font-semibold text-sky-600 dark:text-accent hover:underline disabled:opacity-40"
      >
        {linking ? "Opening…" : "Connect your brokerage"}
      </button>
      {error && <p className="text-xs text-red-500 dark:text-loss">{error}</p>}
    </div>
  );
}
