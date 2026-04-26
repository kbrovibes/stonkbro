"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface TradierProfile {
  env: string;
  profile: { name: string; id: string };
  account: {
    accountNumber: string;
    type: string;
    classification: string;
    status: string;
    dayTrader: boolean;
  } | null;
  error?: string;
}

export default function SettingsPage() {
  const [startingCash, setStartingCash] = useState("20000");
  const [alertEmail, setAlertEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [tradierData, setTradierData] = useState<TradierProfile | null>(null);
  const [tradierLoading, setTradierLoading] = useState(true);
  const [tradierError, setTradierError] = useState<string | null>(null);
  const [envMode, setEnvMode] = useState<"sandbox" | "production">("sandbox");

  const fetchTradierUsage = useCallback(async () => {
    setTradierLoading(true);
    setTradierError(null);
    try {
      const res = await fetch("/api/tradier-usage");
      const data = await res.json();
      if (data.error) {
        setTradierError(data.error);
      } else {
        setTradierData(data);
        setEnvMode(data.env === "production" ? "production" : "sandbox");
      }
    } catch {
      setTradierError("Failed to connect to API");
    } finally {
      setTradierLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTradierUsage();
  }, [fetchTradierUsage]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

        {/* Tradier API */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-900">Tradier API</h3>
            <button
              onClick={fetchTradierUsage}
              disabled={tradierLoading}
              className="text-xs text-sky-600 hover:text-sky-800 active:opacity-60 transition-colors disabled:opacity-40"
            >
              {tradierLoading ? "Loading..." : "Refresh"}
            </button>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Market data provider status and account info.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            {/* Environment Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-stone-700">Environment</p>
                <p className="text-[10px] text-stone-400 mt-0.5">
                  Production requires a funded Tradier account
                </p>
              </div>
              <button
                onClick={() => {
                  if (envMode === "sandbox") {
                    // Don't actually switch — just show the intent
                    setEnvMode("sandbox");
                  }
                }}
                className="relative inline-flex h-7 w-[120px] items-center rounded-full border border-stone-200 bg-stone-100 p-0.5 transition-colors"
              >
                <span
                  className={`absolute h-6 w-[58px] rounded-full bg-white shadow-sm transition-all duration-200 ${
                    envMode === "production" ? "left-[60px]" : "left-0.5"
                  }`}
                />
                <span
                  className={`relative z-10 flex-1 text-center text-[10px] font-semibold transition-colors ${
                    envMode === "sandbox" ? "text-stone-900" : "text-stone-400"
                  }`}
                >
                  Sandbox
                </span>
                <span
                  className={`relative z-10 flex-1 text-center text-[10px] font-semibold transition-colors ${
                    envMode === "production" ? "text-stone-900" : "text-stone-400"
                  }`}
                >
                  Prod
                </span>
              </button>
            </div>

            <div className="border-t border-stone-100/80" />

            {/* API Status */}
            {tradierLoading ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-2 h-2 rounded-full bg-stone-300 animate-pulse" />
                <span className="text-xs text-stone-400">Checking connection...</span>
              </div>
            ) : tradierError ? (
              <div className="flex items-center gap-2 py-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-red-500">{tradierError}</span>
              </div>
            ) : tradierData ? (
              <div className="flex flex-col gap-3">
                {/* Connection status */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-medium text-green-700">Connected</span>
                  <span className="text-[10px] text-stone-400">
                    {tradierData.env === "sandbox" ? "sandbox.tradier.com" : "api.tradier.com"}
                  </span>
                </div>

                {/* Profile Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-stone-50 px-3 py-2">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Account</p>
                    <p className="text-sm font-semibold text-stone-900 tabular-nums mt-0.5">
                      {tradierData.account?.accountNumber || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-stone-50 px-3 py-2">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Status</p>
                    <p className="text-sm font-semibold text-stone-900 mt-0.5">
                      {tradierData.account?.status || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-stone-50 px-3 py-2">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Type</p>
                    <p className="text-sm font-semibold text-stone-900 mt-0.5">
                      {tradierData.account?.classification || "N/A"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-stone-50 px-3 py-2">
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Name</p>
                    <p className="text-sm font-semibold text-stone-900 mt-0.5">
                      {tradierData.profile.name}
                    </p>
                  </div>
                </div>

                {/* Sandbox notice */}
                {tradierData.env === "sandbox" && (
                  <div className="px-3 py-2 rounded-lg bg-sky-50 border border-sky-100">
                    <p className="text-xs text-sky-700 font-medium">Sandbox Mode</p>
                    <p className="text-[10px] text-sky-600 mt-0.5">
                      Using delayed/simulated data. Upgrade to a production API key for real-time quotes.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
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
              className="self-start rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800 active:bg-stone-700 transition-colors"
            >
              {saved ? "Saved!" : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Coming soon cards */}
        <div className="rounded-xl bg-white shadow-sm px-4 py-3">
          <h3 className="text-sm font-semibold text-stone-900">Alert Preferences</h3>
          <p className="mt-1 text-sm text-stone-500">
            Configure how you want to be notified about breakout signals and
            position triggers.
          </p>
          <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 text-xs text-stone-400 font-medium">
            Coming soon
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
