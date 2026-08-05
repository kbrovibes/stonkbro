# 57 — Offline Mode: Banner, Fail-Fast, Offline-First Learn & Portfolio

## Goal

Make stonkbro behave predictably without connectivity: a clear global banner, instant fail-fast
on pages that need the network, and genuine offline support for Learn (all of it, incl. v2 case
studies) and Portfolio (last-known snapshot).

## Requirements

### 1. Global offline banner

- Client component mounted in the app shell (`src/app/(app)/layout.tsx` region) that detects
  offline state via `navigator.onLine` + `online`/`offline` events, and also flips to offline
  when app fetches fail with network errors (so flaky connections register).
- Slim, non-blocking banner (e.g. top of viewport, amber): "You're offline — showing cached
  data where available." Auto-dismisses on reconnect.

### 2. Fail-fast on connectivity-dependent pages

- Pages that fundamentally need network (scanner, csp-hunter, research, portfolio-manager,
  bloodbath, time-machine, options chains, ticker quotes, signals, earnings, etc.): when
  offline, render an immediate, friendly "This page needs a connection" state with a retry
  button — never a spinner that hangs or a raw fetch error.
- Implement once (shared `OfflineGate`/hook), apply per page. Keep it thin.

### 3. Offline-first pages

- **Learn** (v1 + v2): fully functional offline. Extend the existing pre-cache approach
  (`public/sw.js`, commit 4b73fd3) to cover all case-study routes and the v2 dataset. Lesson
  progress made while offline should not crash — queue or degrade gracefully.
- **Portfolio**: cache the last successful portfolio payload client-side (localStorage or
  IndexedDB via a small helper in `src/lib/client-cache.ts` if suitable). When offline, render
  it read-only with a clear "as of <timestamp>" note. No personal data committed to the repo —
  this is browser-local only.

### 4. Service worker

- Extend `public/sw.js` precache/runtime-cache lists; bump cache version; ensure stale caches
  are cleaned up on activate. Don't break existing PWA install/update flow.

## Non-goals

No background sync of trades, no offline mutations for anything beyond Learn progress, no new
env vars.
