export default function DiscoverPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-stone-900">Your watchlist is empty</h2>
          <p className="mt-1 text-sm text-stone-500">
            Add tickers to start scanning for explosive setups.
          </p>
        </div>
      </div>
    </div>
  );
}
