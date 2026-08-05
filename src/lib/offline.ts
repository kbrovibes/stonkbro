"use client";

/**
 * Offline state, shared by the global banner and per-page OfflineGate.
 *
 * Two sources of truth, OR'd together:
 *   - `navigator.onLine` plus the online/offline events (the browser's view)
 *   - a manual flag flipped by `reportNetworkError()` when an app fetch dies
 *     with a network error, so flaky connections that still report onLine=true
 *     register as offline until something succeeds again.
 *
 * Non-React code can flip the manual flag without importing this module by
 * dispatching `window.dispatchEvent(new Event("stonkbro:network-error"))`.
 */

import { useSyncExternalStore } from "react";

const NETWORK_ERROR_EVENT = "stonkbro:network-error";

let fetchFailed = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function handleOnline(): void {
  fetchFailed = false;
  emit();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", emit);
    window.addEventListener(NETWORK_ERROR_EVENT, reportNetworkError);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", emit);
      window.removeEventListener(NETWORK_ERROR_EVENT, reportNetworkError);
    }
  };
}

function getSnapshot(): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  return fetchFailed;
}

function getServerSnapshot(): boolean {
  return false;
}

/** True when the device looks offline. Re-renders on connectivity changes. */
export function useOffline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Call when a fetch rejects with a network error (not an HTTP error status). */
export function reportNetworkError(): void {
  if (fetchFailed) return;
  fetchFailed = true;
  emit();
}

/** Call after any successful fetch — clears a stale manual offline flag. */
export function reportNetworkOk(): void {
  if (!fetchFailed) return;
  fetchFailed = false;
  emit();
}

/** Best-effort connectivity re-check, used by the retry button. */
export function recheckConnection(): boolean {
  const online = typeof navigator === "undefined" || navigator.onLine;
  if (online) reportNetworkOk();
  return online;
}
