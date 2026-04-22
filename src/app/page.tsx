export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen font-sans">
      <main className="flex flex-col items-center gap-8 px-6 text-center max-w-lg">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">
            stonkbro
          </h1>
          <p className="text-sm font-medium text-stone-400 tracking-widest uppercase">
            coming soon
          </p>
        </div>

        <div className="w-16 h-px bg-stone-300" />

        <p className="text-lg leading-relaxed text-stone-600">
          Explosive stock discovery meets options strategy automation.
          Find the movers. Structure the trades. Manage the positions.
        </p>

        <div className="flex flex-col gap-3 text-sm text-stone-500">
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span>Technical breakout scanner with scoring engine</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span>PMCC, covered call & put-selling analyzer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span>Real-time alerts & position management</span>
          </div>
        </div>

        <div className="mt-4 px-5 py-2.5 rounded-full border border-stone-200 text-xs font-medium text-stone-400">
          Phase 1 in development
        </div>
      </main>
    </div>
  );
}
