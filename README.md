# stonkbro

**Your AI-powered options trading copilot.** Find explosive stocks, analyze PMCC setups, track positions, and get real-time trade signals — all from one app.

> *"Stop scrolling Reddit for plays. Let the machine find them."*

**Live at [stonkbro.vercel.app](https://stonkbro.vercel.app)** | **Docs at [kbrovibes.github.io/stonkbro](https://kbrovibes.github.io/stonkbro)**

---

## What Is This?

stonkbro is a full-stack options trading platform built for traders who sell premium — covered calls, cash-secured puts, PMCCs, and the wheel strategy. It combines **live market data**, **real options chains**, and **Claude AI research** into a single workflow:

```
Discover stocks -> Analyze options setups -> Open positions -> Get signals -> Collect premium -> Repeat
```

No paper trading simulators. No "educational" disclaimers hiding an empty app. This is a real tool that pulls real data from Yahoo Finance, stores your real positions in Supabase, and sends you real alerts when it's time to roll, close, or take profit.

---

## Features

### Discovery Dashboard
Ranked watchlist with a custom scoring algorithm. Stocks are scored on volume ratio, momentum, SMA positioning, and 52-week range. High scores = high explosive potential. All data live from Yahoo Finance.

### PMCC Scanner
Scans your watchlist for Poor Man's Covered Call setups using real options chains. Finds optimal LEAPS + short call pairings, calculates capital required, monthly premium, annualized return, and assigns A/B/C grades. Add any ticker on the fly.

### Deep Research Engine
Feed it up to 20 symbols and Claude AI analyzes the market context, individual technicals, and generates specific trade suggestions — CSPs to sell, calls to write, PMCCs to open, and stocks to avoid. Each suggestion includes strike, expiry, premium estimate, and detailed reasoning.

### Position Tracking
Log your trades with full multi-leg support. PMCC with a LEAPS call and short call? Wheel strategy cycling through puts and calls? Every leg gets tracked with strike, expiry, entry price, and quantity. Positions flow through active → rolled → closed lifecycle.

### Portfolio (Live P&L)
See your actual P&L calculated from Supabase positions + live Yahoo Finance quotes. Summary cards for total P&L, premium collected, and active position count. Each position card breaks down individual leg performance.

### Portfolio Manager
AI-driven daily research for every stock in your connected SnapTrade portfolio. Each ticker gets a STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL rating with confidence, thesis, reasons, risks, and a suggested action — pulled from a single batched AI call that also produces a $100K reallocation plan (SELL/TRIM/HOLD/ADD/BUY) treating your current holdings as redeployable capital. Runs at market open and ride-alongs on the close cron; "Re-run now" button for on-demand. Expandable-row table with color-coded ratings, RSI/SMA/MACD/52w technicals, and Yahoo Finance headlines per ticker.

### Trade Signals
Real-time alerts against your active positions:
- **CLOSE** — Short options at 50%+ profit
- **ROLL** — 21 DTE or less, or strike breached
- **WARNING** — Price within 3% of strike
- **PROFIT** — Specific premium targets met

Urgency-sorted (HIGH/MEDIUM/LOW) so you know what needs attention now.

### Covered Call Optimizer
For your stock holdings: finds the best covered call strikes and expiries. Filters for 3-10% OTM, 20-45 DTE, calculates annualized return and probability OTM. Compare strikes in a grid view.

### Wheel Visualizer
Timeline view of the full wheel cycle: Sell Put → Assigned → Sell Call → Called Away. See premium collected at each step, cumulative income, cycle count, and current stage per symbol.

### Income Dashboard
Track your premium income machine. Starting capital ($20k default), total premium collected, yield percentage, monthly breakdown chart, and annualized projections. All calculated from real position data.

### Watchlist Management
Create named watchlists, add/remove tickers, set a default. Your default watchlist drives the Discovery dashboard. Persisted in Supabase with row-level security.

### Automated Alerts (Cron)
Vercel cron job runs 3x daily on market days (9:30am, 12pm, 3:30pm ET). Checks all users' positions, generates alerts, and sends email briefings via Resend. Morning briefing included.

### Google OAuth
One-click login with Google via Supabase Auth. All routes protected — unauthenticated users redirect to login. Row-level security ensures you only see your own data.

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Framework** | Next.js 16 (App Router, TypeScript 5) |
| **Frontend** | React 19, Tailwind CSS 4 |
| **Database** | Supabase (PostgreSQL + Row-Level Security) |
| **Auth** | Supabase Auth (Google OAuth) |
| **Market Data** | Yahoo Finance (quotes + options chains) |
| **AI** | Anthropic Claude SDK |
| **Email** | Resend |
| **Hosting** | Vercel (Analytics + Speed Insights) |

---

## Architecture

```
src/
  app/                    Next.js App Router
    (app)/                Protected routes (auth required)
      (pages)/            Feature pages
      api/                Backend API routes
        research/         Claude AI analysis endpoint
        options/          Options chain fetcher
        signals/          Position alert checker
        cron/             Automated daily briefings
    auth/                 OAuth callback
    login/                Public login page
  components/             Shared UI components
  lib/
    db/                   Database layer (positions, watchlists, settings, research)
    market/               Yahoo Finance integration (quotes, options chains)
    options/              Options math (PMCC grading, signal generation)
    research/             Claude AI analysis engine
    notifications/        Email service (Resend)
```

**Key principles:**
- All DB access through `src/lib/db/*.ts` — never query Supabase in components
- Server Components by default, `"use client"` only for interactivity
- Market data isolated in `src/lib/market/` — pure fetch functions
- Options math in `src/lib/options/` — pure functions, no side effects
- Tailwind only, mobile-first, no CSS frameworks

---

## Database Schema

7 tables with full RLS policies:

| Table | Purpose |
|---|---|
| `watchlists` | Named watchlists per user with default flag |
| `watchlist_items` | Tickers in each watchlist (unique per watchlist) |
| `positions` | Options/stock positions (PMCC, CC, CSP, Wheel) |
| `position_legs` | Individual legs of multi-leg strategies |
| `research_reports` | Claude AI analysis results (markdown) |
| `trade_suggestions` | Specific trade recs from research runs |
| `user_settings` | Starting cash, alert email, preferences |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project
- Vercel account (for deployment + cron)

### Setup

```bash
# Clone
git clone https://github.com/kbrovibes/stonkbro.git
cd stonkbro

# Install
npm install

# Environment variables
cp .env.example .env.local
# Fill in your Supabase URL, anon key, service role key
# Add ANTHROPIC_API_KEY for research engine
# Add RESEND_API_KEY for email alerts
# Add CRON_SECRET for cron job auth

# Run migrations
npx supabase db push

# Dev server
npm run dev
```

### Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Admin key for cron jobs |
| `ANTHROPIC_API_KEY` | For research | Claude AI analysis |
| `RESEND_API_KEY` | For email | Daily alert emails |
| `CRON_SECRET` | For cron | Bearer token for cron endpoint |
| `ALERT_EMAIL` | Optional | Fallback alert email |

---

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/research` | POST | Run Claude AI analysis on up to 20 symbols |
| `/api/options?symbol=X` | GET | Fetch PMCC setups for a symbol |
| `/api/signals` | GET | Check active positions for trade alerts |
| `/api/cron` | GET | Automated daily briefing (Vercel cron) |

---

## Roadmap

- [ ] Paper Trading Mode — simulate trades with virtual capital
- [ ] Research → Position — accept a suggestion, auto-create position
- [ ] Broker Integration — connect to Tradier/IBKR for execution
- [ ] Rules Engine — auto-rolling, profit-taking, defense rules
- [ ] Risk Dashboard — correlation matrix, sector/delta exposure
- [ ] Backtesting — test scoring model on historical data
- [ ] PWA + Push — install to home screen, push notifications

---

## Version History

| Version | Milestone |
|---|---|
| **v0.22.0** | Portfolio Manager (AI ratings + $100K reallocation plan) |
| **v0.21.0** | Portfolio Page (SnapTrade Live Data) |
| **v0.20.0** | CSP Alpha Hunter |
| **v0.8.0** | All Real Data: No More Mocks |
| **v0.7.0** | Full App: Watchlists, Positions, Research, Suggestions |
| **v0.6.0** | Cron Alerts & Trade Signals |
| **v0.5.0** | Live PMCC Scanner |
| **v0.4.0** | Auth, Covered Calls, Wheel, Income Dashboard |
| **v0.3.0** | Discovery, Ticker Detail, PMCC Analyzer, Portfolio |
| **v0.2.0** | App Shell & Navigation |
| **v0.1.0** | Project Init |

---

## Built With

Built at mass speed using [Claude Code](https://claude.ai/code). From zero to 16 production features in a weekend.

---

*stonkbro is a personal trading tool. Not financial advice. Options trading involves risk. You know the drill.*
