# 55 — Bloodbath (pullback navigator)

## Goal

Help navigate an ongoing market pullback: show how far watchlist tickers and other
big movers have fallen over the last 2–4 weeks, why, and whether the dip is worth
buying — in a mobile-first view.

## What shipped (v0.24.0)

- **Home page**: IPO widget removed (`UpcomingCatalysts` is now earnings-only;
  `getUpcomingIPOs` no longer called from home). In its place, a 3-up feature
  card grid at the top of the page: 🩸 Bloodbath (`/bloodbath`), 📊 Portfolio
  (`/portfolio`), ⏰ Hindsight (`/time-machine`).
- **`/bloodbath` page**: summary strip (scanned count, names down 10%+, worst hit),
  then two card sections — *Your Watchlist* (every watchlist ticker, worst first)
  and *Big Market Drops* (non-watchlist scan-universe names down ≥10% from their
  4-week peak, max 15). Tap a card to expand AI reasons, an entry idea, peak
  price/date, and a link to the full ticker view.
- **`GET /api/bloodbath`**: watchlist symbols (when authed) ∪ `SCAN_UNIVERSE`
  → quotes → drawdown vs the highest close of the last ~4 weeks (Tradier daily
  history) → JSON `{ watchlist, market, scannedCount }`.
- **`POST /api/bloodbath/verdict`** (auth required): takes up to 12 tickers,
  pulls 3 recent Yahoo headlines each, then makes ONE batched `generateText`
  call returning JSON verdicts: `BUY_DIP | NIBBLE | WAIT | AVOID` + confidence,
  ≤3 short reasons, and a concrete entry idea (limit level or CSP strike style).
- **MoreNav**: 🩸 Bloodbath added to the Discover group.

## Decisions (made autonomously — revisit if wrong)

1. **Drawdown definition**: % off the highest *close* of the last ~20 trading
   bars (≈4 weeks), using the live quote as "now". Covers the requested 2–4 week
   pullback window with one number.
2. **History-fetch budget**: watchlist tickers always get history; market names
   are pre-filtered by cheap quote signals (below 50-day SMA or −3% day) and
   capped so total history fetches ≤ 60 per scan.
3. **Market cutoff**: non-watchlist names only shown at ≥10% drawdown; watchlist
   names always shown regardless of drawdown (it's *your* list).
4. **One batched AI call** for verdicts (like Portfolio Manager) instead of
   per-ticker calls — cheaper, one loading state. Cap 12 tickers, watchlist
   prioritized, 8k max tokens, truncation-repair on parse.
5. **Verdict scale**: BUY_DIP / NIBBLE / WAIT / AVOID — NIBBLE deliberately maps
   to the app's options DNA (partial entry or conservative CSP).
6. **Scan endpoint is public-tolerant** (works logged-out with universe only),
   verdict endpoint requires auth because it spends AI tokens.
7. **IPO widget removed only from home** — `src/lib/market/ipos.ts` and the IPO
   cron remain untouched for now (dead-ish code; delete in a later cleanup if
   nothing else adopts it).
8. **No DB persistence** for scans/verdicts in v1 — always fresh. Caching /
   history is an obvious iteration if AI cost or latency annoys.

## v0.24.1 — cron + caching (shipped)

- `bloodbath_scans` table caches full scan + verdicts; `/api/cron/bloodbath`
  runs 3× weekdays (13:45/17:00/20:10 UTC) and includes the batched AI call.
- `GET /api/bloodbath` serves the latest completed row ≤72h old (weekend
  coverage) with verdicts embedded; `?refresh=1` forces a live scan (page gets
  a Refresh button + "as of X ago" label).
- Cron uses the union of ALL users' watchlist symbols (no session in cron;
  effectively a single-user app) — the page's "Your Watchlist" section shows
  that union when served from cache.

## Iteration candidates
- SPY/QQQ benchmark row ("is this pullback broad or idiosyncratic?")
- Sector grouping of the drops
- Push alert when a watchlist name crosses −15% drawdown
