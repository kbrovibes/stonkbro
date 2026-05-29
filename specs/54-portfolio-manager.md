# Spec 54: Portfolio Manager

Daily AI-driven research + BUY/SELL ratings for every stock in the user's connected portfolio, plus a fresh $100K allocation recommendation. Runs automatically at market open and close; force-regen on demand.

---

## What it does

1. **Holdings snapshot** — fetches the user's current stock holdings from SnapTrade (options ignored) and caches the ticker list once per day.
2. **Per-ticker deep research** — for each ticker, calls the configured AI provider (Claude or Gemini per user settings) with a standardized prompt that synthesises: recent news, price movement (1d / 5d / 30d / 90d), key technicals (RSI, 50/200 SMA, MACD, volume ratio, ATR, distance from 52w high/low), and produces a condensed analyst report.
3. **Rating** — every ticker gets one of: `STRONG_BUY`, `BUY`, `HOLD`, `SELL`, `STRONG_SELL` with confidence (0-100) and 2-4 bullet reasons.
4. **$100K reallocation plan** — a cross-portfolio synthesis call that treats the current holdings' market value (plus any free cash) as **capital to reallocate**. The model may recommend selling existing positions to free capital and rotating into stronger names. Total target deployment ≤ $100K notional.
5. **Scheduled runs** — once at market open (09:30 ET / 13:30 UTC, weekdays) via a new dedicated cron entry, and once at market close as a fire-and-forget ride-along inside the existing `/api/cron` catch-all (which runs at 16:00 ET and 19:30 ET).
6. **Manual refresh** — "Re-run now" button on the page calls the same orchestrator with `scan_type = 'manual'`.
7. **Page accessed from More** — `/portfolio-manager` reachable from the More page tile grid. **No change to BottomNav** for now.
8. **Read-cached** — page reads the latest completed scan row from Postgres; no AI runs on page load.

## What it does NOT do

- **No options analysis.** Options positions exist in the same SnapTrade response; they are filtered out and ignored.
- **No order placement / staging.** Output is advisory only.
- **No multi-user tenancy.** Single-user app continues; one scan row per run, latest wins.
- **No backtesting** of recommendation accuracy in this spec.
- **No streaming** of AI output to the UI — runs are background, page just reads the latest persisted row.
- **No re-prompt-per-ticker UX** — user cannot tweak the prompt from the UI; prompt lives in `src/lib/prompts/portfolio-manager.md` and ships with code.

## Data / DB changes

### New migration: `supabase/migrations/20260529_portfolio_manager.sql`

```sql
-- One row per scan run
create table if not exists portfolio_manager_scans (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now() not null,
  completed_at timestamptz,

  scan_type text not null default 'scheduled',          -- 'scheduled' | 'manual'
  trigger_source text,                                  -- 'cron-open' | 'cron-close' | 'user'
  status text not null default 'running',               -- 'running' | 'completed' | 'failed'
  error text,

  -- Snapshot of holdings at scan time (after option filter)
  tickers jsonb not null default '[]'::jsonb,           -- [{ symbol, units, market_value, cost_basis, account }, ...]
  ticker_count int not null default 0,

  -- Per-ticker analyses (typed in src/lib/portfolio-manager/types.ts)
  analyses jsonb not null default '[]'::jsonb,

  -- Cross-portfolio $100K allocation recommendation
  allocation jsonb,

  -- AI metadata
  ai_provider text,                                     -- 'claude' | 'gemini'
  ai_model text,
  ai_fallback boolean default false,
  input_tokens int default 0,
  output_tokens int default 0,
  duration_ms int default 0
);

create index idx_pm_scans_created_at on portfolio_manager_scans (created_at desc);
create index idx_pm_scans_status on portfolio_manager_scans (status);
create index idx_pm_scans_latest_completed
  on portfolio_manager_scans (created_at desc) where status = 'completed';

alter table portfolio_manager_scans enable row level security;

create policy "Authenticated read portfolio_manager_scans"
  on portfolio_manager_scans for select to authenticated using (true);

create policy "Service role manages portfolio_manager_scans"
  on portfolio_manager_scans for all to service_role using (true) with check (true);

-- Daily ticker cache (one row per UTC day)
create table if not exists portfolio_manager_holdings_cache (
  date date primary key,
  tickers jsonb not null,                               -- [{ symbol, units, market_value, ... }]
  fetched_at timestamptz default now() not null
);

alter table portfolio_manager_holdings_cache enable row level security;
create policy "Service role manages holdings cache"
  on portfolio_manager_holdings_cache for all to service_role using (true) with check (true);
```

### Type contract (`src/lib/portfolio-manager/types.ts`)

```ts
export type Rating = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export type TickerSnapshot = {
  symbol: string;
  units: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl_pct: number;
  account_name: string;
};

export type TickerEnrichment = {
  symbol: string;
  price: number;
  change_1d_pct: number;
  change_5d_pct: number;
  change_30d_pct: number;
  change_90d_pct: number;
  rsi_14: number;
  sma_50: number;
  sma_200: number;
  above_50sma: boolean;
  above_200sma: boolean;
  volume_ratio: number;          // today vs 50d avg
  distance_from_52w_high_pct: number;
  distance_from_52w_low_pct: number;
  earnings_date: string | null;
  news_headlines: { title: string; url: string; published_at: string }[];
};

export type TickerAnalysis = {
  symbol: string;
  rating: Rating;
  confidence: number;            // 0–100
  thesis: string;                // 1–2 sentence headline
  reasons: string[];             // 2–4 bullets
  risks: string[];               // 1–3 bullets
  catalysts: string[];           // 0–3 bullets (upcoming events)
  suggested_action:
    | { type: 'HOLD'; note?: string }
    | { type: 'TRIM'; target_pct_of_position: number; note?: string }
    | { type: 'ADD'; target_pct_of_position: number; note?: string }
    | { type: 'EXIT'; note?: string };
  enrichment: TickerEnrichment;  // echoed for UI display
};

export type PortfolioAllocation = {
  capital_budget: 100000;        // hard cap on total new exposure
  starting_state: {
    holdings_market_value: number;
    free_cash: number;
  };
  summary: string;               // 2–3 sentence overview of the reallocation thesis
  actions: {
    symbol: string;
    action: 'SELL' | 'TRIM' | 'HOLD' | 'ADD' | 'BUY';   // SELL = exit existing; TRIM = reduce existing; ADD = increase existing; BUY = open new
    dollar_amount: number;       // for SELL/TRIM: proceeds released; for ADD/BUY: capital deployed
    rationale: string;
  }[];
  capital_released: number;      // sum of SELL + TRIM dollars
  capital_deployed: number;      // sum of ADD + BUY dollars
  cash_remaining: number;        // starting cash + released - deployed
  risk_notes: string[];
};
```

## API

### Cron: `GET /api/cron/portfolio-manager`

- Bearer-secret guarded (same pattern as csp-hunter): `Authorization: Bearer ${CRON_SECRET}`.
- Reads `?trigger=open|close` (from `vercel.json`), passes through as `trigger_source`.
- Calls `runPortfolioManagerScan({ scan_type: 'scheduled', trigger_source })`.
- Returns `{ success, scan_id, ticker_count, duration_ms }`.
- `export const maxDuration = 300;` (Fluid Compute; we may hit several seconds per ticker call).

### User-triggered: `POST /api/portfolio-manager/scan`

- Requires authenticated session (existing Supabase auth helper).
- Body: empty.
- Calls `runPortfolioManagerScan({ scan_type: 'manual', trigger_source: 'user' })` (no params).
- Returns `{ scan_id }` immediately if we go async (preferred), else full result.
- **Concurrency guard:** if a row with `status='running'` exists < 10 minutes old, return `409` with `{ already_running: true, scan_id }`.

### Read: `GET /api/portfolio-manager/latest`

- Authenticated.
- Returns the latest row where `status='completed'`, plus any concurrently `running` row's id so the UI can show "refreshing…".
- Response: `{ scan: PortfolioScanRow, refreshing?: { scan_id, started_at } }`.

## UI

### New page: `src/app/(app)/portfolio-manager/page.tsx` (Server Component shell + client subcomponents)

**Header strip:**
- Page title "Portfolio Manager"
- `<AIModelBadge>` showing `provider · model · "ran 2h ago"`
- "Re-run now" button (disabled while a scan is running; shows spinner)
- Small dropdown to filter rating: `All | Buy & Strong Buy | Hold | Sell & Strong Sell`

**Body — Table view (collapsed by default):**

| Col | Source |
|---|---|
| Symbol | `analysis.symbol` |
| Price | `enrichment.price` |
| Today | `enrichment.change_1d_pct` (green/red) |
| 30d | `enrichment.change_30d_pct` |
| RSI | `enrichment.rsi_14` (color: <30 green, >70 red) |
| Above 200 SMA | check / x |
| Rating | colored pill: STRONG_BUY emerald, BUY green, HOLD slate, SELL amber, STRONG_SELL red |
| Confidence | `analysis.confidence` (small bar 0–100) |
| Action | suggested_action.type badge |

Row click → expand inline:
- Thesis (full text)
- Reasons (bulleted, green dots)
- Risks (bulleted, amber dots)
- Catalysts (bulleted, blue dots)
- Mini technicals strip (RSI / SMA50 / SMA200 / volume ratio / 52w hi-lo distance)
- News (latest 3 headlines, external links)
- Suggested action detail

**Footer card — "Today's $100K plan":**
- Summary paragraph
- Table of `{symbol, action, dollar_amount, rationale}`
- "Cash remaining: $X" pill
- Risk notes list

**Empty state:** "No scan yet — tap Re-run now or wait for the next market-open/close cron."

### Navigation

- **No BottomNav change.** Page is reachable only from the More page tile grid (`MoreNav.tsx`).
- Add a new tile labeled "Portfolio Manager" with a research-style icon, grouped with the existing portfolio-related tiles.

## Files to create / modify

| File | Action |
|---|---|
| `supabase/migrations/20260529_portfolio_manager.sql` | **Create** — schema above |
| `src/lib/prompts/portfolio-manager.md` | **Create** — system+user prompt with JSON schema in fenced block |
| `src/lib/portfolio-manager/types.ts` | **Create** — types from contract above |
| `src/lib/portfolio-manager/holdings.ts` | **Create** — `getCachedHoldings(date)` / `setCachedHoldings()`; calls `getPortfolio()` from snaptrade, filters `is_option === false`, dedupes by symbol |
| `src/lib/portfolio-manager/enrich.ts` | **Create** — per-symbol enrichment: pull quote + RSI/SMA via existing `lib/market`, recent news via existing `NewsCard` source or stub (see Q2) |
| `src/lib/portfolio-manager/analyst.ts` | **Create** — builds prompt block, calls `generateText`, parses JSON response with zod-light validation |
| `src/lib/portfolio-manager/runner.ts` | **Create** — orchestrates holdings → enrich → analyze → persist; exposes `runPortfolioManagerScan(opts)` |
| `src/lib/db/portfolio-manager-scans.ts` | **Create** — `insertScan`, `markComplete`, `markFailed`, `getLatestCompleted`, `getRunning`, `getRunningWithin(minutes)` |
| `src/app/api/cron/portfolio-manager/route.ts` | **Create** — bearer-guarded cron entry |
| `src/app/api/portfolio-manager/scan/route.ts` | **Create** — POST, user-triggered |
| `src/app/api/portfolio-manager/latest/route.ts` | **Create** — GET, returns latest completed |
| `src/app/(app)/portfolio-manager/page.tsx` | **Create** — page shell |
| `src/app/(app)/portfolio-manager/PortfolioManagerView.tsx` | **Create** — client component with table + expand + footer |
| `src/components/MoreNav.tsx` | **Modify** — add "Portfolio Manager" tile |
| `src/app/api/cron/route.ts` | **Modify** — append fire-and-forget `runPortfolioManagerScan({ trigger_source: 'cron-close' })` at end |
| `vercel.json` | **Modify** — 1 new cron entry: `/api/cron/portfolio-manager` at `30 13 * * 1-5` (market open) |
| `src/lib/market/yahoo-news.ts` | **Create** — fetch headlines for a symbol from Yahoo Finance unofficial endpoint (`query1.finance.yahoo.com/v1/finance/search?q=SYMBOL`) or RSS, no key required |
| `CHANGELOG.md` | **Modify** — `v0.X.0 — Portfolio Manager` |
| `releases/v0.X.0-portfolio-manager.md` | **Create** — release notes |

## Acceptance Criteria

- [ ] Migration applies cleanly to local + remote Supabase.
- [ ] `POST /api/portfolio-manager/scan` from an authenticated session creates a new row, transitions `running → completed`, and persists per-ticker analyses + allocation.
- [ ] Cron endpoint, when hit with valid bearer, completes a scan end-to-end in <300s for a 25-ticker portfolio.
- [ ] `/portfolio-manager` page renders in <300ms after the initial DB read (no AI on page load).
- [ ] Every ticker in the holdings snapshot appears in the table with a valid rating and confidence.
- [ ] Expanding a row shows thesis + reasons + risks + catalysts + technicals + news.
- [ ] Footer "Today's $100K plan" sums actions to ≤ $100K and shows non-negative cash remaining.
- [ ] Force-regen button is disabled while a row with `status='running'` exists.
- [ ] Rating filter dropdown narrows visible rows correctly.
- [ ] Page is reachable from More page tile; route is auth-gated like other portfolio routes.
- [ ] AI provider/model honor `preferred_ai_provider` / `preferred_ai_model` from settings; auto-fallback works.
- [ ] No `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` leakage in client bundle.
- [ ] Holdings cache reused on second scan within same UTC day (no second SnapTrade call).
- [ ] `allocation.capital_deployed ≤ 100000`; `cash_remaining = starting_cash + capital_released − capital_deployed` (validated when persisting).
- [ ] `/api/cron` catch-all triggers a portfolio manager scan as fire-and-forget without affecting the existing briefing path's response time.

---

## Task Breakdown (each ≈ 1–2 min focused work for the implementer)

### Phase 1 — Schema + types (foundation)
1. Create `supabase/migrations/20260529_portfolio_manager.sql` with both tables.
2. Apply migration via Supabase MCP `apply_migration`.
3. Create `src/lib/portfolio-manager/types.ts` with the type contract.

### Phase 2 — Data layer
4. Create `src/lib/db/portfolio-manager-scans.ts` with `insertScan` (returns id).
5. Add `markComplete(id, payload)` to same file.
6. Add `markFailed(id, error)` to same file.
7. Add `getLatestCompleted()` to same file.
8. Add `getRunningWithin(minutes)` to same file.
9. Create `src/lib/portfolio-manager/holdings.ts`: `getStockHoldingsToday()` — reads cache table, else calls `getPortfolio()`, filters options out, writes cache.

### Phase 3 — Enrichment
10. Create `src/lib/portfolio-manager/enrich.ts` skeleton with `enrichTicker(symbol)` signature returning `TickerEnrichment`.
11. Wire `enrichTicker` to existing quote source in `src/lib/market/` for price, 52w hi/lo, SMA50/200, earnings_date.
12. Add 1d/5d/30d/90d % change calculation using cached `market_sparklines` (existing table).
13. Add RSI(14), MACD, volume_ratio computation from sparkline data.
14. Create `src/lib/market/yahoo-news.ts` with `getRecentHeadlines(symbol, limit)` hitting Yahoo Finance unofficial search endpoint; cache responses in-memory for 30 min.
15. Compose final `TickerEnrichment` in `enrichTicker`, wiring in headlines.

### Phase 4 — Prompt + AI
16. Create `src/lib/prompts/portfolio-manager.md` with system prompt + per-ticker JSON schema + allocation JSON schema.
17. Create `src/lib/portfolio-manager/analyst.ts`: `analyzeAll(enrichments, capital)` — builds the prompt block.
18. In `analyst.ts`, call `generateText({ feature: 'portfolio-manager', ... })` and capture token metadata.
19. In `analyst.ts`, parse JSON response (strip code fence), validate shape; throw on schema mismatch.
20. In `analyst.ts`, split parsed payload into `analyses[]` and `allocation`.

### Phase 5 — Orchestrator
21. Create `src/lib/portfolio-manager/runner.ts`: `runPortfolioManagerScan({ scan_type, trigger_source })` — insert row, mark running.
22. In `runner.ts`, call `getStockHoldingsToday()`; if empty, mark complete with empty analyses.
23. In `runner.ts`, enrich all tickers in parallel with `Promise.allSettled` (max 10 concurrent).
24. In `runner.ts`, call `analyzeAll()` and write `analyses + allocation + tokens + provider + duration` via `markComplete`.
25. Wrap whole orchestrator in try/catch that calls `markFailed` and re-throws.

### Phase 6 — HTTP endpoints
26. Create `src/app/api/cron/portfolio-manager/route.ts` (bearer-guarded GET; `maxDuration = 300`).
27. Create `src/app/api/portfolio-manager/scan/route.ts` (POST, auth check, concurrency guard, kicks runner).
28. Create `src/app/api/portfolio-manager/latest/route.ts` (GET, auth check, returns latest completed + running info).

### Phase 7 — UI shell
29. Create `src/app/(app)/portfolio-manager/page.tsx` server component that just renders `<PortfolioManagerView>`.
30. Create `src/app/(app)/portfolio-manager/PortfolioManagerView.tsx` skeleton: fetch `/latest`, render header strip with `<AIModelBadge>` and Re-run button.
31. Add empty state + loading state to `PortfolioManagerView`.

### Phase 8 — UI table
32. Add table header row + responsive table body (mobile: stacked columns).
33. Add per-row collapsed view (symbol, price, today %, 30d %, RSI, SMA-200 flag, rating pill, confidence bar, action badge).
34. Implement row click → expand with thesis/reasons/risks/catalysts.
35. Add mini technicals strip inside expanded row.
36. Add news list inside expanded row.
37. Add suggested-action detail inside expanded row.

### Phase 9 — UI footer + filters
38. Add `<AllocationCard>` rendering `allocation.summary`, action table, cash-remaining pill, risk notes.
39. Add rating filter dropdown wired to client-side `useMemo`.
40. Wire "Re-run now" button to `POST /scan`, then poll `/latest` every 5s until `refreshing` clears.

### Phase 10 — Navigation
41. Add "Portfolio Manager" tile to `MoreNav.tsx` (no BottomNav changes).

### Phase 11 — Schedule + docs
42. Add one cron entry to `vercel.json`: `{ path: "/api/cron/portfolio-manager", schedule: "30 13 * * 1-5" }`.
43. Append fire-and-forget `runPortfolioManagerScan({ scan_type: 'scheduled', trigger_source: 'cron-close' }).catch(console.error)` at the end of `src/app/api/cron/route.ts` (before the success NextResponse return).
44. Update `CHANGELOG.md` with `v0.X.0 — Portfolio Manager`.
45. Create `releases/v0.X.0-portfolio-manager.md` release notes.
46. Update `README.md` Features section + `docs/index.html` per CLAUDE.md doc discipline.

### Phase 12 — Validation
47. Run `npm run build` — fix type errors.
48. Manually trigger scan from UI; verify row appears in `portfolio_manager_scans` with `status='completed'`.
49. Verify cron endpoint with `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/portfolio-manager`.
50. Verify expanded-row UI, rating filter, allocation card; confirm `capital_deployed ≤ 100000`.
51. Commit + push.
