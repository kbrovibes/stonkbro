"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface TokenUsageRow {
  email: string;
  provider: string;
  feature: string;
  total_input: number;
  total_output: number;
  call_count: number;
}

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
}

interface AdminData {
  userCount: number;
  usage: TokenUsageRow[];
  defaultProvider: string;
  availableProviders: { claude: boolean; gemini: boolean };
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [tradier, setTradier] = useState<TradierProfile | null>(null);
  const [tradierLoading, setTradierLoading] = useState(true);
  const [tradierError, setTradierError] = useState<string | null>(null);

  const fetchAdmin = useCallback(async () => {
    const res = await fetch("/api/admin");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, []);

  const fetchTradier = useCallback(async () => {
    setTradierLoading(true);
    setTradierError(null);
    try {
      const res = await fetch("/api/tradier-usage");
      const json = await res.json();
      if (json.error) setTradierError(json.error);
      else setTradier(json);
    } catch {
      setTradierError("Failed to connect");
    } finally {
      setTradierLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmin();
    fetchTradier();
  }, [fetchAdmin, fetchTradier]);

  async function toggleProvider() {
    if (!data) return;
    const next = data.defaultProvider === "claude" ? "gemini" : "claude";
    setSwitching(true);
    await fetch("/api/admin/provider", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: next }),
    });
    setData({ ...data, defaultProvider: next });
    setSwitching(false);
  }

  function estimateCost(provider: string, input: number, output: number): string {
    // Rough estimates per 1M tokens
    if (provider === "claude") {
      return (input * 3 / 1_000_000 + output * 15 / 1_000_000).toFixed(4);
    }
    // Gemini Flash is much cheaper
    return (input * 0.075 / 1_000_000 + output * 0.3 / 1_000_000).toFixed(4);
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="p-1.5 -ml-1.5 rounded-lg text-stone-400 dark:text-text-faint hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-surface-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </Link>
          <h2 className="text-lg font-bold text-stone-900 dark:text-text">Admin</h2>
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full">
            Admin only
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* User Count + AI Provider — side by side */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-white dark:bg-surface-elevated shadow-sm px-4 py-3">
                <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wide">Users</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-text mt-1">{data.userCount}</p>
              </div>
              <div className="rounded-xl bg-white dark:bg-surface-elevated shadow-sm px-4 py-3">
                <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wide">AI Provider</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-stone-900 dark:text-text capitalize">{data.defaultProvider}</span>
                  <button
                    onClick={toggleProvider}
                    disabled={switching}
                    className="text-[10px] font-medium text-sky-600 dark:text-accent hover:text-sky-800 transition-colors disabled:opacity-40"
                  >
                    {switching ? "..." : "Switch"}
                  </button>
                </div>
                <div className="flex gap-2 mt-1.5">
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    data.availableProviders.claude ? "bg-emerald-50 dark:bg-gain-bg text-emerald-600 dark:text-gain" : "bg-red-50 dark:bg-loss-bg text-red-400"
                  }`}>
                    Claude {data.availableProviders.claude ? "✓" : "✗"}
                  </span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                    data.availableProviders.gemini ? "bg-emerald-50 dark:bg-gain-bg text-emerald-600 dark:text-gain" : "bg-red-50 dark:bg-loss-bg text-red-400"
                  }`}>
                    Gemini {data.availableProviders.gemini ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Usage */}
            <div className="rounded-xl bg-white dark:bg-surface-elevated shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 dark:border-border-subtle">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-text">AI Token Usage</h3>
                <p className="text-[10px] text-stone-400 dark:text-text-faint mt-0.5">Last 30 days</p>
              </div>
              {data.usage.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-stone-400 dark:text-text-faint">No usage data yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-stone-100 dark:border-border-subtle">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wide">User</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wide">Provider</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wide">Feature</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wide">Calls</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wide">Tokens</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold text-stone-400 dark:text-text-faint uppercase tracking-wide">Est. $</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100/80">
                      {data.usage.map((row, i) => (
                        <tr key={i} className="hover:bg-stone-50 dark:hover:bg-surface-muted">
                          <td className="px-3 py-2 text-stone-700 dark:text-text-muted truncate max-w-[100px]">{row.email}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                              row.provider === "claude" ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300" : "bg-sky-50 dark:bg-accent-bg text-sky-600 dark:text-accent"
                            }`}>
                              {row.provider}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-stone-500 dark:text-text-subtle">{row.feature}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-stone-700 dark:text-text-muted">{row.call_count}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-stone-700 dark:text-text-muted">
                            {((row.total_input + row.total_output) / 1000).toFixed(1)}k
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-stone-700 dark:text-text-muted">
                            ${estimateCost(row.provider, row.total_input, row.total_output)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tradier API */}
            <div className="rounded-xl bg-white dark:bg-surface-elevated shadow-sm px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-stone-900 dark:text-text">Tradier API</h3>
                <button
                  onClick={fetchTradier}
                  disabled={tradierLoading}
                  className="text-xs text-sky-600 dark:text-accent hover:text-sky-800 active:opacity-60 transition-colors disabled:opacity-40"
                >
                  {tradierLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
              <p className="mt-1 text-sm text-stone-500 dark:text-text-subtle">Market data provider status.</p>

              <div className="mt-3">
                {tradierLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <div className="w-2 h-2 rounded-full bg-stone-300 dark:bg-border-strong animate-pulse" />
                    <span className="text-xs text-stone-400 dark:text-text-faint">Checking connection...</span>
                  </div>
                ) : tradierError ? (
                  <div className="flex items-center gap-2 py-3">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-xs text-red-500 dark:text-loss">{tradierError}</span>
                  </div>
                ) : tradier ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs font-medium text-green-700 dark:text-gain-strong">Connected</span>
                      <span className="text-[10px] text-stone-400 dark:text-text-faint">
                        {tradier.env === "sandbox" ? "sandbox.tradier.com" : "api.tradier.com"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-stone-50 dark:bg-surface px-3 py-2">
                        <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wide">Account</p>
                        <p className="text-sm font-semibold text-stone-900 dark:text-text tabular-nums mt-0.5">
                          {tradier.account?.accountNumber || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 dark:bg-surface px-3 py-2">
                        <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wide">Status</p>
                        <p className="text-sm font-semibold text-stone-900 dark:text-text mt-0.5">
                          {tradier.account?.status || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 dark:bg-surface px-3 py-2">
                        <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wide">Type</p>
                        <p className="text-sm font-semibold text-stone-900 dark:text-text mt-0.5">
                          {tradier.account?.classification || "N/A"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-stone-50 dark:bg-surface px-3 py-2">
                        <p className="text-[10px] text-stone-400 dark:text-text-faint uppercase tracking-wide">Name</p>
                        <p className="text-sm font-semibold text-stone-900 dark:text-text mt-0.5">
                          {tradier.profile.name}
                        </p>
                      </div>
                    </div>
                    {tradier.env === "sandbox" && (
                      <div className="px-3 py-2 rounded-lg bg-sky-50 dark:bg-accent-bg border border-sky-100 dark:border-accent-border">
                        <p className="text-xs text-sky-700 dark:text-accent-hover font-medium">Sandbox Mode</p>
                        <p className="text-[10px] text-sky-600 dark:text-accent mt-0.5">
                          Using delayed/simulated data.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
