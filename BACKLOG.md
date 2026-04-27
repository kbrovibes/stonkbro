# Backlog

## 🔄 In Progress
<!-- Claude moves items here when starting work, back to Done when committed -->

- [ ] **35 — Smart Roll Advisor** · Auto-detect when to roll options: DTE < 7, delta drift, profit > 50% of max, approaching earnings — surface on Today page

## ✅ P1 — Do First
- [ ] **32 — Push Notifications** · Web Push API via service worker, subscribe from settings, deliver position signals + movers + earnings alerts to phone — `NEEDS_INPUT: requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars for Web Push; generate with web-push library or provide existing keys`
- [ ] **33 — News & Sentiment Pipeline** · Integrate financial news API (Benzinga/Finnhub) for discovery context, earnings reactions, and thesis validation — `NEEDS_INPUT: requires choosing a news API provider and setting up API key env var`

## 📋 P2 — Do Next

- [ ] **36 — AI Earnings Plays** · Pre-earnings strategy generator: IV rank check, straddle pricing, suggest CSP/iron condor with risk/reward, flag on earnings calendar
- [ ] **37 — Options Flow Scanner** · Unusual activity detection (large blocks, OI spikes, put/call ratio extremes) for watchlist + sector tickers
- [ ] **38 — Trade Journal & Analytics** · Win rate, avg premium captured, strategy breakdown (PMCC vs CSP vs CC), monthly income trend, lessons/notes per trade
- [ ] **39 — Broker API Integration** · Connect Tradier/Alpaca for real-time account data, order staging, position sync — read-only first, then write
- [ ] **40 — One-Click Order Staging** · From any AI suggestion → pre-filled order form in broker, confirm and send
- [ ] **41 — Rules-Based Automation** · User-defined rules: auto-roll at 50% profit, close at 21 DTE, defend at 2x premium lost, trailing stop triggers
- [ ] **42 — Backtesting Engine** · Test PMCC/CSP strategies against historical options data, validate scoring model
- [ ] **43 — Portfolio Greeks Dashboard** · Aggregate delta/theta/vega exposure across all positions, sector correlation matrix
- [ ] **44 — Morning Briefing Email** · Daily pre-market digest: overnight movers, earnings today, expiring positions, AI picks — one email to start the day
- [ ] **45 — Watchlist Price Alerts** · Set price/volume thresholds on watchlist tickers, trigger push/email when hit
- [ ] **46 — Position Health Scores** · Per-position health metric (theta decay progress, delta risk, DTE urgency) with color-coded badges

## 💡 IDEAS — Unreviewed
<!-- Claude adds brainstorm items here. Karthik reviews via git diff and promotes to P1/P2 to approve. -->

## ✅ Done
<!-- Completed items land here with git SHA and date -->

- [x] **47 — Force Email Test Button** · Manual trigger button to send research email briefing for e2e testing (2026-04-26)

- [x] **01 — App Shell & Navigation** · Layout, bottom nav, empty state pages
- [x] **02 — Discovery Dashboard** · Ranked watchlist with live Yahoo Finance data
- [x] **03 — Ticker Detail** · Live quotes, SMAs, volume, 52w range, earnings
- [x] **04 — PMCC Scanner** · Real options chain scanning for PMCC setups
- [x] **05 — Options Suggestions** · On-demand CSP, CC, PMCC recs with live data
- [x] **06 — Deep Research Engine** · Claude AI analysis with trade suggestions
- [x] **07 — Watchlist Management** · Create/manage named watchlists, Supabase persistence
- [x] **08 — Position Tracking** · Log trades with legs, track status
- [x] **09 — Portfolio (Live)** · Real P&L from Supabase positions + Yahoo quotes
- [x] **10 — PMCC Analyzer (Live)** · Real options chains for PMCC setup analysis
- [x] **11 — Covered Call Optimizer (Live)** · Real chains for user positions + custom ticker
- [x] **12 — Wheel Visualizer (Live)** · Real cycle data from Supabase positions
- [x] **13 — Income Dashboard (Live)** · Real premium income from position data
- [x] **14 — Trade Signals** · Live roll/close/profit alerts against real positions
- [x] **15 — Cron Alerts (Real Data)** · Reads all users' positions + watchlists from Supabase
- [x] **16 — Google Auth** · Supabase auth with Google OAuth
- [x] **17 — Sector Discovery** · Browse 8 curated sectors with 70+ tickers
- [x] **18 — Explosive Stock Finder** · Claude AI analyzes sectors for 10x potential with entry strategies
- [x] **19 — Trailing Stop System** · Per-position trailing %, peak price tracking, drawdown alerts
- [x] **20 — Risk Dashboard** · Portfolio-level trailing stops, color-coded risk, drawdown tracking
- [x] **21 — PMCC Picks Auto-Scanner** · Sector-wide scan ranked by monthly income / capital efficiency
- [x] **22 — Today/Plays Dashboard** · Explosive movers, premium plays, earnings ahead, position alerts
- [x] **23 — QuickLog Position Entry** · One-tap trade logging from AI suggestions with URL pre-fill
- [x] **24 — Daily Recommendations Engine** · 3 AI prompt themes, cron 4x daily, cached in Supabase
- [x] **25 — Earnings Calendar** · Full calendar with Tradier data, grouped by week, position cross-ref
- [x] **26 — Market Movers Detector** · Universe-wide scan for 5%+ moves / 2.5x volume spikes
- [x] **27 — Resend Email Alerts** · Email briefings via Resend with movers + signals sections
- [x] **28 — Alert Preferences** · iOS-style toggles, frequency selector, AI provider choice, auto-save
- [x] **29 — PWA Manifest & Icons** · Web app manifest, home screen install, generated PNG icons
- [x] **30 — Hybrid Research Mode** · Combined fast + deep research with background persistence
- [x] **31 — Tradier Live Data Activation** · Centralized client, env-aware URLs, rate limit tracking, backoff — `5d75a7c` 2026-04-26
- [x] **34 — Scoring Engine** · Quantitative 0-100 scoring (volume + momentum + technical + earnings) — `210c815` 2026-04-26

## Removed

- ~~**Paper Trading Mode**~~ — Deprioritized: trades real capital; simulated P&L adds friction without insight
- ~~**Position Persistence from Research**~~ — Superseded by QuickLog (#23)
- ~~**Portfolio Risk Dashboard (old scope)**~~ — Merged into Risk Dashboard (#20) + future Portfolio Greeks (#43)
