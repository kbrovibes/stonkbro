# Overnight Overhaul — 2026-08-04

Autonomous execution log. User asked for: Options/Plays conviction overhaul, hourly
background updates, pre-market + crash push alerts with actionable steps, knowledge
base rewrite, full offline support, performance overhaul. Decisions recorded here,
questions deferred.

## Decisions (made autonomously — flag anything you'd reverse)

1. **Alerts are template-driven, not AI-per-alert.** The hourly monitor computes
   moves/levels from Tradier quotes + the cached portfolio chains and renders rich
   sentences from templates. AI calls stay where they already exist (bloodbath
   verdicts, morning briefing). Rationale: hourly AI on every symbol would be slow,
   expensive, and rate-limited; deterministic math is what stop-levels need anyway.
2. **Portfolio symbols come from the chains cache + live positions call** — not a
   fresh SnapTrade activities walk (rate-limited, minutes-long). Positions/balances
   are shallow calls and safe hourly.
3. **"Banners" = OS push notifications** (iOS/Android show these as banners) plus an
   in-app critical-alert banner when the app is open. No SMS/email escalation built
   (can add Resend email for criticals later).
4. **Alert importance levels**: `critical` (portfolio position −5%+ intraday, market
   circuit-breaker-style drop, bloodbath escalating) → push always; `warning`
   (position −3%, watchlist big mover, pre-market gap >4%) → push during market
   hours; `info` (everything else) → in-app feed only. Dedupe by (symbol, kind, day).
5. **Stop-loss suggestions are advisory text** with concrete levels (stop + limit
   computed from recent swing low / support / ATR). stonkbro cannot place orders —
   SnapTrade connection is read-only. The alert deep-links to the position.
6. **Knowledge base**: content stays in-repo as TS data (no CMS). Rewritten for
   plain-English depth with multiple worked real-world examples per concept.
7. **Offline**: hand-rolled service worker (no next-pwa dependency) — precache app
   shell + learn routes on activate, cache-first for immutable /_next/static,
   network-first with cache fallback for pages, offline banner via navigator.onLine.
8. **Suggestion copy is generated server-side at scan time** (cron), so the page
   stays a cached read. Conviction = existing score mapped to labeled tiers with a
   "why" and "what invalidates it" sentence.
9. **Token/parallelism discipline**: phases run sequentially; at most one heavy
   agent fleet at a time; performance team runs last on the committed tree.

## Blockers / constraints to discuss (none block tonight's scope)

- **Vercel cron granularity/count**: hourly crons are fine on the current (Pro)
  plan; we're growing the cron list — consolidate if we approach 40.
- **No news API integrated.** "News leading to major shifts" is approximated with
  price/volume + gap detection + the existing AI research/morning-briefing. A real
  pre-market news feed needs a provider decision (Polygon/Benzinga/Finnhub — cost).
  This was already backlog #33, still open.
- **iOS push requires**: app added to Home Screen (iOS 16.4+) AND notification
  permission granted in Settings → enable push. If you haven't done both on your
  phone, no banners will appear — check Settings page toggle first.
- **Push goes to all subscriptions** (single-user app today; fine).
- **SnapTrade is read-only** — no order placement (stop-losses must be set in
  Fidelity manually; alerts give exact levels to enter).
- **Tradier rate limits**: hourly scan of portfolio+watchlist symbols is well
  within limits; if watchlists grow past ~200 symbols, batch quotes are already
  used but the cron window may need widening.

## Execution log

- [x] Recon: push infra exists (VAPID live in prod), SW exists (push-only),
      learn curriculum = 3,375-line TS file, reasons come from csp-scanner.ts,
      Plays page = /today ← /api/recommendations, Options ← /api/csp-hunter.
- [x] Alert engine shipped: `alerts` table (migration applied), hourly
      `/api/cron/market-monitor` (11:00–23:00 UTC weekdays), severity tiers,
      stop-limit suggestions from support levels, push with storm cap +
      summary fallback, sticky in-app AlertBanner, `/api/alerts` GET/ack.
- [x] Options/Plays conviction overhaul: STRONG/MODERATE/SPECULATIVE tiers,
      2-sentence plain-English theses with jargon explained inline, explicit
      "what breaks this trade" risk lines; AI prompts got a mandatory
      rationale-quality contract; Today + CSP Hunter render chips/risk.
- [x] Offline mode: SW v2 (static cache-first, pages network-first w/
      fallback, KB warm on every app open via /api/learn/manifest + chunk
      parsing), OfflineBanner in shell. KB decision: existing curriculum is
      good theory — added-value = new fluency/leverage/crash modules rather
      than rewriting 3,375 lines (two content agents writing them now).
- [x] KB modules integrated: 4 modules / ~19 lessons (trader-talk,
      trader-toolkit, leverage-lab, crash-playbook), colors fixed to
      COLOR_MAP keys, wired into CURRICULUM, build green.
- [x] Version badge under logo (package.json → 0.25.0).
- [x] Perf overhaul (principal-engineer agent team): −26% avg First Load JS
      across all 40 app routes (Supabase SDK out of the shell via sign-out
      server action; lesson page → RSC, −130 KB gzip; auth deduped 3→1
      round-trips/nav; home/income fetches parallelized). Details in
      journal/2026-08-04-perf.md and releases/v0.25.0.md.

## Not built tonight (needs your input)

- **Real news feed** for pre-market alerts (provider + cost decision —
  backlog #33). Current pre-market coverage = price/gap detection + the
  existing AI morning briefing.
- **Email escalation for critical alerts** (Resend is wired for briefings;
  one decision away).
- **Per-position stop tracking UI** (alerts give levels; a page that tracks
  which stops you actually set would close the loop).
