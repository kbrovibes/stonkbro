# Changelog

## v0.32.2 — Learn progress tracking actually works

- **Root cause**: one shared debounce timer + payload slot for every save type — a scroll event or "Next Lesson" tap scheduled after reaching a lesson's bottom silently replaced the pending `completed: true` save (and unmount killed the timer). Completions only stuck if you idled 3s at the bottom, which is why finished modules showed random single lessons complete
- **Fix**: completions and quiz results now POST immediately with `keepalive` (survive navigation), with a localStorage retry queue for offline/failed saves flushed on reconnect; scroll/time-spent saves merge into their own debounced channel and flush on lesson exit — they can never displace a completion
- **Quiz scores were never saved at all** (`onQuizComplete` was unwired) — now saved immediately, and finishing a quiz completes the lesson; time-spent is now actually tracked
- "Next Lesson" / "Complete Module" taps also mark the lesson complete (belt-and-suspenders); server now refuses to downgrade a completed lesson
- Backfilled the SNDK case study to fully completed (all lessons were read; the bug ate the saves)

## v0.32.1 — Explosive finder fixes: deep links + per-sector reports view

- **Actions rows deep-link to the right sector**: clicking a "space-defense" explosive job now opens `/explosive?sector=space-defense` (the job's selection rides its meta), not the page's default view
- **Per-sector reports are now visible**: on "All Sectors", a **Sector Reports** list shows every sector's scan (pick chips, age, tap → full report), so Research All yields a report per sector *plus* the combined summary — previously the per-sector results were hidden behind the dropdown. All sector caches load on page open; the combined "all" result is labeled "combined cross-sector summary"
- Research All now runs the 8 sectors first and the combined summary last

## v0.32.0 — Explosive finder: per-sector state, Research All, 24h cache

- **Dropdown never blocks**: each sector keeps its own scan state — switching the dropdown while one sector is scanning shows the new sector's cached result or its own Start button; the in-flight scan lands when done
- **Research All Sectors**: sequential runner over all 9 options with "Researching 3/9…" progress and per-sector ticks; fresh-cached sectors pass through instantly, only stale ones hit the AI; navigating away keeps everything already completed (results land server-side)
- **24h server-side cache** (`explosive_scans` table, applied to prod): page load / dropdown switch renders the cached report instantly with its age ("Scanned 5h ago"); **Re-scan** forces a fresh run. Cache-served responses create no Actions rows; live scans stay job-tracked
- New cache-only `GET /api/explosive?sector=slug`; POST gains `cached`/`scannedAt` (additive)

## v0.31.1 — Actions page polish + nav reorder

- **"Jobs" is now "Actions"** (`/actions`; `/jobs` redirects): header indicator and profile menu updated
- **Status cards** at the top (Running / Completed / Failed counts) that double as filters
- **Aligned trigger badges**: CRON/MANUAL/AUTO chips sit in a fixed-width column so rows line up
- **Tap-through**: tapping an action opens its output page (chain scan → Portfolio, backfill → Hindsight, research → Research, scans → their pages, tax sync → Tax Center); rows show a › affordance
- **Bottom nav reorder**: Home · Options (renamed from Plays) · Portfolio (center) · Learn · More

## v0.31.0 — Tax Center: stock sales + explicit short/long-term per quarter

- **Stock sells now count**: a FIFO lot engine walks full broker activity history (2010→now, both brokers, lots kept separate per broker) and matches every 2026 equity sale to its purchase lots — gain and short/long-term split per matched lot, sweep-fund churn (SPAXX/QACDS) excluded, securities-lending rows ignored
- **Short-term vs long-term is now always visible per quarter**, split by source: `options $A · stocks $B` under each of the ST and LT rows in every period card, plus the always-on year ST/LT card
- **"Needs basis" handling**: shares that arrived via transfer/RSU have no cost basis in the connector feed — those sales are listed per quarter (excluded from the math, clearly flagged) and in a new Stock Sales panel where you enter total cost basis + acquisition date once; the quarterly recommendations then re-adjust, with holding period deciding ST vs LT
- **Sync**: "Sync" button pulls sell history (tracked as a cancellable job in the Jobs Center); results cached in `tax_equity_scans`; basis overrides in `tax_basis_overrides` (RLS per user)
- New APIs: `GET/POST /api/taxes/equities` (scan status / sync now), `POST/DELETE /api/taxes/basis` (basis overrides); `/api/taxes` GET now merges equity events into periods and year summary

## v0.30.0 — Jobs Center: every async operation tracked, queryable, cancellable

- **Header indicator** next to the profile badge: activity icon with a live count of running jobs (exact global count, 20s poll + focus refresh, hidden for guests), linking to the new **/jobs** page (also in the profile menu)
- **/jobs page**: historic + ongoing jobs grouped by day — status dots (running pulses with live elapsed timer and progress text), trigger badges (CRON amber / MANUAL sky / AUTO violet), relative start times, durations, expandable errors, filter pills (All/Running/Completed/Failed), and a **Cancel** button on cancellable running jobs
- **Every real async operation now registers in `app_jobs`** via a `runTracked()` wrapper: chain scans (manual + cron), Hindsight backfill, AI research, explosive finder, bloodbath (manual + cron), CSP hunter, PMCC scan, portfolio manager (manual + cron ride-along), market monitor, daily briefing, recommendations refresh. Cache-served responses never create job rows; tracking is best-effort and never changes an API's behavior
- **Cooperative cancellation**: serverless functions can't be killed mid-flight, so cancel flags the row and the job stops at its next checkpoint — the chain scan checks between accounts/activity windows; the Hindsight backfill checks between months and returns a partial-success result for completed months
- **Stale sweep**: any job "running" >15 min with no completion (function timeout/crash/redeploy) is auto-marked failed, so the header count can't stick
- New API `GET/POST /api/jobs` (list + exact running count + cancel), auth-gated

## v0.29.0 — Tax Center, potential year total, per-brokerage chains

- **Tax Center (`/taxes`, in the profile menu)**: personal-CPA view of quarterly estimated taxes on trading gains, assuming ~$700K W-2 income already covered by employer withholding. Per IRS estimated-tax period (Q1–Q4 with real due dates, not calendar quarters): realized gains/losses/net from closed chains, STCG/LTCG split (short options are always short-term per §1234(b); long chains go LTCG only past 365 days), tax at 40.8% STCG / 23.8% LTCG (+WA 7% only on LTCG above the ~$280K exemption), and a **recommended one-off payment** computed cumulatively so later losses and earlier overpayments shrink later recommendations — the current period shows "Pay $X by <due date>"
- **Record payments you've made** (date, amount, note; new `tax_payments` table with RLS) and the remaining quarters re-adjust; past periods show under/overpaid deltas, overpayments carry forward as credit
- Year summary (net realized, est. tax, paid, remaining), top-5 contributors by underlying, collapsible assumptions panel (rates, WA rules, safe-harbor explainer, "estimates only — not tax advice"), privacy-lock masking on all dollar values
- New API `GET/POST/DELETE /api/taxes` (portfolio-access gated; reads the cron-cached chain scan, live fallback)
- Known limits: assignment stock-side P&L, wash sales, and the $3K ordinary-loss offset are not modeled

- **Potential Year Total** row in the Portfolio summary card, directly under "Year so far": realized YTD plus every open short (CSP/CC) assumed to expire worthless in your favor. Long chains are excluded (no expire-worthless upside), as are shorts expiring next calendar year (they realize outside this year). Shows the unsettled premium component and respects the privacy lock
- **Brokerage on every chain**: option chains now carry the institution they live at (Fidelity, Chase, …). Chain building and roll pairing are keyed per-brokerage, so identical contracts at two brokers can never braid into one roll chain
- **Open tab: brokerage badge + filter**: each open contract shows a violet brokerage badge — tap it (or the Broker pill row) to filter the Open tab to that brokerage; tap again to clear. Badges appear on cached scans only after the next chain refresh (older cached scans predate the field)

## v0.28.0 — Multi-brokerage: connect Chase (or any broker) from Settings

- **Settings → Brokerages**: lists every SnapTrade connection with its accounts and live/disabled status; "Connect a Brokerage…" opens the SnapTrade Connection Portal (link generated server-side, expires in 5 min) to link Chase or any other supported broker to the same SnapTrade user — no more ad-hoc scripts. Disabled connections get a one-tap "Fix" reconnect
- **New API route `/api/portfolio/connections`**: GET lists connections + accounts, POST generates a portal link (optional `broker` slug / `reconnect` id); gated by the same portfolio-access check as `/api/portfolio`
- **"Rebuild 2026 Data" action**: after linking a new broker, one tap force-refreshes the option-chain scan (from the 2025-01-01 cache epoch, so the cron cache the portfolio page reads is actually overwritten) and re-runs the idempotent Time Machine monthly-snapshot backfill — income, chains, and Hindsight math then include the new accounts' history
- All portfolio/options/transactions functions already iterate every account under the SnapTrade user, so newly connected brokerages flow into existing pages with zero further changes
- Settings list primitives (Group/Row/ActionRow/Toggle) extracted to `settings/ui.tsx` for reuse

## v0.27.0 — Privacy lock: hand your phone to a friend

- **Lock private info** from the profile-menu dropdown; unlock via in-app PIN modal. PIN (4-8 digits) set per-user in Settings → Privacy Lock, persisted in `user_settings`, verified server-side; the lock rides an httpOnly cookie so even server-rendered HTML is masked, and the settings API refuses PIN changes while locked
- **When locked, every wealth-revealing value renders as `•••••`** across Portfolio (P&L, collateral, per-leg amounts, strikes and contract counts of real positions, chart axes/tooltips), Hindsight/Time Machine (account balances incl. account last-4, holdings tables, deposits/withdrawals/RSUs, tax estimates), Income (starting capital, premium totals), Dashboard, Positions, Wheel (incomes + cycle strike history), Covered Calls (real share counts + cost basis), and the in-app alert banner ("you hold this"-style alerts hide behind the lock)
- **Deliberately visible while locked**: percentages/ratios, market quotes, hypothetical $100K scanner math, the ticker roster itself, and forms mid-entry — the app stays fully browsable
- Hindsight detail's existing show/hide-dollars toggle now forces hidden while locked

## v0.26.2 — Push notifications actually work + privacy-lock groundwork

- **Deploys unblocked**: the hourly market-monitor cron (`0 11-23 * * 1-5`) exceeded the Vercel Hobby once-daily limit and had **failed every production deploy since Aug 4** — now `0 17 * * 1-5` (10am PT daily; restore hourly by upgrading to Vercel Pro and reverting this line)
- **Service worker unblocked**: `/sw.js` + `/manifest.json` were caught by the auth middleware matcher and returned a CDN-cacheable 307 → fatal SW registration error since the first auth commit (April) — the root cause of pushes never arriving; both (and `/icons/`) now bypass auth; registration failures are logged instead of swallowed
- **Notification icon 404 fixed** (`/icon-192.png` → `/icons/icon-192.png`)
- **Real push test**: new authed `POST /api/push/test` sends only to your own devices and reports sent/failed; Settings button added; the "Enabled" badge is now driven by an actual `PushSubscription`, not just `Notification.permission`, with a re-subscribe path and surfaced errors; push send failures now log status + body
- **Privacy-lock groundwork (spec: PII lock)**: `privacy_pin` column + Settings "Privacy Lock" PIN section; "Lock/Unlock private info" in the profile menu with in-app PIN modal; server-verified unlock via httpOnly `pii_lock` cookie; settings API never returns the PIN and refuses PIN changes while locked. Value masking across pages lands next release.

## v0.26.1 — Nav consolidation: Plays absorbs Options, Learn goes top-level

- **`/plays` merges `/today` + `/csp-hunter`** into one page with sub-tabs Market (movers + options flow) · CSPs · Calls · LEAPS · Weekly; both sections stay mounted across tab switches so a running scan survives; old routes redirect
- **Bottom nav**: Home · Plays · Learn · Portfolio · More — Learn is top-level (graduation-cap icon); the Hindsight tab is dropped (the Portfolio page header already links it); guest nav becomes Plays · Research
- **More menu de-duplicated**: Learn and CSP Hunter entries removed (both now bottom-nav reachable); landing/login entry links point at `/plays`

## v0.26.0 — Learn v2: real-data case studies + offline mode hardening

- **Case Studies track (Learn v2, spec 56)**: 15 ticker modules / 80 case studies built entirely from the committed real chain-snapshot dataset (`src/lib/learn/v2-data/`, May–Aug 2026 scanner history) — 10 traded-universe tickers (PLTR, SOFI, NBIS, MRVL, TSLA, TSM, ASTS, SNDK, META, RKLB) + 5 "opportunities you weren't watching" (NVDA, AMD, CRWD, HOOD, IWM). Every number is traceable to a snapshot row or price bar; typed lookups (`src/lib/learn/v2.ts`) throw at build time on any fabricated figure
- **Four new interactive components**: CasePriceChart (real OHLC + strike/stop lines + event markers), PlaceTheStop (set your stop on the real chart, then see what happened), ContractPicker (A/B pick between two real scanned contracts), PremiumDecayScrubber (scrub a contract's observed premium/IV path across scan days). 41 interactive sections + 62 quizzes across the track
- **Case-study archetypes**: stop-loss discipline on real drawdowns (ASTS -60%, MRVL -48%, SNDK -56%), stop-market vs stop-limit through real wide spreads, poor contract selection, verified winners, roll-vs-assignment (incl. TSLA's no-recovery counterexample), covered-call strike regret, observed theta/IV drift (IWM/AMD multi-day series)
- **Learn landing**: new Case Studies ticker grid with traded/opportunity badges and per-module progress; existing `learn_progress` tracks completion
- **Offline mode hardening (spec 57)**: shared `useOffline` hook + `OfflineGate` fail-fast ("needs a connection" + retry, no hung spinners) on 10 network pages (scanner, CSP Hunter, research, portfolio-manager, bloodbath, time-machine, options, signals, earnings, explosive); global banner also trips on failed fetches (flaky connections register); Portfolio renders a browser-local last-known snapshot with "as of" timestamp when offline; SW bumped to v4 — case-study routes pre-cache automatically via the learn manifest
- **Groundwork** (previously unreleased): real historical option-chain snapshot dataset (`src/lib/learn/v2-data/`, 15 tickers, 2026-05-01 → 2026-08-05, from CSP Hunter scan history + Tradier daily bars) + `scripts/mine-v2-data.mjs` setup miner + specs 56/57

## v0.25.1 — Learn overhaul: real interactivity + practice-first TA coursework

- **Four real interactive components** (seeded, offline-capable SVG): LevelFinder (scored support/resistance placement drills), IndicatorPlayground (toggleable SMA/EMA/RSI/MACD/Bollinger with sliders + auto-annotated signals), StrikeExplorer (live Black-Scholes strike/DTE/IV sandbox with payoff diagram), ChartQuiz (spot-the-setup on rendered charts). Fake interactive aliases retired
- **TA track rewritten 31 → 37 lessons** on a fixed arc: mechanic → exact plotting steps → 3+ worked examples incl. a labeled failure → interactive reps → how to trade it → honest failure modes → quiz; support/resistance deepest (graded drawing practice); 41 interactive sections
- **Greeks + practical tracks enriched**: guided StrikeExplorer task in every Greeks module + 11 worked examples; chart-quiz practice matched to each fluency phrase; leverage lessons reproduce their math in the sandbox
- **Offline lessons fixed**: manifest lists all ~115 lesson paths (content is RSC-side since the perf pass); SW v3 with 6h warm throttle
- **Refactor**: curriculum.ts → thin assembler; content in per-track files; all prior lesson ids stable (progress preserved)

## v0.25.0 — Overnight overhaul: push alerts, conviction copy, practical Learn tracks, offline mode, performance

- **Hourly market monitor + push alerts**: `/api/cron/market-monitor` (11:00–23:00 UTC weekdays) watches SPY + every portfolio holding (live SnapTrade positions, chains-cache fallback) + watchlist symbols; plain-English alerts with severity tiers dedupe per day, persist to a new `alerts` table (migration applied), push via Web Push (storm-capped with summary fallback), and surface in a sticky in-app banner. Critical position drops include concrete stop-limit levels computed from nearest support
- **Conviction + plain-English theses on Options/Plays**: every CSP/call candidate carries STRONG/MODERATE/SPECULATIVE conviction, a 1–2 sentence thesis explaining its jargon inline, and a "what breaks this trade" risk line; AI recommendation prompts get a mandatory rationale-quality contract; Today + CSP Hunter render chips and risk lines
- **Four practical Learn modules** (~19 lessons): Trader Talk Decoded (decode "do a squeeze", "support at 520", IV crush… with 60-second verify-it-yourself recipes), Your Toolkit (which metric/chart answers which question, reading a chain), Options Leverage in the Real World (the MSFT +2% → call +40% math, LEAPS, how leveraged longs lose), Crashes & Bloodbaths Playbook (stop mechanics, rolling, getting paid for fear)
- **Offline mode (airplane-mode PWA)**: service worker caches visited pages + pre-caches the full knowledge base on every app open (manifest + chunk parsing); offline banner in the shell; live pages resume when back online
- **App version shown under the logo** (reads package.json, bumped to 0.25.0)
- Decisions + technical blockers for review recorded in `journal/2026-08-04-overnight-overhaul.md`

## v0.25.0 — Performance overhaul

- **Sign-out moved to a server action** (`src/lib/auth-actions.ts`): `ProfileMenu` (rendered in the app shell on every authenticated page) no longer imports the `@supabase/ssr` browser client just to call `signOut()`. That pulled the full ~222 KB (uncompressed) / ~59 KB (gzip) Supabase client SDK into the shared bundle of all 40 app routes. First Load JS now drops by that amount on every page — e.g. `/today` 781 KB → 558 KB raw, `/portfolio` 802 KB → 580 KB. `LogoutButton` converted the same way. Behavior unchanged: cookie session is cleared server-side (middleware already manages the same cookies) and the user is redirected to `/`.
- **Parallelized independent server fetches on Home and Income**: the Home page fetched watchlist quotes and then the earnings calendar sequentially, though both depend only on the symbol list and not on each other — they now run in one `Promise.all` (earnings no longer waits behind the quotes round-trip). Income fetched positions then settings sequentially despite both keying only off `user.id` — also parallelized. Same data, same fallbacks.
- **Deduplicated the per-navigation auth round-trips** (`src/lib/auth.ts`): `supabase.auth.getUser()` validates the session JWT against the Supabase Auth server (a network round-trip, not a local decode). Every authenticated page ran it at least three times per navigation — once in the `(app)` layout, once in `Header`, and once in the page itself — sequentially across the server-render tree. A new `getUser()` wrapped in React `cache()` memoizes the result for the duration of one request, so the layout, header, and 14 page components now share a single round-trip. Cuts server-side latency (TTFB) on every authenticated page load. No behavior change — same user object, same redirects.
- **Learn lesson page no longer ships the whole curriculum to the browser**: `/learn/[moduleId]/[lessonId]` was a client component that imported the entire ~3,300-line `CURRICULUM` array just to look up one lesson by id. It's now a server component that finds the lesson server-side and passes only that lesson's data to a thin client island (`LessonClient`) for the scroll/progress/completion interactivity. First Load JS 774 KB → 555 KB raw (−219 KB), 231 KB → 159 KB gzip. Rendered output and progress-saving behavior unchanged.

## v0.24.6 — Portfolio chains cache (bloodbath-style)

- **Page loads are one DB read** instead of a live SnapTrade activities walk (worst case minutes under v0.24.4's rate-limit pacing): new `portfolio_chain_scans` table caches the computed `OptionChain[]`; RLS service-role only (personal brokerage data)
- **`/api/cron/portfolio-chains`** refreshes the cache 2× weekdays (13:15, 20:15 UTC ≈ pre-open/post-close ET)
- **`GET /api/portfolio?include=option-chains`** serves the cached scan (≤72h) for the standard 2025-01-01 window; `?refresh=1` forces live; live results are stored back
- **Page**: "as of Xm ago" label + Refresh button — refresh keeps existing data on screen while the slow live fetch runs

## v0.24.5 — Fix Portfolio page timeout after v0.24.4 rate-limit pacing

- **`GET /api/portfolio` `maxDuration` 30 → 300**: the option-chains pull (page fetches from 2025-01-01) recurses into several split levels, and v0.24.4's 2.6s pacing + 65s 429-wait makes it legitimately exceed 30s — Vercel was killing the function, which the Portfolio page saw as a timeout
- **`GET /api/portfolio/time-machine` `maxDuration` 60 → 300**: a single 429 wait alone is 65s, so 60s guaranteed a timeout whenever SnapTrade throttled
- **`getOptionChains` walks accounts sequentially** (missed by v0.24.4): parallel per-account recursion trees combined could still burst the per-minute cap, triggering the 65s wait

## v0.24.4 — Fix SnapTrade 429s in deep activity fetches

- **`fetchActivitiesWindow` recursion serialized**: the window-splitter fired both halves of every split in parallel, so a deep 2010→today walk compounded into a request burst that blew SnapTrade's per-minute rate limit (SDK gives up after 3 retries ≈ 15s) — Time Machine backfill 500'd with "Request failed after 3 retries due to 429". Halves now fetch sequentially
- **`getAllActivities` walks accounts sequentially** for the same reason (shallow per-account fan-outs elsewhere are unchanged)
- **Split-level calls paced at 2.6s** and a one-time 65s wait-out-the-window retry when the SDK still exhausts its retries — the activities endpoint has a much tighter per-minute limit than the rest of the SnapTrade API (plain serialization still 429'd)

## v0.24.3 — Portfolio option-chain rebuild: correct rolls, lineage chains, chain trimming

- **Roll pairing rewritten** (`getOptionChains` step 2): each BUY-to-close is now paired with its most plausible roll target — a SELL (new contract or add-on) within 3 days, scored by day gap → contract-count match → strike proximity, each SELL consumed at most once. Lineages form disjoint trees with exactly one live contract each, instead of the old "any contract started within 3 days of any close" linear merge that braided simultaneous positions into 20+ leg mega-chains and orphaned same-day rolls (the MU 800 Sep put showed "close ≤ $103.40 → profit" while its $20,991 buy-back sat in another chain; true breakeven is ≤ $75.72)
- **Expiration/assignment now ends a chain** — re-selling after an expiry starts a fresh chain instead of continuing the settled one
- **Chain trimming**: chains spanning >6 weeks get their oldest contracts split off as settled chains that count toward the month they closed in — no more months-long chains hiding realized P&L from monthly totals
- **Breakeven line is direction-aware**: long chains now show "Close ≥ $X → chain profit" (was showing shorts-only "in the hole" math); "if closed now" math signs the close by position direction; collateral shown/summed only for short puts; monthly best-case excludes long chains
- Verified against live SnapTrade data: total P&L and leg counts identical before/after (nothing lost, only repartitioned)

- **Falling-knife detection** per ticker: consecutive-red-day streak and worst-day-of-window flags computed from the daily bars; tickers still falling get a 🔪 badge and the AI is instructed not to say BUY_DIP on a live knife without a compelling company-specific reason (verified: previously-NIBBLE names like SNDK/INTC now come back WAIT while knifing)
- **Market benchmark strip**: SPY + QQQ drawdown off their 4-week peaks with a one-line read (broad selloff vs idiosyncratic damage); fed to the AI so verdicts separate market damage from company damage ("down 51% vs SPY −2% = 49pts idiosyncratic")
- `bloodbath_scans.benchmarks` column added (migration applied); cron stores benchmarks with each scan
- **Compact layout**: full-width stacked cards replaced with a 2-across tile grid (3-across on wider screens) — far less scrolling with a 37-ticker watchlist; tapping a tile opens a bottom-sheet with full stats, AI reasons, entry idea, and ticker link
- **Sticky quick-nav**: jump buttons for Watchlist / Market sections + an ⓘ Verdicts toggle explaining each verdict (Nibble = small partial entry or a conservative CSP) and the 🔪 flag

## v0.24.1 — Bloodbath cron + caching

- **Page loads are now one DB read** (~0.4s vs multi-second live scan): new `bloodbath_scans` table caches the full scan + AI verdicts
- **`/api/cron/bloodbath`** runs 3× on weekdays (13:45, 17:00, 20:10 UTC ≈ post-open, midday, post-close ET): drawdown scan over all users' watchlist symbols + universe, then the batched AI verdict call — so verdicts ship with the scan and the page no longer spends an AI call per load
- **`GET /api/bloodbath`** serves the latest completed cached scan (≤72h, covers weekends) with verdicts embedded; `?refresh=1` forces a live scan
- **Page**: "as of Xm ago" freshness label + Refresh button; verdict generation extracted to `src/lib/analysis/bloodbath-verdict.ts` (shared by cron + on-demand route)

## v0.24.0 — Bloodbath (pullback navigator)

- **`/bloodbath`** — new mobile-first page for navigating the market pullback: watchlist tickers + big scan-universe movers ranked by drawdown off their 4-week peak, with tap-to-expand AI verdicts (Buy the dip / Nibble / Wait / Avoid), reasons for the drop from recent headlines, confidence, and a concrete entry idea
- **`GET /api/bloodbath`** — drawdown scan (watchlist ∪ ~150-symbol universe, Tradier 30-day history, ≤60 history fetches/scan); **`POST /api/bloodbath/verdict`** — one batched AI call for up to 12 tickers with 3 Yahoo headlines each
- **Home page**: IPO widget removed (Upcoming Catalysts is earnings-only now); added a 3-up feature-card grid at the top — 🩸 Bloodbath, 📊 Portfolio, ⏰ Hindsight
- **MoreNav**: Bloodbath added under Discover
- Decisions + iteration candidates recorded in `specs/55-bloodbath.md`

## v0.23.1 — Research/Options/PM fixes

- **Options page**: refresh timestamp now lives next to the title (e.g. `Refreshed 12m ago`, with a stale flag when >4h old) — no more guessing whether the data is fresh
- **Options scanner universe**: added NBIS, SNDK, RKLB, ASTS, LUNR, RDW, SOFI/COIN/HOOD, the nuclear basket (OKLO/SMR/NNE/LEU/CCJ/UEC/VST/CEG), quantum (IONQ/RGTI/QBTS/QUBT), SMCI, TSM, ANET, CRDO, MDB, S, AI, PATH so high-conviction names show up; the CSP-hunter API also merges in your watchlist + active position symbols on every manual scan
- **Research page**: history endpoint now returns the real `status` instead of forcing "completed"; old reports stuck at `running` (RDW/MNTS, LLY, SMR, NVDA) were re-marked as `failed` so they stop pretending to be done; expanded view of an empty completed run shows a Re-run hint instead of blank space
  - **Root cause**: `research_reports` was missing `ai_provider`/`ai_model`/`error_message` columns, so `completeReport()` UPDATE threw and the report stayed `running` forever. Applied the missing schema columns.
- **Plays tab**: removed the chronically-empty "Premium Plays" section
- **Portfolio Manager**: AI was producing JSON that hit the 8k token cap mid-array → "Expected ',' or ']' after array element" failures every scan since June 1. Raised the cap to 16k and added a JSON repair pass that walks back to the last valid array element on parse failure
- **Portfolio Manager cron**: added a market-close run (`5 20 * * 1-5` UTC ≈ 16:05 ET) in addition to the existing market-open run; both pass `trigger=open|close` so DB rows are labeled correctly

## v0.23.0 — Dark Mode (default-on)

- **Robinhood-style dark mode** across the entire app (Header, BottomNav, all pages, charts, badges) with a Light/Dark/Auto toggle in the profile dropdown (top-right initials bubble)
- **Default is Dark** for new visitors regardless of OS preference; existing Light/Dark/System choices are respected
- **Semantic token layer** in `globals.css` (surface/text/border/gain/loss/accent) with `@custom-variant dark` and Robinhood palette overrides — light mode is byte-identical to v0.22 by construction (all light values map 1:1 to prior hardcoded values)
- **Pre-paint script** in `<head>` prevents FOUC; sets `.dark` class before first paint based on `localStorage`
- **Dynamic `<meta name="theme-color">`** so the iOS PWA status bar matches the active theme on the fly
- **Brand green `#00C805` preserved** in both modes (Robinhood-style pop on dark); accent CTAs shift sky-600 → sky-400 in dark for legibility
- **SVG chart strokes/fills** (time-machine, portfolio, learn module candlesticks, sparklines) migrated from hardcoded hex to `var(--token)` so axes/grids/labels flip automatically
- **Colored badge tints** (amber/violet/indigo/blue/purple/orange/etc.) get `dark:bg-{color}-950/40` overlays so they read as tinted glow on dark instead of near-white blocks
- **Tooling**: `scripts/add-dark-variants.mjs` — idempotent migration script that adds `dark:` companions to utility classes; re-run after merges that introduce new components

## v0.22.0 — Portfolio Manager

- **Portfolio Manager** (`/portfolio-manager`): AI-driven daily research and BUY/SELL ratings for every stock in your connected portfolio, plus a $100K reallocation plan
- **Per-ticker analysis**: rating (STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL), confidence, thesis, reasons, risks, catalysts, suggested action — all from one batched AI call
- **$100K reallocation plan**: treats current holdings as capital to reallocate; recommends SELL/TRIM/HOLD/ADD/BUY actions capped at $100K new deployment
- **Schedule**: one cron at market open (13:30 UTC weekdays), plus a fire-and-forget ride-along on the existing `/api/cron` (16:00 ET and 19:30 ET closes)
- **Force-regen**: "Re-run now" button on the page with 10-minute concurrency guard
- **Holdings cache**: SnapTrade holdings fetched once per UTC day in `portfolio_manager_holdings_cache`
- **Enrichment**: per-ticker quote, RSI(14), MACD, SMA 50/200, volume ratio, 52w distance, plus Yahoo Finance news headlines (no API key required, 30-min in-memory cache)
- **AI provider**: honors `preferred_ai_provider` / `preferred_ai_model` from user settings with auto-fallback
- **UI**: expandable-row table (not cards), color-coded rating pills, confidence bars, rating filter, allocation card with capital released/deployed pills
- **Navigation**: accessible from More page → Portfolio group → "Portfolio Manager" tile
- **Schema**: new tables `portfolio_manager_scans` and `portfolio_manager_holdings_cache` with RLS

## v0.21.0 — Portfolio Page (SnapTrade Live Data)

- **Portfolio Page**: New `/portfolio` page showing live brokerage data via SnapTrade API
- **Access Control**: Visible only to `k4rthikr@gmail.com` — hidden for all other users
- **Bottom Nav**: Portfolio tab added conditionally based on logged-in user
- **SnapTrade Client**: Server-side `src/lib/snaptrade/client.ts` — accounts, positions, balances, transactions
- **Portfolio API Route**: `GET /api/portfolio` with email-gated access (403 for unauthorized users)
- **HTTP MCP Endpoint**: `POST /api/mcp` — JSON-RPC 2.0 endpoint for Claude Desktop remote access
- **Summary Card**: Total portfolio value, unrealized P&L with color coding, invested/cash/positions breakdown
- **Positions List**: All holdings with shares, price, market value, P&L — options tagged with OPT badge
- **Balances Tab**: Cash and buying power per account
- **Vercel Env Vars**: All 4 `SNAPTRADE_*` vars deployed to production


## v0.20.0 — CSP Alpha Hunter

- **CSP Scanner Engine**: Scans 40+ high-volume tickers for juicy cash-secured puts (7-21 DTE, delta 0.15-0.30)
- **Capital Efficiency**: Calculates AROC, contracts per $100K, and capital utilization
- **Technical Enrichment**: EMA support levels, RSI, and composite technical scores
- **Earnings Awareness**: Flags candidates with earnings within the DTE window
- **Delta Tracking**: Compares scans to highlight new entries, premium changes, dropped candidates, and lost support
- **Claude Risk Analysis**: AI evaluates top 15 candidates as a risk manager with portfolio allocation advice
- **Email Reports**: Delta-aware HTML emails via Resend with priority highlights and Claude analysis
- **Cron Automation**: Runs 3x daily during market hours (10am, 2pm, 5pm ET)
- **CSP Hunter Page**: Full UI at `/csp-hunter` with scan history, filters, expandable cards, and analysis panel
- **Supabase Storage**: `csp_scans` table for persistent scan history and delta tracking

## v0.19.1 — Email Delivery Fix

- Fix: Resend sandbox rejects `+alias` emails — updated `user_settings.alert_email` to exact account owner address
- Fix: Morning briefing cron (`/api/cron/morning-briefing`) was never scheduled — added to `vercel.json`
- Verified: 6 emails delivered end-to-end (test templates + full app cron pipelines)

## v0.19.0 — AI Options Research & CSP Picks

- Options Tab — new dedicated bottom navigation tab for deep options research
- Top 10 CSP Picks — AI-powered scanner identifying the best cash-secured put opportunities today
- Research Table — unified view of Stock, DTE, Strike, Premium, and Annualized Return
- Background Refresh — background cron at `/api/cron/options` to keep recommendations fresh
- On-Demand Regeneration — trigger fresh AI analysis directly from the UI

## v0.18.1 — Sparkline Caching

- Sparkline Caching — new `market_sparklines` table in Supabase to store 5-day price history
- Background Refresh Cron — dedicated `/api/cron/sparklines` endpoint to pre-fetch and cache sparklines for all active tickers
- API Performance — `/api/sparklines` now reads from cache with 2-hour TTL, falling back to live fetch on cache miss
- Home page loading speed significantly improved by eliminating redundant history fetches

## v0.18.0 — Backlog Status Page, Push Notifications, Auto-Update Hook

- Backlog Status Page — static HTML at docs/backlog.html auto-generated from BACKLOG.md, served via GitHub Pages
- Push Notifications — Web Push API with service worker, enable/disable from Settings, notification on backlog changes
- Auto-Update Hook — Claude Code PostToolUse hook regenerates backlog page + sends push notification when BACKLOG.md is modified
- New API routes: POST /api/push/subscribe, DELETE /api/push/subscribe, POST /api/push/send

## v0.17.1 — Options Flow UI on Today Page

- New "Options Flow" section on Today's Plays page between Earnings and Position Alerts
- Shows tickers with unusual options activity: large blocks, OI walls, speculative bets, P/C ratio extremes
- Collapsible per-ticker cards with sentiment badge (bullish/bearish/neutral), activity score bar, volume stats
- Expand to see individual flow signals with type labels, direction arrows, significance scores
- Put/call ratio highlighted when extreme (>1.5 red, <0.5 green)
- Fetched in parallel with other Today page sections via Refresh All

## v0.17.0 — Position Health Scores

- Per-position health metric (0-100) across 3 dimensions: DTE urgency (40%), strike risk (35%), profit progress (25%)
- Color-coded status: healthy (emerald), watch (amber), danger (orange), critical (red)
- DTE scoring: 30+ DTE = healthy, 7-14 = caution, < 3 = danger
- Strike risk: OTM distance tracking, ITM detection
- Profit tracking: % of premium captured vs entry
- Health scores included in `/api/signals` response alongside alerts
- Module: `src/lib/options/health-score.ts` — pure functions, fully testable

## v0.16.0 — Morning Briefing Email

- Comprehensive pre-market email digest with 5 sections: action alerts, expiring positions, earnings today, market movers, AI picks
- Dedicated cron endpoint: `/api/cron/morning-briefing` — schedule at 9:00 AM ET
- Rich HTML email template with color-coded sections and urgency badges
- Integrates smart roll advisor alerts + trailing stop signals + position alerts
- Pulls latest AI recommendations from Supabase

## v0.15.0 — Options Flow Scanner

- Unusual options activity detection across watchlist + sector tickers
- Large block detection: volume > 3x open interest with minimum 500 contracts
- OI concentration walls: strikes holding > 15% of total OI (support/resistance)
- OTM speculative bets: > 10% OTM with 2000+ volume
- Put/call ratio extremes: PCR > 2.0 (bearish) or < 0.3 (bullish)
- Activity score (0-100) and sentiment classification per ticker
- New API endpoint: `/api/flow?tickers=NVDA,AAPL` — scans 15-ticker default universe

## v0.14.0 — AI Earnings Plays

- Pre-earnings strategy generator: scans 24-ticker universe for earnings in next 14 days
- IV analysis: ATM straddle pricing, expected move %, average IV across near-term chain
- AI-powered strategy suggestions: CSP, iron condor, credit spreads, straddles with specific strikes and risk/reward
- New API endpoint: `/api/earnings-plays` returns plays data + AI suggestions
- Earnings play analysis module: `src/lib/options/earnings-plays.ts`

## v0.13.0 — Smart Roll Advisor

- Multi-factor roll detection: combines DTE urgency + profit capture + strike proximity + earnings timing into a 0-100 roll score
- Specific roll direction recommendations ("roll up and out to $X with 30-45 DTE")
- Smart roll alerts replace basic ROLL signals in the signals pipeline — no duplicate alerts
- Roll recommendations surfaced on Today page via existing Position Alerts section
- API returns both alerts and detailed `rollRecommendations` array with full scoring breakdown

## v0.12.0 — Scoring Engine

- Quantitative stock scoring engine in `src/lib/scoring/` — scores 0-100 across 4 dimensions (25 pts each)
- Volume score: unusual activity detection via volume ratio thresholds
- Momentum score: price change magnitude + direction + volume confluence
- Technical score: SMA positioning, 52-week range placement, uptrend confirmation
- Earnings proximity score: catalyst timing boost (imminent earnings = max score)
- Letter grades A-F based on composite score
- Scanner API now returns scored + sorted results with full breakdown

## v0.11.0 — Tradier Live Data Activation

- Centralized Tradier API client (`tradier-client.ts`) — single source for base URL, auth headers, and rate limit tracking
- Environment-aware base URL: `TRADIER_ENV=production` switches from sandbox to `api.tradier.com` across all endpoints
- Rate limit monitoring: reads `X-Ratelimit-*` headers from every Tradier response, tracks remaining quota in-memory
- Exponential backoff on 429 (rate limited) with configurable retry count
- Distinct error handling: 401 (bad token) fails fast, 429 retries with backoff, network errors retry
- `/api/tradier-usage` now returns rate limit state (allowed/used/available/resetsAt)
- All Tradier-calling modules (quotes, options, history, earnings) now use the centralized client

## v0.10.1 — Force Email Test Button

- Send Test Email button on Settings page — trigger a full email briefing on demand to verify e2e email delivery
- Settings page now loads saved values from Supabase on mount and persists changes via API
- New API route POST /api/email/test — reuses cron pipeline scoped to authenticated user

## v0.10.0 — Sector Discovery, Explosive Finder, Trailing Stops, PMCC Picks

- Sector Discovery — browse 8 curated sectors (AI Infra, Quantum, Nuclear, Space, Fintech, Biotech, EV, AI Software) with 70+ tickers
- Explosive Stock Finder — Claude AI analyzes sectors for 10x potential stocks with specific entry strategies
- Trailing Stop System — set % trailing stops on positions, auto-track peak price, drawdown alerts
- Risk Dashboard — portfolio-level view of all positions with trailing stops, color-coded by risk
- PMCC Picks — auto-scan sectors for best PMCC setups ranked by monthly income and capital efficiency
- Portfolio enhanced with gain/drawdown tracking, % from peak, stop trigger visualization
- Summary Dashboard — quick stats, positions needing attention, action cards
- Updated nav: Discover / Sectors / Research / Positions / More
- DB migration: trailing_stop_pct, peak_price, entry_price_per_share on positions

## v0.9.0 — Tradier Integration + Mock Fallback

- Replaced yahoo-finance2 (broken on Vercel) with Tradier API for reliable server-side market data
- Real Greeks from Tradier: delta, gamma, theta, vega, IV on every option contract
- PMCC engine now uses real delta when available instead of estimated
- Mock data fallback when TRADIER_API_TOKEN is not set — app is fully functional with realistic data
- Market data layer split into types.ts, tradier.ts, mock.ts with automatic provider selection
- Removed yahoo-finance2 dependency

## v0.8.0 — All Real Data: No More Mocks

- Portfolio page now reads real positions from Supabase with live P&L from Yahoo Finance
- PMCC analyzer fetches real options chains and runs live PMCC analysis
- Covered Call Optimizer uses real chains for user's stock positions, plus custom ticker lookup
- Wheel Visualizer reads actual CSP/CC/Wheel positions and builds real cycle timelines
- Income Dashboard calculates real premium income from Supabase positions
- Trade Signals page — live roll/close/profit alerts against real positions and market data
- Cron job now reads all users' positions and watchlists from Supabase (no more hardcoded mock data)
- Signals API route for on-demand position checking
- Added Trade Signals to More menu

## v0.7.0 — Full App: Watchlists, Positions, Research, Suggestions

- Watchlist management — create named watchlists, add/remove tickers, default watchlist
- Position tracking — log PMCC, CC, CSP, Wheel trades with individual legs, track status
- Deep Research Engine — Claude AI analyzes your watchlist stocks and generates specific trade suggestions (CSPs, CCs, PMCCs) with reasoning
- Options Suggestions — on-demand CSP, CC, and PMCC recommendations for any ticker with live options data
- Supabase persistence — 7 tables (watchlists, positions, legs, research reports, trade suggestions, user settings)
- Updated navigation: Discover / PMCC / Research / Positions / More
- More page links to Watchlists, Suggestions, Covered Calls, Wheel, Income, Settings
- Settings page with starting cash ($20k) and alert email inputs

## v0.6.0 — Cron Alerts & Trade Signals

- Vercel cron jobs: runs 3x daily on market days (9:30am, 12pm, 3:30pm ET)
- Signal engine checks positions for: profit targets (50%+), DTE warnings, strike breaches, earnings proximity
- Email briefing via Resend with urgency-sorted action items
- Alerts categorized: CLOSE, ROLL, SELL, BUY, WARNING
- Breakout detection: flags stocks with 2.5x+ volume and 3%+ moves as PMCC opportunities

## v0.5.0 — Live PMCC Scanner

- PMCC Scanner with real options chain data via Yahoo Finance
- Scans 12 tickers for PMCC setups: finds LEAPS + short calls, grades A/B/C
- Shows capital required, monthly premium, annualized return, breakeven
- Add any custom ticker to scan
- Real market data layer (quotes, options chains) in src/lib/market/
- PMCC analysis engine in src/lib/options/ with delta estimation
- New "PMCC" tab in bottom nav

## v0.4.0 — Auth, Covered Calls, Wheel, Income Dashboard

- Google OAuth login via Supabase — unauthenticated users redirected to login
- Covered Call Optimizer — strike/expiry comparison grid with annualized returns
- Wheel Visualizer — timeline view of sell put → assigned → sell call → called away cycles
- Income Dashboard — $20k starting capital, YTD income, monthly breakdown chart
- App restructured with route groups (login page has no nav)
- Bottom nav now includes Income tab

## v0.3.0 — Discovery Dashboard, Ticker Detail, PMCC Analyzer & Portfolio

- Discovery dashboard with ranked watchlist showing scores, sparklines, volume indicators
- Ticker detail page with technical indicators (RSI, MACD, Bollinger, SMAs), signals, and news
- PMCC analyzer showing LEAPS + short call setups with risk/reward breakdown
- Portfolio page with position cards showing P&L, income collected, and roll status
- All pages use mock data for demo purposes

## v0.2.0 — App Shell & Navigation

- App shell with header and bottom nav (Discover, Portfolio, Settings)
- Empty state pages for each section
- Light stone theme matching snobaddy aesthetic

## v0.1.0 — Project Init

- Project scaffolded with Next.js, Supabase, and Vercel
- Established project conventions (specs, backlog, changelog)
- Created initial backlog with 11 features spanning discovery through position management
