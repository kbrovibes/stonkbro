"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [startingCash, setStartingCash] = useState("20000");
  const [alertEmail, setAlertEmail] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        <h2 className="text-lg font-bold text-stone-900">Settings</h2>

        <div className="flex flex-col gap-4">
          {/* Account settings */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900">
              Account Settings
            </h3>
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
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 pl-7 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
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
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-stone-300"
                  placeholder="you@example.com"
                />
              </div>

              <button
                onClick={handleSave}
                className="self-start rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 active:bg-stone-700 transition-colors"
              >
                {saved ? "Saved!" : "Save Settings"}
              </button>
            </div>
          </div>

          {/* Coming soon cards */}
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900">
              Alert Preferences
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Configure how you want to be notified about breakout signals and
              position triggers.
            </p>
            <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 text-xs text-stone-400 font-medium">
              Coming soon
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900">
              Scoring Preferences
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              Tune the weights for technical indicators in the explosive stock
              scoring engine.
            </p>
            <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 text-xs text-stone-400 font-medium">
              Coming soon
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900">Account</h3>
            <p className="mt-1 text-sm text-stone-500">
              Sign in to sync your watchlist and positions across devices.
            </p>
            <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 text-xs text-stone-400 font-medium">
              Coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
