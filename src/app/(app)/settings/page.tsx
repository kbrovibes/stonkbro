"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import { CLAUDE_MODELS, GEMINI_MODELS } from "@/lib/ai/constants";

export default function SettingsPage() {
  const [startingCash, setStartingCash] = useState("20000");
  const [alertEmail, setAlertEmail] = useState("");
  const [preferredProvider, setPreferredProvider] = useState<"claude" | "gemini">("gemini");
  const [preferredModel, setPreferredModel] = useState("gemini-2.0-flash");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [pingStatus, setPingStatus] = useState<"idle" | "sending" | "done">("idle");
  const [pingResult, setPingResult] = useState("");
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribing, setSubscribing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<Record<string, "idle" | "checking" | "healthy" | "error">>({});
  const [healthErrors, setHealthErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission("unsupported");
    }

    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setStartingCash(String(d.settings.starting_cash || "20000"));
          setAlertEmail(d.settings.alert_email || "");
          setPreferredProvider(d.settings.preferred_ai_provider || "gemini");
          setPreferredModel(d.settings.preferred_ai_model || "gemini-2.0-flash");
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starting_cash: Number(startingCash) || 20000,
          alert_email: alertEmail || null,
          preferred_ai_provider: preferredProvider,
          preferred_ai_model: preferredModel,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Network error — check your connection");
    } finally {
      setSaving(false);
    }
  }

  async function handleEnableNotifications() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== "granted") {
        setSubscribing(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    } catch {
      // silent
    } finally {
      setSubscribing(false);
    }
  }

  async function handleDisableNotifications() {
    setSubscribing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setNotifPermission("default");
    } catch {
      // silent
    } finally {
      setSubscribing(false);
    }
  }

  async function handlePingEmail() {
    setPingStatus("sending");
    setPingResult("");
    try {
      const res = await fetch("/api/email/ping", { method: "POST" });
      const data = await res.json();
      setPingResult(JSON.stringify(data, null, 2));
    } catch (e) {
      setPingResult(`Network error: ${e}`);
    } finally {
      setPingStatus("done");
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

  async function checkAIHealth() {
    const allModels = [
      ...GEMINI_MODELS.map(m => ({ ...m, provider: "gemini" as const })),
      ...CLAUDE_MODELS.map(m => ({ ...m, provider: "claude" as const }))
    ];

    // Reset status
    const initial: Record<string, "checking"> = {};
    allModels.forEach(m => initial[m.id] = "checking");
    setHealthStatus(initial);
    setHealthErrors({});

    // Check all in parallel
    await Promise.all(allModels.map(async (model) => {
      try {
        const res = await fetch("/api/admin/ai-health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: model.provider, model: model.id }),
        });
        const data = await res.json();
        setHealthStatus(prev => ({
          ...prev,
          [model.id]: data.ok ? "healthy" : "error"
        }));
        if (!data.ok) {
          setHealthErrors(prev => ({ ...prev, [model.id]: data.error || "Unknown error" }));
        }
      } catch (err) {
        setHealthStatus(prev => ({ ...prev, [model.id]: "error" }));
        setHealthErrors(prev => ({ ...prev, [model.id]: err instanceof Error ? err.message : "Network error" }));
      }
    }));
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
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          </div>
        </div>

        {/* AI Configuration */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">AI Configuration</h3>
          <p className="mt-1 text-sm text-stone-500">
            Choose which AI engine powers your research, scans, and risk analysis.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-2">
                Primary AI Provider
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPreferredProvider("gemini");
                    setPreferredModel(GEMINI_MODELS[0].id);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-sm font-medium transition-colors ${
                    preferredProvider === "gemini"
                      ? "border-sky-600 bg-sky-50 text-sky-700"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  Gemini (Default)
                </button>
                <button
                  onClick={() => {
                    setPreferredProvider("claude");
                    setPreferredModel(CLAUDE_MODELS[0].id);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 text-sm font-medium transition-colors ${
                    preferredProvider === "claude"
                      ? "border-purple-600 bg-purple-50 text-purple-700"
                      : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Claude
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="ai-model" className="block text-xs font-medium text-stone-700 mb-1">
                Model Selection
              </label>
              <select
                id="ai-model"
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {preferredProvider === "gemini"
                  ? GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  : CLAUDE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
              </select>
              <p className="mt-2 text-[10px] text-stone-400 italic">
                * If your preferred provider reaches its rate limit, the system will automatically failover to the other provider and notify you.
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="self-start rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 active:bg-stone-700 transition-colors disabled:opacity-50"
            >
              {saved ? "Saved!" : saving ? "Saving..." : "Update AI Preferences"}
            </button>
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
          </div>
        </div>

        {/* AI Model Health Check */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-stone-900">AI Model Health</h3>
            <button
              onClick={checkAIHealth}
              disabled={Object.values(healthStatus).some(s => s === "checking")}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 disabled:text-stone-300 transition-colors"
            >
              {Object.values(healthStatus).some(s => s === "checking") ? "Checking..." : "Check All Models"}
            </button>
          </div>
          <p className="text-sm text-stone-500 mb-4">
            Verify that your API keys are valid and models are responding.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {[...GEMINI_MODELS, ...CLAUDE_MODELS].map((model) => {
              const status = healthStatus[model.id] || "idle";
              const isGemini = GEMINI_MODELS.some(m => m.id === model.id);
              
              return (
                <div key={model.id} className="flex items-center justify-between p-2.5 rounded-lg border border-stone-100 bg-stone-50/30">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${isGemini ? "bg-sky-500" : "bg-purple-500"}`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-stone-800">{model.name}</span>
                      <span className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                        {isGemini ? "Google Gemini" : "Anthropic Claude"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {status === "checking" ? (
                      <div className="w-4 h-4 border-2 border-stone-200 border-t-stone-500 rounded-full animate-spin" />
                    ) : status === "healthy" ? (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <span className="text-[10px] font-bold">Healthy</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4.13-5.689Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : status === "error" ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5 text-red-500">
                          <span className="text-[10px] font-bold">Failed</span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                          </svg>
                        </div>
                        {healthErrors[model.id] && (
                          <span className="text-[9px] text-red-400 max-w-[200px] text-right leading-tight">
                            {healthErrors[model.id]}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-stone-300">Not checked</span>
                    )}
                  </div>
                </div>
              );
            })}
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
                : "Send Daily Summary"}
            </button>
            {!alertEmail && (
              <p className="text-xs text-stone-400">Save an alert email above first.</p>
            )}
            {testStatus === "error" && (
              <p className="text-xs text-red-500">{testError}</p>
            )}

            <div className="border-t border-stone-100 pt-3 mt-1">
              <button
                onClick={handlePingEmail}
                disabled={pingStatus === "sending"}
                className="self-start rounded-xl bg-stone-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-600 active:bg-stone-500 transition-colors disabled:opacity-50"
              >
                {pingStatus === "sending" ? "Sending..." : "Test Resend (Debug)"}
              </button>
              <p className="text-[10px] text-stone-400 mt-1">Sends a static test email and shows the raw API response.</p>
              {pingResult && (
                <pre className="mt-2 text-[11px] bg-stone-50 rounded-lg p-3 overflow-x-auto text-stone-700 whitespace-pre-wrap">{pingResult}</pre>
              )}
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Push Notifications</h3>
          <p className="mt-1 text-sm text-stone-500">
            Get notified on your phone when positions need action or explosive movers are detected.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {notifPermission === "unsupported" ? (
              <p className="text-xs text-stone-400">Push notifications are not supported in this browser.</p>
            ) : notifPermission === "granted" ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">Enabled</span>
                <button
                  onClick={handleDisableNotifications}
                  disabled={subscribing}
                  className="text-xs text-stone-500 hover:text-stone-700 underline underline-offset-2 disabled:opacity-50"
                >
                  {subscribing ? "..." : "Disable"}
                </button>
              </div>
            ) : notifPermission === "denied" ? (
              <p className="text-xs text-red-500">
                Notifications blocked. Open your browser settings to re-enable them for this site.
              </p>
            ) : (
              <button
                onClick={handleEnableNotifications}
                disabled={subscribing}
                className="self-start rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 active:bg-purple-400 transition-colors disabled:opacity-50"
              >
                {subscribing ? "Enabling..." : "Enable Notifications"}
              </button>
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
