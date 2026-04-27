"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [startingCash, setStartingCash] = useState("20000");
  const [alertEmail, setAlertEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testError, setTestError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setStartingCash(String(d.settings.starting_cash || "20000"));
          setAlertEmail(d.settings.alert_email || "");
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starting_cash: Number(startingCash) || 20000,
          alert_email: alertEmail || null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestStatus("sending");
    setTestError("");
    try {
      const res = await fetch("/api/email/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setTestStatus("error");
        setTestError(data.error || "Failed to send");
        return;
      }
      setTestStatus("sent");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch {
      setTestStatus("error");
      setTestError("Network error");
    }
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/more"
            className="p-1.5 -ml-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </Link>
          <h2 className="text-lg font-bold text-stone-900">Settings</h2>
        </div>

        {/* Account Settings */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Account Settings</h3>
          <p className="mt-1 text-sm text-stone-500">
            Configure your trading account defaults.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="starting-cash"
                className="block text-xs font-medium text-stone-700 mb-1"
              >
                Starting Cash
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                  $
                </span>
                <input
                  id="starting-cash"
                  type="text"
                  inputMode="numeric"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 pl-7 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="20000"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="alert-email"
                className="block text-xs font-medium text-stone-700 mb-1"
              >
                Alert Email
              </label>
              <input
                id="alert-email"
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="you@example.com"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="self-start rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 active:bg-stone-700 transition-colors disabled:opacity-50"
            >
              {saved ? "Saved!" : saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Alert Preferences */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Alert Preferences</h3>
          <p className="mt-1 text-sm text-stone-500">
            Configure how you want to be notified about breakout signals and
            position triggers.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              onClick={handleTestEmail}
              disabled={!alertEmail || testStatus === "sending"}
              className="self-start rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500 active:bg-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testStatus === "sending"
                ? "Sending..."
                : testStatus === "sent"
                ? "Sent! Check your inbox"
                : "Send Test Email"}
            </button>
            {!alertEmail && (
              <p className="text-xs text-stone-400">Save an alert email above first.</p>
            )}
            {testStatus === "error" && (
              <p className="text-xs text-red-500">{testError}</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Scoring Preferences</h3>
          <p className="mt-1 text-sm text-stone-500">
            Tune the weights for technical indicators in the explosive stock
            scoring engine.
          </p>
          <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 text-xs text-stone-400 font-medium">
            Coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
