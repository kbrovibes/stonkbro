# stonkbro Roadmap — v1.0 Vision

## What the user actually wants

Three core use cases, distilled from all conversations:

### 1. Find Explosive Stocks Early
Not "what's moving today" — find stocks like OKLO (nuclear), SNDK (storage), BIS (quantum) that are in early stages of 10x+ moves because of direction, fundamentals, niche sectors, and catalysts.

**Features needed:**
- Sector/theme-based discovery (AI, Quantum, Nuclear, Space, Defense, Fintech, Energy)
- Curated ticker lists per sector
- "Find Explosive Stocks" AI research — Claude analyzes sectors for 10x candidates
- Catalyst-focused analysis (not just technicals)

### 2. Risk Management — Don't Give Back Gains
User timed the quantum crash by pulling out after stocks dropped 10% from peak (still at 300% gains). This pattern needs to be automated.

**Features needed:**
- Trailing stop alerts on positions (e.g., "alert me when stock drops 10% from its highest point since I bought")
- Peak price tracking per position
- Drawdown visualization (% from peak)
- Gain tracker (% from entry, color-coded)
- Portfolio-level risk dashboard

### 3. PMCC Income Machine
Buy LEAPS + sell calls to generate high income with less capital. Find the best setups automatically.

**Features needed:**
- Auto-scan across sectors for best PMCC setups ranked by monthly income
- Capital efficiency ranking (how much less capital vs owning 100 shares)
- "Best PMCCs This Week" curated view
- Income projection per setup

## Implementation Plan

### Batch 1: Sector Discovery + Explosive Stock Finder
- `src/lib/market/sectors.ts` — Sector definitions with curated tickers
- `src/app/(app)/sectors/page.tsx` — Browse sectors
- `src/app/(app)/sectors/[slug]/page.tsx` — Sector detail with tickers + research
- Enhanced research prompt for 10x stock discovery
- `src/app/(app)/explosive/page.tsx` — "Find Explosive Stocks" AI-powered page

### Batch 2: Risk Management
- DB migration: add `trailing_stop_pct`, `peak_price` to positions
- `src/app/(app)/positions/[id]` — Add trailing stop configuration
- Signal engine enhancement: trailing stop alerts
- Portfolio gain/drawdown visualization

### Batch 3: PMCC Auto-Scanner Enhancement  
- `src/app/(app)/pmcc-picks/page.tsx` — Auto-ranked PMCC setups across all sectors
- Income projection calculations
- Capital efficiency scoring
- One-click position logging from PMCC picks
