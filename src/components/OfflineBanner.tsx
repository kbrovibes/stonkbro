"use client";

import { useEffect, useState } from "react";

/**
 * Slim indicator when the device has no network. Pages that need live data
 * won't refresh; cached content (knowledge base, last-loaded pages) still works.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-16 z-50 mx-auto w-full max-w-2xl px-2">
      <div className="rounded-b-xl bg-stone-800 dark:bg-surface-elevated text-white text-center text-[11px] font-medium py-1.5">
        ✈️ Offline mode — showing cached data. Learn content works fully; live prices will resume when you're back online.
      </div>
    </div>
  );
}
