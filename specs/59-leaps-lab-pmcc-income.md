# Spec 59: LEAPS Lab + PMCC Income finder (daily scan)

## What it does
A daily scan ranks the best LEAPS to buy and the best PMCC setups, and the
Options page gains two decision tools built on it:

1. **LEAPS Lab** — for a ticker, a grid of *what the LEAPS contract returns*
   with **time on the X axis** (quarters from today through expiry: 3m, 6m,
   9m, 12m, 15m, …, At expiry) and **stock move on the Y axis** (−30%, −20%,
   −10%, 0%, +10%, +20%, +30%, +50%, +100%). Each cell shows return % vs the
   contract's midpoint and the modelled contract value. The user can pin
   tickers, add their own strikes, and compare two strikes side by side.
   Pins, added strikes and the recommendation (strike, expiry, mid, IV,
   score, why) at pin time are persisted.
2. **PMCC Income** — for a capital budget (default $20,000), rank PMCC setups
   by monthly income: spreads affordable, est. monthly and annual income,
   annualized ROC, and an exact per-spread breakdown of the LEAPS leg vs the
   short-call leg (debit, credit, breakeven, spread width, max profit at
   short expiry, IV, OI, DTE).

Both must beat the attached Muse reference: same information, tighter
hierarchy, refresh design language, mobile-first.

## What it does NOT do
- No new market-data provider. Tradier chains via `@/lib/market/yahoo`
  (`getQuote`, `getAllOptionsChains`) and `tradierGetExpirations` /
  `tradierGetOptionsChain` from `@/lib/market/tradier`.
- No LLM calls in the scan (the "why it ranks" line is derived from the
  factor scores). Keep it deterministic and cheap.

## Math (`src/lib/options/leaps-grid.ts`, pure, no I/O)
- Black–Scholes call price `bsCall(S, K, T, r, sigma)` with `r = 0.04`,
  `sigma` = the contract's IV (fraction) held constant ("IV held at each
  contract's latest value"); at T=0 use intrinsic `max(S−K,0)`.
- `buildLeapsGrid({ spot, strike, expiry, mid, iv, now })` → `{ columns:
  {label, months, yearsToExpiryRemaining}[], rows: {movePct, price,
  cells:{value, returnPct}[]}[] }`. Columns are every 3 months from now up
  to expiry, plus `At expiry`. Cap at 8 columns.
- `scoreLeaps({ quote, contract, technicals? })` → composite 0–100 from
  four factors with weights: liquidity 40% (OI, volume, bid/ask spread %),
  moderate IV 25% (best 0.35–0.65, penalise >1.0), momentum 25% (price vs
  50/200 SMA, changePct), 52-week proximity 10% (closer to high = better).
  Return `{ score, factors: {key,label,score,weight}[], why: string }`. `why`
  names the two strongest factors ("GOOG stands out for strength near its
  52-week high and positive price momentum…").
- `recommendStrikes(spot, calls)` → `{ recommended, itm, otm }` from one
  LEAPS expiry (the one closest to 15–18 months out, 365–730 DTE): recommended
  = delta ≈ 0.70 (fall back to strike ≈ 0.85×spot when delta missing), itm =
  delta ≈ 0.80, otm = delta ≈ 0.50. Each carries strike, expiry, dte, bid,
  ask, mid, iv, delta, openInterest, volume.

## PMCC income math (`src/lib/options/pmcc-income.ts`, pure)
Input: a `PMCCCandidate` (from `findPMCCSetups`) + `budget`.
Output per setup: `netDebitPerSpread` (=(leapsMid − shortMid)×100),
`spreads = floor(budget / netDebitPerSpread)`, `deployed`, `creditPerSpread`
(shortMid×100), `monthlyIncome` (credit × spreads × 30/shortDte), annual =
×12, `arocPct` = annual/deployed, `breakeven` = leapsStrike + netDebit,
`spreadWidth` = shortStrike − leapsStrike, `maxProfitAtShortExpiry` =
(spreadWidth − netDebit)×100 per spread (floor 0), `pmccScore` 0–100
(annualized ROC 50%, LEAPS delta closeness to 0.75 20%, liquidity 20%, short
DTE in 21–50 10%), `why`. Rank by score, tie-break monthly income. Setups
whose net debit exceeds the budget are still returned (spreads = 0) but sort
last.

## Daily scan (`src/lib/options/leaps-scan.ts`)
`runLeapsPmccScan()` scans `DEFAULT_UNIVERSE` from `csp-scanner.ts` plus
`SCAN_UNIVERSE` from `@/lib/analysis/movers` (deduped) in batches of 5 with a
500ms pause (copy the `settledBatch` pattern). For each symbol: quote, the
LEAPS expiry per `recommendStrikes`, and — for PMCC — `findPMCCSetups` on
the full call chain. Keep the top 25 LEAPS by score and top 30 PMCC setups by
pmccScore (one per ticker for LEAPS; up to 2 per ticker for PMCC). Persist
one row in `leaps_scans` (see DB). Runtime target < 4 min (`maxDuration =
300`).

## DB (`supabase/migrations/20260909000000_leaps_lab.sql`)
```sql
create table if not exists leaps_scans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scan_type text not null default 'scheduled',
  universe_size int not null default 0,
  leaps jsonb not null default '[]'::jsonb,   -- LeapsPick[]
  pmcc jsonb not null default '[]'::jsonb,    -- PmccIncomePick[] (budget-independent fields)
  errors jsonb not null default '[]'::jsonb,
  status text not null default 'completed'
);
create index if not exists idx_leaps_scans_created_at on leaps_scans (created_at desc);
alter table leaps_scans enable row level security;
create policy "auth read leaps_scans" on leaps_scans for select to authenticated using (true);
create policy "service all leaps_scans" on leaps_scans for all to service_role using (true) with check (true);

create table if not exists leaps_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  expiry date not null,
  recommended jsonb not null default '{}'::jsonb, -- {strike,mid,iv,delta,score,why,capturedAt, itm:{...}, otm:{...}}
  strikes jsonb not null default '[]'::jsonb,     -- [{strike,label,addedAt}]
  compare_strike numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);
alter table leaps_pins enable row level security;
create policy "own leaps_pins" on leaps_pins for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "service all leaps_pins" on leaps_pins for all to service_role using (true) with check (true);
```
DB access only in `src/lib/db/leaps.ts` (use `supabaseAdmin` for scans, the
user-scoped client from `@/lib/supabase-server` for pins as `positions.ts`
does).

## API
- `GET /api/cron/leaps-pmcc` — CRON_SECRET bearer (copy the guard from
  `api/cron/csp-hunter`), runs the scan, `maxDuration = 300`.
- `GET /api/leaps` — auth; `{ scan: latest row | null, pins: LeapsPin[] }`.
  `POST /api/leaps` — auth; body `{ action: "run" }` runs the scan on demand
  (wrap in `runTracked` from `@/lib/jobs/tracker`, kind `leaps-scan`).
- `POST /api/leaps/pins` — auth; `{ symbol, expiry?, recommended? }` upsert
  (when `recommended` is omitted, server fills it from the latest scan or by
  pricing the chain live). `DELETE /api/leaps/pins?symbol=` unpin.
  `PATCH /api/leaps/pins` — `{ symbol, addStrike?, removeStrike?,
  compareStrike?, notes? }`.
- `GET /api/leaps/grid?symbol=GOOG&expiry=2028-01-21&strikes=145,165` —
  auth; prices each strike from the live chain for that expiry (bid, ask,
  mid, iv, delta, OI; `unavailable: true` when the strike is not listed or
  has no mid) and returns `buildLeapsGrid` per priced strike plus `chainAsOf`.
  Cache 5 min per (symbol, expiry) with `unstable_cache` or an in-memory map.
- `GET /api/pmcc-income?budget=20000` — auth; reads the latest scan's `pmcc`
  and applies `pmcc-income.ts` for the budget. No chain calls.

## UI (refresh design only; classic/HOOD untouched)
`src/app/(app)/plays/refresh/ScannerScreen.tsx` — when `strategy` is `leaps`
render `<LeapsLab />`, when `pmcc` render `<PmccIncome />`, in place of the
sector chips / status block / setup list (keep the header and the segmented
switch). Read the initial strategy from the `?s=` search param
(`useSearchParams`, wrapped in `Suspense`) so `/plays?s=leaps` deep-links.

`src/app/(app)/plays/refresh/leaps/LeapsLab.tsx` (+ small files under that
folder, each < 400 lines):
- Top: `DAILY SCAN · {age}` eyebrow, a `Rescan` control (POST run), then a
  horizontal chip row of **pinned tickers** (amber outlined chips, first is
  selected) followed by an `+ Pin` chip which opens a ticker input (use
  `TickerSearch` from `@/components` if it fits, else a mono input).
- **Ranked list**: top LEAPS picks from the scan as compact rows (`DataRow`
  from `@/components/refresh`): rank, symbol, structure line
  `Long 145C Jan'28 · 0.71Δ · $210.50`, right value = composite score with
  eyebrow `SCORE`; tapping a row selects it (and offers Pin).
- **Selected ticker panel** (pinned or selected):
  - Head: eyebrow `PINNED TICKER` / `SCAN PICK`, symbol + spot price (mono),
    name · `LEAPS expiry 2028-01-21`, composite score in an amber circle.
  - `Why it ranks:` one line.
  - Four factor `MetricBar`s (Liquidity, Moderate IV, Momentum, 52-week
    proximity) with `score · weight%` on the right.
  - **Strike scenarios**: chips `Recommended $145`, `ITM $165`, `OTM $135`,
    plus user-added strikes (with ×), first chip = primary. `Compare with`
    select listing every other strike. `Add another listed strike` numeric
    input + `Save strike` (PATCH). Unavailable strikes render a hairline
    notice with `Retry`.
  - Stat tiles: primary bid/ask, primary mid, primary IV, compare strike,
    compare mid, chain as-of.
  - **Strike comparison grid**: for the primary and (if set) compare strike,
    a table: first column stock move (`+20%` bold, price under it), then one
    column per quarter; each cell: return % (mono 13px 600, `--up`/`--down`,
    tinted `--up-bg`/`--down-bg` cell background whose alpha scales with
    |return| capped at 100%) and the contract value under it (mono 10px dim).
    Wide table scrolls horizontally inside its own container; the first
    column is sticky. Render the two grids stacked with a `Primary · $145` /
    `Compare · $165` heading, and a third small **Δ grid** (primary − compare
    return, per cell) so the decision is one glance.
  - Persist: pin/unpin, added strikes, compare strike, notes (a one-line
    textarea, saved on blur).

`src/app/(app)/plays/refresh/pmcc/PmccIncome.tsx` (+ files):
- Head block: eyebrow `INCOME SCENARIO`, title `PMCC candidates`, subtitle
  `Long-dated ITM call paired with a 21–50 DTE short call.`, right-aligned
  `Capital budget` mono `$` input (default 20000, persisted in
  localStorage key `stonkbro:pmcc-budget`).
- `RANKED FOR INCOME` · `Top N PMCC setups` · `$20,000 budget · tap to sort`.
  Table columns: Rank, Ticker / setup (`$50 / $70`), Debit (per spread),
  Monthly (with `7 spreads` sub), AROC (annualized), Score (sortable; the
  active sort shows an arrow). Row tap expands the detail card:
  - `#1 PMCC CANDIDATE` eyebrow, `RKLB $65.87`, name · `diagonal call
    spread`, `PMCC score` circle.
  - `Why it ranks:` line.
  - Two big tiles: Est. monthly income (`7 spreads · $18,067 deployed`),
    Est. annual income (`212.5% annual return on deployed capital`).
  - Two leg cards: `BUY LONG LEAPS` ($50 call, expiry · DTE, Midpoint, IV,
    Open interest) and `SELL NEAR-TERM CALL` ($70 call, expiry · DTE,
    Credit, Monthly / spread, Open interest).
  - Six-cell stat grid: Net debit / spread, Annual income / spread,
    Annualized ROC, Breakeven, Spread width, Max profit at short expiry.
  - `▸ How the income estimate works` disclosure with the formula in words.
  - Actions: `Add to portfolio` (existing `/positions/new?…` deep link as
    `pmccSetup()` in `scanner-data.ts` builds) and `Research`.
- Empty state when no scan yet: one line + `Run scan` button.

Use only refresh tokens (`var(--surface-1)`, `var(--hairline)`, `var(--up)`,
`var(--accent)`, `refresh-mono`, `refresh-eyebrow`, `refresh-heading`,
`MonoNumber`, `MetricBar`, `DataRow`, `ChipRow`, `StatTile`). Numbers
tabular. Touch targets ≥ 44px. No shadows.

## Files
| File | Action |
|---|---|
| `src/lib/options/leaps-grid.ts` | Create — BS pricing, grid, scoring, strike recommendation |
| `src/lib/options/pmcc-income.ts` | Create — budget math + score |
| `src/lib/options/leaps-scan.ts` | Create — daily scan |
| `src/lib/db/leaps.ts` | Create — scans + pins |
| `supabase/migrations/20260909000000_leaps_lab.sql` | Create |
| `src/app/api/cron/leaps-pmcc/route.ts` | Create |
| `src/app/api/leaps/route.ts`, `src/app/api/leaps/pins/route.ts`, `src/app/api/leaps/grid/route.ts`, `src/app/api/pmcc-income/route.ts` | Create |
| `src/app/(app)/plays/refresh/ScannerScreen.tsx` | Modify — delegate leaps/pmcc, `?s=` param |
| `src/app/(app)/plays/refresh/leaps/*.tsx`, `src/app/(app)/plays/refresh/pmcc/*.tsx` | Create |

Do NOT edit `vercel.json`, `CHANGELOG.md`, `README.md`, `docs/`,
`src/components/BottomNav.tsx`, `src/components/more-nav-data.tsx`,
`src/middleware.ts` — the lead wires those.

## Acceptance
- [ ] `buildLeapsGrid` for a 0% move at the first column returns ≈ −0..−3% (theta only) and at expiry equals intrinsic − mid.
- [ ] Pinning GOOG, adding strike 335, setting compare, reloading — all persist.
- [ ] `/plays?s=pmcc` opens the income finder; changing budget re-ranks without a network call.
- [ ] `npx tsc --noEmit` and `npx eslint` clean on touched files.
