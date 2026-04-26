"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Settings {
  starting_cash: number;
  alert_email: string;
  ai_provider: string;
  alert_position_signals: boolean;
  alert_explosive_movers: boolean;
  alert_earnings: boolean;
  alert_recommendations: boolean;
  alert_frequency: string;
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
        enabled ? "bg-sky-500" : "bg-stone-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="flex-1 mr-4">
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-500 mt-0.5">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    starting_cash: 20000,
    alert_email: "",
    ai_provider: "claude",
    alert_position_signals: true,
    alert_explosive_movers: true,
    alert_earnings: true,
    alert_recommendations: true,
    alert_frequency: "three_daily",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings(d.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveField = useCallback(
    async (updates: Partial<Settings>) => {
      const newSettings = { ...settings, ...updates };
      setSettings(newSettings);
      setSaving(true);

      try {
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        setLastSaved(new Date().toLocaleTimeString());
      } catch {
        // Revert on error
        setSettings(settings);
      }
      setSaving(false);
    },
    [settings]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 py-20">
        <span className="text-sm text-stone-400">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/more"
            className="p-1.5 -ml-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </Link>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-stone-900">Settings</h2>
          </div>
          {lastSaved && !saving && (
            <span className="text-[10px] text-emerald-600 font-medium">Saved</span>
          )}
          {saving && (
            <span className="text-[10px] text-stone-400">Saving...</span>
          )}
        </div>

        {/* Alert Preferences */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-1">
          <div className="py-3 border-b border-stone-100">
            <h3 className="text-sm font-semibold text-stone-900">Email Alerts</h3>
            <p className="text-xs text-stone-500 mt-0.5">Choose what shows up in your daily briefing</p>
          </div>

          <ToggleRow
            label="Position Signals"
            description="Roll, close, and profit target alerts for your open positions"
            enabled={settings.alert_position_signals}
            onChange={(v) => saveField({ alert_position_signals: v })}
          />
          <ToggleRow
            label="Explosive Movers"
            description="Stocks making 5%+ moves or 3x volume with trade suggestions"
            enabled={settings.alert_explosive_movers}
            onChange={(v) => saveField({ alert_explosive_movers: v })}
          />
          <ToggleRow
            label="Earnings Alerts"
            description="Warn when your positions have earnings approaching"
            enabled={settings.alert_earnings}
            onChange={(v) => saveField({ alert_earnings: v })}
          />
          <ToggleRow
            label="AI Recommendations"
            description="Include AI-generated trade suggestions in briefings"
            enabled={settings.alert_recommendations}
            onChange={(v) => saveField({ alert_recommendations: v })}
          />
        </div>

        {/* Frequency */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Alert Frequency</h3>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">How often you want email briefings</p>

          <div className="flex flex-col gap-1.5">
            {[
              { value: "morning_only", label: "Morning only", desc: "One email at 9:30 AM ET" },
              { value: "three_daily", label: "3x daily", desc: "9:30 AM, 12 PM, 3:30 PM ET" },
              { value: "realtime", label: "Every alert", desc: "Email for each significant event" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => saveField({ alert_frequency: opt.value })}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  settings.alert_frequency === opt.value
                    ? "border-sky-300 bg-sky-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="text-left">
                  <p className={`text-sm font-medium ${settings.alert_frequency === opt.value ? "text-sky-700" : "text-stone-700"}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-stone-500">{opt.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  settings.alert_frequency === opt.value
                    ? "border-sky-500"
                    : "border-stone-300"
                }`}>
                  {settings.alert_frequency === opt.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Provider */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">AI Provider</h3>
          <p className="text-xs text-stone-500 mt-0.5 mb-3">Primary AI for research (auto-fallback if rate limited)</p>

          <div className="flex gap-2">
            {[
              { value: "claude", label: "Claude" },
              { value: "gemini", label: "Gemini" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => saveField({ ai_provider: opt.value })}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                  settings.ai_provider === opt.value
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Account</h3>
          <div className="mt-3 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Starting Cash</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={settings.starting_cash}
                  onChange={(e) => setSettings({ ...settings, starting_cash: Number(e.target.value) || 0 })}
                  onBlur={() => saveField({ starting_cash: settings.starting_cash })}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 pl-7 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Alert Email</label>
              <input
                type="email"
                value={settings.alert_email || ""}
                onChange={(e) => setSettings({ ...settings, alert_email: e.target.value })}
                onBlur={() => saveField({ alert_email: settings.alert_email })}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
