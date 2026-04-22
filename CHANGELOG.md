# Changelog

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
