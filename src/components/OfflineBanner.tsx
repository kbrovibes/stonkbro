"use client";

import { useOffline } from "@/lib/offline";

/**
 * Slim indicator when the device has no network. Pages that need live data
 * show their own offline state; cached content (knowledge base, last-loaded
 * pages, portfolio snapshot) still works.
 */
export default function OfflineBanner() {
  const offline = useOffline();

  if (!offline) return null;

  return (
    <div className="sticky top-16 z-50 mx-auto w-full max-w-2xl px-2">
      <div className="rounded-b-xl bg-amber-500 border-x border-b border-amber-600 text-white text-center text-[11px] font-medium py-1.5 px-3">
        You&apos;re offline — showing cached data where available.
      </div>
    </div>
  );
}
