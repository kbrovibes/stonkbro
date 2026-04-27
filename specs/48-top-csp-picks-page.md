# Spec 48: Top CSP Picks Page

## What it does
A standalone page at `/csp-picks` showing the best Cash-Secured Put options for today. The page scans a curated universe of tickers, fetches live options chains via Tradier, ranks CSP candidates, and presents them in four grouped sections:

1. **Highest Premiums** — CSPs offering the most dollar premium per contract
2. **Highest Returns** — CSPs with the best annualized return on capital (premium / cash required, annualized by DTE)
3. **Strike & DTE Suggestions** — Recommended strike/expiration combos balancing risk and reward (e.g., 5-10% OTM, 30-45 DTE sweet spot)
4. **Rationale** — AI-generated reasoning for each top suggestion explaining why the setup is attractive now (IV rank, support levels, catalyst timing)

Data auto-refreshes every 4 hours via a server-side cron job that caches results in Supabase. The page reads from cache so it loads instantly; a manual refresh button lets users trigger a fresh scan on demand.

## What it does NOT do
- No trade execution or order staging
- No position tracking — this is discovery only
- No new environment variables (uses existing Tradier + Anthropic keys)
- No user-specific customization (same picks for all users)
- No historical tracking of past picks
- No covered call or PMCC picks (those have their own pages)
- No new watchlist integration — scans a fixed universe of liquid, optionable tickers

## Data / DB changes

### New table: `csp_picks_cache`

```sql
CREATE TABLE csp_picks_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  picks JSONB NOT NULL,
  ticker_count INT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_csp_picks_cache_expires ON csp_picks_cache (expires_at DESC);

-- RLS: read for authenticated users, write for service role only
ALTER TABLE csp_picks_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read csp picks" ON csp_picks_cache
  FOR SELECT TO authenticated USING (true);
```

The `picks` JSONB column stores the full ranked output:
```json
{
  "highestPremiums": [{ "symbol", "strike", "expiration", "dte", "bid", "premium", "cashRequired", "probOTM" }],
  "highestReturns": [{ "symbol", "strike", "expiration", "dte", "bid", "annualizedReturn", "cashRequired", "probOTM" }],
  "suggestions": [{ "symbol", "strike", "expiration", "dte", "bid", "annualizedReturn", "rationale" }]
}
```

## API

### `GET /api/csp-picks`
**Auth:** Requires authenticated user.

**Response:**
```json
{
  "generatedAt": "2026-04-26T14:00:00Z",
  "highestPremiums": [...],
  "highestReturns": [...],
  "suggestions": [...],
  "stale": false
}
```

Returns the most recent non-expired cache entry. If no fresh cache exists, returns `stale: true` with the latest available data (or empty arrays on first run).

### `POST /api/csp-picks/refresh`
**Auth:** Requires authenticated user.

**Request:** No body.

**Response:**
```json
{
  "success": true,
  "tickerCount": 25,
  "pickCount": 15,
  "generatedAt": "2026-04-26T18:00:00Z"
}
```

**Logic:**
1. Scan a hardcoded universe of ~25-30 liquid, optionable tickers (SPY, QQQ, AAPL, MSFT, NVDA, AMZN, TSLA, META, GOOGL, AMD, etc.)
2. For each ticker, fetch quote via `tradierGetQuote` and options chains via `tradierGetAllOptionsChains`
3. Run `findCSPCandidates` (from existing `/api/options` logic, extracted to `src/lib/options/csp.ts`) on each ticker's puts
4. Rank and bucket into highest-premium and highest-return groups (top 10 each)
5. Select top 5 suggestions (best risk/reward balance: >70% prob OTM, 30-45 DTE, >15% annualized return)
6. Call Claude AI to generate a 1-2 sentence rationale for each suggestion
7. Write results to `csp_picks_cache` with `expires_at = now() + 4 hours`

### `POST /api/cron/csp-picks` (cron endpoint)
**Auth:** Bearer token (`CRON_SECRET`).

Runs the same refresh logic on a 4-hour schedule. Intended for Vercel Cron.

## UI

### Page: `/csp-picks`

**Layout:** Full-page scrollable view with four card sections.

**Header area:**
- Page title: "Top CSP Picks"
- Subtitle: "Best cash-secured puts for today"
- "Last updated: {time}" badge
- Refresh button (triggers `POST /api/csp-picks/refresh`, shows loading spinner)

**Section 1 — Highest Premiums (card list)**
Each card shows: ticker, strike, expiration, DTE, bid/premium, cash required, prob OTM badge.
Sorted by premium descending. Top 10.

**Section 2 — Highest Returns (card list)**
Each card shows: ticker, strike, expiration, DTE, annualized return %, cash required, prob OTM badge.
Sorted by annualized return descending. Top 10.

**Section 3 — Suggested Plays (card list)**
Each card shows: ticker, strike, expiration, DTE, annualized return %, premium, plus an AI-generated rationale paragraph.
Top 5 curated picks.

**Empty state:** "No picks available yet — tap Refresh to scan." Shown when cache is empty.

**Loading state:** Skeleton cards while fetching.

**Navigation:** Add "CSP Picks" link to the More page (or equivalent nav section).

## Files to create/modify

| File | Action |
|---|---|
| `src/lib/options/csp.ts` | Create — Extract `findCSPCandidates`, `CSPCandidate` type, and ranking logic from `/api/options/route.ts` into a reusable module |
| `src/lib/options/csp-universe.ts` | Create — Hardcoded list of ~25-30 liquid tickers to scan |
| `src/app/api/csp-picks/route.ts` | Create — GET handler returning cached picks |
| `src/app/api/csp-picks/refresh/route.ts` | Create — POST handler that scans, ranks, generates rationale, and caches |
| `src/app/api/cron/csp-picks/route.ts` | Create — Cron endpoint wrapping the refresh logic |
| `src/app/(app)/csp-picks/page.tsx` | Create — CSP Picks page with three grouped sections |
| `src/lib/db/csp-picks.ts` | Create — DB access for reading/writing csp_picks_cache |
| `src/app/api/options/route.ts` | Modify — Import CSPCandidate and findCSPCandidates from `src/lib/options/csp.ts` instead of inline |
| `src/app/(app)/more/page.tsx` | Modify — Add "CSP Picks" navigation link |
| `supabase/migrations/YYYYMMDD_csp_picks_cache.sql` | Create — Migration for csp_picks_cache table |

## Acceptance Criteria
- [ ] `/csp-picks` page loads and displays cached CSP picks grouped into three sections
- [ ] Highest Premiums section shows top 10 CSPs sorted by dollar premium
- [ ] Highest Returns section shows top 10 CSPs sorted by annualized return %
- [ ] Suggestions section shows top 5 picks with AI-generated rationale text
- [ ] Each card displays ticker, strike, expiration, DTE, premium, cash required, and prob OTM
- [ ] Refresh button triggers a live scan and updates the page with new results
- [ ] Cron endpoint generates and caches picks on a 4-hour schedule
- [ ] Page shows "last updated" timestamp from cache
- [ ] Empty state shown when no cached data exists
- [ ] Loading skeletons displayed while data is fetching
- [ ] `findCSPCandidates` is extracted to `src/lib/options/csp.ts` and shared with existing options route
- [ ] All DB access goes through `src/lib/db/csp-picks.ts`
- [ ] Unauthenticated requests to API routes return 401
