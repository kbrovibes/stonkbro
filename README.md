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

### HOOD Theme Style (opt-in premium re-skin)
Settings → Appearance → **Theme Style** switches the whole app between **Classic** (the default, unchanged) and **HOOD** — a Robinhood-leaning design system that composes with your existing Light/Dark/Auto choice. HOOD dark is true-black (#000) with near-black cards and 8%-white hairlines; HOOD light is paper-white with barely-there stone borders. Portfolio P&L jumps to 34–44px tabular numerals in vivid green or soft coral, secondary labels shrink to 10px uppercase micro-caps, tabs and sort chips become pills, and the header/bottom nav turn to frosted glass. Micro-motion — card rise-in, tab cross-fade, press-scale, shimmer skeletons — is entirely CSS and turns itself off under `prefers-reduced-motion`. The choice is per-device and applied before first paint.

### Dark Mode (default-on, Robinhood-style)
Full dark mode across every page, with a Light/Dark/Auto toggle in the profile dropdown (top-right initials bubble). Dark is the default for new visitors; existing preferences are respected. Brand green stays loud in both modes; loss reds shift to a softer coral on dark; sky-blue CTAs bump to sky-400 on dark for legibility. Charts, sparklines, and badges all flip automatically.

### Bloodbath (Pullback Navigator)
When the market pulls back, `/bloodbath` shows every watchlist ticker plus the biggest scan-universe casualties ranked by drawdown off their 4-week peak. Tap any card for AI-generated reasons for the drop (fed by recent headlines), a dip verdict — Buy the dip / Nibble / Wait / Avoid — with confidence, and a concrete entry idea (limit level or CSP strike). One batched AI call covers up to 12 tickers.

### Discovery Dashboard
Ranked watchlist with a custom scoring algorithm. Stocks are scored on volume ratio, momentum, SMA positioning, and 52-week range. High scores = high explosive potential. All data live from Yahoo Finance.

### PMCC Scanner
Scans your watchlist for Poor Man's Covered Call setups using real options chains. Finds optimal LEAPS + short call pairings, calculates capital required, monthly premium, annualized return, and assigns A/B/C grades. Add any ticker on the fly.

### Deep Research Engine
Feed it up to 20 symbols and Claude AI analyzes the market context, individual technicals, and generates specific trade suggestions — CSPs to sell, calls to write, PMCCs to open, and stocks to avoid. Each suggestion includes strike, expiry, premium estimate, and detailed reasoning.

### Position Tracking
Log your trades with full multi-leg support. PMCC with a LEAPS call and short call? Wheel strategy cycling through puts and calls? Every leg gets tracked with strike, expiry, entry price, and quantity. Positions flow through active → rolled → closed lifecycle.

### Portfolio (Live P&L)
See your actual P&L calculated from Supabase positions + live Yahoo Finance quotes. Summary cards for total P&L, premium collected, and active position count. Each position card breaks down individual leg performance. Multiple brokerages (Fidelity, Chase, …) link through SnapTrade from Settings → Brokerages and aggregate into one portfolio.

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

### Learn (Interactive Coursework)
22 modules / ~120 lessons across Greeks, technical analysis, trader fluency, leverage, and crash playbooks — built practice-first: scored support/resistance drawing drills (LevelFinder), a live indicator playground (SMA/EMA/RSI/MACD/Bollinger with auto-annotated signals), a Black-Scholes strike/DTE/IV sandbox with payoff diagrams, and spot-the-setup chart quizzes. Every concept: worked examples (including failure cases), exact plotting steps, options-seller trade rules, and quizzes. Fully offline.

### Learn v3: Defense-First Case Studies
Every case study teaches the explicit brokerage action that limits losses, computed from real data: the warning sign (exact date/price of the support break or credit doubling), the order to place at entry (GTC stop-limit ticket with stop/limit prices, or alert levels for thin books), and the dollars it would have saved vs what actually happened. A Defense Playbook module codifies the rules: 2×-credit stop, support tripwire, 50-75% profit taking, 21-DTE management, swing-low−ATR stops.

### Learn v2: Case Studies (Real Chain Data)
15 ticker modules / 80 case studies built **entirely from real scanner history** (May–Aug 2026 option-chain snapshots committed to the repo) — 10 wheel tickers plus 5 "opportunities you weren't watching". Stop-loss discipline on real -50% drawdowns, stop-market vs stop-limit through real wide spreads, roll-vs-assignment decisions (including the one that never recovered), covered-call strike regret, and observed theta/IV decay. Interactive: place your stop on the real chart before seeing what happened, A/B-pick between two real contracts, scrub actual premium decay. Every number is traceable to a dataset row — fabricated figures fail the build.

### Market Monitor (Hourly Push Alerts)
Hourly cron on market days watches SPY plus every portfolio holding and watchlist symbol. Big moves generate plain-English alerts with severity tiers — critical position drops include concrete stop-limit levels computed from support. Alerts push to your phone (Web Push banners) and surface in a sticky in-app banner with per-alert actions.

### Offline Mode (Airplane-Mode PWA)
The service worker caches every visited page and pre-caches the full knowledge base (Learn v1 + v2 case studies) on every app open — Learn works completely offline. Network-dependent pages fail fast with a friendly "needs a connection" state and retry button instead of hanging; Portfolio shows your last-known snapshot read-only with an "as of" timestamp; a global banner tracks connectivity (including flaky connections that report online but fail).

### Privacy Lock (hand-your-phone mode)
Tap "Lock private info" in the profile menu before handing your phone over: every wealth-revealing number — portfolio value, P&L, collateral, real position sizes and strikes, income totals, account balances — masks to `•••••` app-wide, while market data, percentages, the scanner, and Learn stay fully usable. Unlock with a per-user PIN (set in Settings), verified server-side with an httpOnly cookie so even server-rendered pages are masked.

### Actions (async operation tracking)
Every long-running operation — scans, refreshes, AI research, crons — registers as an action. A header indicator shows a live count of running actions; the /actions page has status summary cards, day-grouped history with aligned trigger badges (cron/manual/auto), timing, progress, errors, tap-through to each action's output page, and cancel buttons for actions that support cooperative cancellation (chain scan, Hindsight backfill, tax stock sync).

### Tax Center (quarterly estimated taxes)
Personal-CPA view of taxes on trading gains: per IRS estimated-tax period (real Apr 15 / Jun 15 / Sep 15 / Jan 15 due dates), realized gains/losses from closed option chains **and stock sales** (FIFO lot matching over full broker history), an always-visible short/long-term split per quarter (options vs stocks), tax at marginal rates (40.8% STCG / 23.8% LTCG, WA excise handling), and a recommended one-off payment per quarter — computed cumulatively so losses and prior payments re-adjust later quarters. Transfer/RSU shares without feed basis are flagged per quarter until you enter basis. Record payments you've made and the math updates. Assumes W-2 income is already covered by employer withholding.

### Daily Audio Briefing (pre-market podcast)
A personal ~2–3 minute audio briefing generated before market open every weekday, curated to your portfolio: market pulse, your biggest movers and why, news/earnings that matter today, and concrete trade suggestions (close / roll / open / watch, each with a reason). Free Microsoft Edge neural TTS (no API key) renders ~1 MB mono MP3s; a home-screen card opens a Spotify-style player with generated cover art, speed control, transcript, 7-day history, offline download, and force-regenerate. No account-level dollar amounts spoken, by design.
### Face ID App Lock (per-device)
Optional Settings toggle: once enabled on a device, opening the app (or returning after a minute in the background) requires Face ID/Touch ID via the WebAuthn platform authenticator — full lock screen with auto-prompt, no content flash, works offline, zero dependencies. Layers on top of the Privacy Lock PIN and Supabase auth.

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
| `/api/bloodbath` | GET | Pullback scan: cron-cached drawdowns off 4-week peaks (`?refresh=1` for live) |
| `/api/cron/bloodbath` | GET | Scheduled scan + AI verdicts, 3× weekdays (Vercel cron) |
| `/api/bloodbath/verdict` | POST | Batched AI dip verdicts for up to 12 tickers |
| `/api/options?symbol=X` | GET | Fetch PMCC setups for a symbol |
| `/api/signals` | GET | Check active positions for trade alerts |
| `/api/portfolio/connections` | GET/POST | List SnapTrade brokerage connections; generate a Connection Portal link to add/fix one |
| `/api/taxes` | GET/POST/DELETE | Quarterly estimated-tax insights from realized chains; record/delete one-off payments |
| `/api/jobs` | GET/POST | List async jobs + running count; request cooperative cancel of a running job |
| `/api/taxes/equities` | GET/POST | Stock-sale scan freshness; sync sell history via FIFO lot engine (job-tracked) |
| `/api/taxes/basis` | POST/DELETE | Cost-basis overrides for transfer/RSU shares the broker feed can't price |
| `/api/alerts` | GET/POST | Recent market-monitor alerts; acknowledge one or all |
| `/api/cron/market-monitor` | GET | Hourly market watch: big moves → push alerts with stop suggestions |
| `/api/learn/manifest` | GET | Knowledge-base paths for offline precaching |
| `/api/cron` | GET | Automated daily briefing (Vercel cron) |
| `/api/briefing` | GET/POST | List audio briefings (7-day history); force-regenerate today's episode |
| `/api/briefing/audio/[id]` | GET | Stream a briefing's MP3 (auth-gated, private bucket) |
| `/api/cron/briefing` | GET | Generate the daily audio briefing pre-open (Vercel cron) |

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
| **v0.36.0** | HOOD theme style — opt-in Robinhood-grade re-skin over both light and dark modes |
| **v0.35.0** | Daily Audio Briefing — pre-market podcast curated to your portfolio, free TTS, offline player |
| **v0.34.0** | Defense-first case studies — warning signs, exact order tickets, cost of inaction |
| **v0.33.0** | Face ID app lock (per-device WebAuthn gate) + Learn progress fix |
| **v0.32.0** | Explosive finder — per-sector state, Research All, 24h cached scans |
| **v0.31.0** | Tax Center stock sales — FIFO lot engine, per-quarter ST/LT split, basis overrides |
| **v0.30.0** | Jobs Center — all async ops tracked, queryable, cancellable; header running-count indicator |
| **v0.29.0** | Tax Center (quarterly estimated taxes), potential year total, per-brokerage chain badges |
| **v0.28.0** | Multi-brokerage connections — link Chase or any SnapTrade broker from Settings |
| **v0.26.0** | Learn v2 Case Studies (80 studies from real chain data) + offline hardening |
| **v0.25.0** | Market monitor push alerts, practical Learn tracks, real interactivity, offline PWA |
| **v0.24.0** | Bloodbath (pullback navigator with AI dip verdicts) |
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
