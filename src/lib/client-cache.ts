/**
 * Tiny client-side fetch cache backed by sessionStorage.
 *
 * Goal: make tab navigation in stonkbro feel instant. The first load of a
 * page populates the cache; subsequent visits within the session render
 * immediately from cache while a fresh fetch runs in the background and
 * silently updates state when it returns.
 *
 * Usage:
 *   const data = await cachedFetchJson<T>("/api/foo", { ttlMs: 5 * 60_000 });
 *
 * Or with a swr-style helper for components:
 *   useCachedJson<T>("/api/foo", setData, { ttlMs: 5 * 60_000 });
 */

import { useEffect, useRef } from "react";

const NS = "ckch:";  // sessionStorage namespace

type Entry<T> = { ts: number; data: T };

function readCache<T>(key: string, ttlMs: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(NS + key);
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T>;
    if (Date.now() - e.ts > ttlMs) return null;
    return e.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(NS + key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Quota — silently drop
  }
}

export async function cachedFetchJson<T>(
  url: string,
  opts: { ttlMs?: number; init?: RequestInit } = {}
): Promise<T> {
  const ttlMs = opts.ttlMs ?? 5 * 60_000;
  const cached = readCache<T>(url, ttlMs);
  if (cached != null) return cached;
  const res = await fetch(url, opts.init);
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  const data = (await res.json()) as T;
  writeCache(url, data);
  return data;
}

/**
 * React hook: render from cache instantly, then revalidate in background.
 * Calls `apply(data, fromCache)` with fresh data or cached. When cache hit
 * is followed by network success, apply is called twice.
 */
export function useCachedJson<T>(
  url: string,
  apply: (data: T, fromCache: boolean) => void,
  opts: { ttlMs?: number; enabled?: boolean } = {}
): void {
  const enabled = opts.enabled ?? true;
  const ttlMs = opts.ttlMs ?? 5 * 60_000;
  const lastUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (lastUrl.current === url) return;
    lastUrl.current = url;

    let cancelled = false;
    const cached = readCache<T>(url, ttlMs);
    if (cached != null && !cancelled) apply(cached, true);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as T;
        if (cancelled) return;
        writeCache(url, data);
        apply(data, false);
      } catch {
        // ignore, cache (if any) already applied
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, enabled, ttlMs, apply]);
}

/** Manually invalidate a single cached URL (e.g. after a mutation). */
export function invalidateCache(url: string): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.removeItem(NS + url); } catch { /* ignore */ }
}
