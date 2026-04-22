export default function SettingsPage() {
  return (
    <div className="flex flex-col flex-1 px-4 py-6">
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        <h2 className="text-lg font-bold text-stone-900">Settings</h2>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900">Alert Preferences</h3>
            <p className="mt-1 text-sm text-stone-500">
              Configure how you want to be notified about breakout signals and position triggers.
            </p>
            <div className="mt-3 px-3 py-2 rounded-lg bg-stone-50 text-xs text-stone-400 font-medium">
              Coming soon
            </div>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-900">Scoring Preferences</h3>
            <p className="mt-1 text-sm text-stone-500">
              Tune the weights for technical indicators in the explosive stock scoring engine.
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
