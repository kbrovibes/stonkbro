# Changelog

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
