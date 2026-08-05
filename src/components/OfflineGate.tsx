"use client";

import { useState } from "react";
import { recheckConnection, useOffline } from "@/lib/offline";

/**
 * Wraps a page (or a section, with `inline`) that fundamentally needs the
 * network. Offline, it renders a friendly card with a retry button instead of
 * letting the page hang on a spinner or surface a raw fetch error.
 */
export default function OfflineGate({
  children,
  label = "This page",
  inline = false,
}: {
  children: React.ReactNode;
  label?: string;
  inline?: boolean;
}) {
  const offline = useOffline();

  if (!offline) return <>{children}</>;

  return <OfflineNotice label={label} inline={inline} />;
}

/** The card on its own, for pages that gate part of their own render. */
export function OfflineNotice({ label, inline = false }: { label: string; inline?: boolean }) {
  const [stillOffline, setStillOffline] = useState(false);

  const retry = () => {
    if (recheckConnection()) window.location.reload();
    else setStillOffline(true);
  };

  const body = (
    <>
      <p className="text-sm font-semibold text-stone-900 dark:text-text">
        {label} needs a connection
      </p>
      <p className="text-xs text-stone-500 dark:text-text-subtle max-w-xs">
        Live market data can&apos;t be fetched offline. Learn content and your last portfolio
        snapshot still work.
      </p>
      <button
        onClick={retry}
        className="mt-1 rounded-lg bg-stone-900 dark:bg-surface-muted text-white dark:text-text text-xs font-semibold px-4 py-2 active:opacity-70"
      >
        Retry
      </button>
      {stillOffline && (
        <p className="text-[11px] text-amber-600 dark:text-amber-300">Still no connection.</p>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-border-default bg-white dark:bg-surface-elevated p-4 flex flex-col items-center gap-2 text-center">
        {body}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center gap-2.5 px-6 py-20 text-center">
      <div className="text-3xl">📡</div>
      {body}
    </div>
  );
}
