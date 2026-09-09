# Spec 60: Paper Trading — 10 bots, $100K each, trading every session

## What it does
Ten paper-trading profiles, each with a clearly written plan, start today
(2026-09-08) with **$100,000 cash and a $200,000 margin line**. Three times
every trading day (open, midday, close) a cron marks every account to
market with live quotes/chains, lets each profile act on its rules, fills the
orders at the quoted price, and persists everything. At the close it writes a
daily snapshot per profile plus end-of-day notes (highlights, learnings, a
short narrative) and a desk-wide note. The UI is a leaderboard of the ten
bots and a per-bot portfolio view for any day.

## What it does NOT do
- No real orders. No new data provider — quotes/history/chains come from
  `@/lib/market/*` (Tradier with mock fallback: `getQuotes`,
  `getAllOptionsChains` from `@/lib/market/yahoo`; `getHistory` from
  `@/lib/market/history`; `tradierGetExpirations` / `tradierGetOptionsChain`
  from `@/lib/market/tradier` when you need one expiry only — guard with
  `process.env.TRADIER_API_TOKEN` and fall back to `getAllOptionsChains`).
- No intraday bars: a session fills at the quote at run time.

## The ten profiles (`src/lib/paper/profiles.ts`)
Every profile: `id`, `name`, `tagline`, `style` tags (`stocks` | `options` |
`mixed`, `margin` | `no-margin`, `index` | `growth` | `income` …), a `plan`
(5–8 plain-English bullet rules shown verbatim in the UI), `universe`,
`params`. Model each plan exactly as written:

1. **`index-dca` · Index DCA** — stocks, no margin. Every open buys $5,000
   split SPY 60 / QQQ 30 / IWM 10. If SPY is down more than 1% on the day at
   the close run, buys another $5,000 the same way. Never sells. Once cash
   runs out, holds.
2. **`sector-rotator` · Sector Rotation** — stocks, no margin. Universe: the
   11 SPDR sector ETFs (XLK XLC XLY XLP XLE XLF XLV XLI XLB XLRE XLU). Every
   Monday open (or the first session of the week) ranks by 20-day return and
   holds the top 3 equal-weight, fully invested. Sells whatever dropped out.
3. **`megacap-momentum` · Mega-cap Momentum** — stocks, no margin. Universe:
   AAPL MSFT NVDA GOOGL AMZN META TSLA AVGO ORCL NFLX COST LLY JPM V MA AMD
   PLTR CRM ADBE NOW. Buys names above both the 50- and 200-day SMA with a
   positive 20-day return, up to 8 positions at 12.5% each; 8% trailing stop
   from the highest close since entry; exits on a close below the 50-day SMA.
4. **`margin-bull` · Margin Bull** — stocks, margin. Same signal as
   Mega-cap Momentum, but 5 positions at 32% of equity each (≈1.6× gross
   exposure, borrowing up to $60K); 7% trailing stop; if equity falls under
   $85K it sells the weakest position until borrowing is zero. Margin
   interest 8% APR accrues daily on the borrowed balance.
5. **`dip-buyer` · Dip Buyer** — stocks, no margin. Universe:
   `DEFAULT_UNIVERSE` from `@/lib/options/csp-scanner` minus ETFs. Buys
   $10,000 of any name down ≥5% on the day or with 14-day RSI < 35, max 6
   open positions, one entry per name per week. Sells at +6%, at −8%, or
   after 10 trading days, whichever first.
6. **`put-seller` · Naked Put Seller** — options, margin. Universe: the 25
   most liquid names in `DEFAULT_UNIVERSE` under $400. Sells 0.15–0.25 delta
   puts, 21–45 DTE, targeting 8 open positions, 1 contract per $10K of
   strike notional; margin requirement per contract = max(20% × spot − OTM
   amount, 10% × strike) × 100 + premium, never exceeding buying power. Buys
   back at 50% of the credit, at 21 DTE, or when the put's delta exceeds
   0.50 (then immediately sells a new one).
7. **`wheel` · The Wheel** — options, no margin. Five names under $200 from
   the put-seller universe; sells one 0.30-delta 30–45 DTE cash-secured put
   per name (collateral = strike × 100, must fit in cash). On assignment
   takes the shares and sells a 0.30-delta 30-DTE covered call above cost;
   when called away, starts over with a put.
8. **`pmcc-operator` · PMCC Operator** — options, no margin. Five names
   from the PMCC universe (`SECTORS` tickers from `@/lib/market/sectors`
   with price $30–$400): buys one ~0.75-delta LEAPS 12–18 months out per
   name (≤ $15K each), then sells a 0.25-delta ~30-DTE call struck above
   LEAPS strike + net debit. Buys the short call back at 50% profit or 7 DTE
   and re-sells; closes the LEAPS if its delta drops under 0.55.
9. **`spy-condor` · SPY Weekly Iron Condor** — options, margin. Every Monday
   (first session of the week) sells a 0.15-delta put spread and a
   0.15-delta call spread on SPY, $5 wide, 7–10 DTE, sizing so max loss ≤ 2%
   of equity. Closes the whole condor at 50% of the credit, at 2× the credit
   as a loss, or lets it expire.
10. **`growth-shadow` · Growth Shadow (iofund-style)** — mixed, margin. A
    concentrated 8-name growth basket used as a *proxy* for a public growth
    fund (say so in the tagline: holdings are a proxy, not the fund's actual
    book): NVDA TSLA PLTR AMD RKLB HOOD COIN ASTS. Equal weight at start and
    on the first session of each month. On any day the basket is down more
    than 3% it adds 25% of equity across the basket on margin; when equity is
    up 10% from the last rebalance it sells down to zero borrowing.

## Simulated broker (`src/lib/paper/broker.ts`, pure functions over state)
- Account: `cash` (negative = borrowed, floor −200,000), `marginLimit`
  200,000, `equity = cash + Σ position value`, `buyingPower = cash + limit −
  optionMarginHeld`. Reject orders that would exceed buying power (log the
  rejection as a trade with `status: rejected`).
- Fills: stocks at the quote `price`; options at the `mid`, moved toward the
  bid/ask by 25% of the spread against the trader. Commission $0 stocks,
  $0.65 per option contract (track `fees`).
- Marks: stocks at `price`; options at the chain mid for the same
  strike/expiry when the chain is available, otherwise Black–Scholes with the
  IV stored at entry (put `bsCall`/`bsPut` in `src/lib/paper/pricing.ts`; a
  LEAPS grid module in `src/lib/options/leaps-grid.ts` may appear from
  another task — do not depend on it).
- Expiry: on the close run of an expiry date, settle: ITM short put →
  assignment (buy 100 × strike); ITM short call with shares → called away;
  ITM long options → sell at intrinsic; OTM → expire worthless.
- Margin interest: 8% APR / 365 on any negative cash, charged at the close.
- Every fill, settlement, interest charge and rejection is a `paper_trades`
  row with a `reason`.

## Engine (`src/lib/paper/runner.ts`)
`runPaperSession({ session: "open" | "midday" | "close", date? })`:
1. Upsert the 10 profiles into `paper_profiles`; create missing
   `paper_accounts` with 100,000 cash and `started_on = today`.
2. Collect every symbol any profile may touch, fetch quotes once
   (`getQuotes`), history once per symbol that needs SMA/RSI/momentum
   (`getHistory(symbol, 220)`, cached per run in a Map).
3. For each profile in order: mark positions → settle expiries (close only)
   → `strategy.decide(ctx)` → fill orders → persist positions/trades/account.
   One profile failing must not stop the others (catch, log to
   `paper_runs.log`).
4. Write a `paper_snapshots` row per profile for this session (equity, cash,
   margin used, positions value, day P&L vs the previous close snapshot,
   total P&L, return %, marked positions jsonb).
5. Close only: `notes.ts` builds per-profile highlights/learnings from the
   day's trades and marks (deterministic), then ONE batched
   `generateText` call (feature `paper-notes`, ~1,200 max tokens, JSON out:
   `{ profiles: {id, narrative}[], desk: string }`) for narratives; on any
   AI failure store the deterministic notes with `narrative = null`. Insert
   `paper_notes` rows (one per profile + one with `profile_id null` for the
   desk).
6. Record `paper_runs` (status, ms, per-profile summary, errors).
Idempotent: running the same session twice on the same day marks again but
does not re-trade (check `paper_runs` for a completed row for
(date, session) and skip decisions; snapshots upsert).
`maxDuration = 300`.

Strategies live in `src/lib/paper/strategies/` — one file per family
(`dca.ts`, `rotation.ts`, `momentum.ts` parameterised for both momentum bots,
`dip.ts`, `puts.ts` for put-seller and wheel, `pmcc.ts`, `condor.ts`,
`shadow.ts`) exporting `decide(ctx: StrategyContext): Order[]`. The context
exposes account, open positions, quotes, `history(symbol)`, indicator helpers
(`sma`, `rsi14`, `returnPct(days)`), `findOption({symbol, type, targetDelta,
minDte, maxDte, minStrike?, maxStrike?})`, `session`, `date`, `isFirstSessionOfWeek`,
`isFirstSessionOfMonth`. Keep every file under 400 lines.

## DB (`supabase/migrations/20260909000100_paper_trading.sql`)
Tables: `paper_profiles` (id text pk, name, tagline, style text[], plan
text[], params jsonb, universe text[], created_at), `paper_accounts`
(profile_id text pk references paper_profiles, cash numeric, margin_limit
numeric default 200000, realized_pnl numeric default 0, fees numeric default
0, interest numeric default 0, started_on date, updated_at),
`paper_positions` (id uuid pk, profile_id, symbol, kind text check in
('stock','call','put'), side text check in ('long','short'), qty int,
strike numeric, expiry date, avg_price numeric, opened_at timestamptz,
closed_at timestamptz, close_price numeric, realized_pnl numeric, status
text default 'open', meta jsonb default '{}'), `paper_trades` (id uuid pk,
profile_id, ts timestamptz, trade_date date, session text, symbol, kind,
action text, qty int, price numeric, strike numeric, expiry date, amount
numeric, fees numeric default 0, reason text, position_id uuid, status text
default 'filled'), `paper_snapshots` (id uuid pk, profile_id, snap_date date,
session text, equity, cash, margin_used, positions_value, day_pnl,
total_pnl, total_return_pct, positions jsonb, created_at, unique
(profile_id, snap_date, session)), `paper_notes` (id uuid pk, profile_id
text null, note_date date, highlights text[], learnings text[], narrative
text, stats jsonb, created_at, unique nulls not distinct (profile_id,
note_date)), `paper_runs` (id uuid pk, run_date date, session text,
started_at, finished_at, status, log jsonb, unique (run_date, session)).
Indexes on (profile_id, snap_date), (profile_id, trade_date), (profile_id,
status). RLS: authenticated read on all; service_role all. All access
through `src/lib/db/paper.ts` using `supabaseAdmin`.

## API
- `GET /api/cron/paper?session=open|midday|close` — CRON_SECRET bearer
  guard (copy from `api/cron/csp-hunter`), calls `runPaperSession`.
- `POST /api/paper/run` — body `{ session }`; allowed for admins
  (`isAdmin` from `@/lib/db/admin`) or CRON bearer. Wrap in `runTracked`
  (`@/lib/jobs/tracker`, kind `paper-session`).
- `GET /api/paper` — public read: `{ asOf, session, profiles: [{ profile,
  account, latest snapshot, series: last 40 close snapshots {date, equity},
  dayPnl, totalReturnPct, openPositions }], desk: today's desk note | null,
  lastRun }`.
- `GET /api/paper/[profileId]?date=YYYY-MM-DD` — public read: profile,
  account, the snapshot for that date (latest session, default today or the
  latest available), open positions (from the snapshot's marked positions),
  trades for that date, notes for that date, equity series, available dates.

## UI (`src/app/(app)/paper/`)
Refresh design language only (`var(--surface-1)`, hairlines, `refresh-mono`,
`refresh-eyebrow`, `MonoNumber`, `DataRow`, `Sparkline`, `HeroChart`,
`StatTile`, `SegmentedSwitch`, `ChipRow` from `@/components/refresh`).
Mobile-first, max-w-2xl centred like the rest of the app. Client
components fetch through `cachedFetchJson` (`@/lib/client-cache`) with
short TTLs.

- **`/paper` (leaderboard)** — title `Paper`, eyebrow `{date} · {session}
  RUN` (or `NO RUN YET`), a hero `MonoNumber` of the combined P&L across the
  ten with `10 BOTS · $1.0M START` under it, a `TODAY | TOTAL` segmented
  switch, then ten `DataRow`s ranked by the chosen metric: rank, name,
  caption = tagline, badges = style tags (≤2), sparkline of the equity
  series, value = return % (up/down colour), subValue = equity. A collapsed
  `Desk notes` block under the switch shows today's desk narrative. Admin
  sees a `Run session` control (open/midday/close) that POSTs `/api/paper/run`
  and shows the job progress; everyone sees `Last run 2h ago`.
- **`/paper/[profileId]`** — head: name, tagline, style badges, the
  composite return in the amber circle, `The plan` disclosure listing the
  plan bullets. Stat tiles: Equity, Cash, Margin used, Day P&L, Total P&L,
  Win rate (closed trades). `HeroChart` of equity since start. Day picker
  `ChipRow` of the available dates (latest first). **Positions** list
  (symbol, structure line `100 sh @ 187.20` / `−1 250P 17 Oct · 0.22Δ`,
  mark, P&L $ and % coloured). **Trades** for the day (time, action,
  qty@price, reason). **Notes** for the day: highlights, learnings,
  narrative. Back link to `/paper`.
- The bottom-nav Paper tab and the home tile are wired by another task —
  do not edit `BottomNav.tsx`, `more-nav-data.tsx`, `middleware.ts`,
  `vercel.json`, `CHANGELOG.md`, `README.md`, `docs/`.

## Files
| File | Action |
|---|---|
| `src/lib/paper/{types,profiles,pricing,indicators,market,broker,runner,notes}.ts` | Create |
| `src/lib/paper/strategies/*.ts` | Create |
| `src/lib/db/paper.ts` | Create |
| `supabase/migrations/20260909000100_paper_trading.sql` | Create |
| `src/app/api/cron/paper/route.ts`, `src/app/api/paper/route.ts`, `src/app/api/paper/run/route.ts`, `src/app/api/paper/[profileId]/route.ts` | Create |
| `src/app/(app)/paper/page.tsx`, `src/app/(app)/paper/[profileId]/page.tsx`, `src/app/(app)/paper/*.tsx` | Create |

## Acceptance
- [ ] `runPaperSession({session:"open"})` on a fresh DB creates 10 accounts and places first-day orders for every profile without throwing (mock data mode must work with no Tradier token).
- [ ] Re-running the same session is a no-op for trades.
- [ ] Leaderboard renders ten rows with sparklines; profile page shows positions, trades, notes for a chosen day.
- [ ] `npx tsc --noEmit` and `npx eslint` clean on touched files.

---

# Spec 60a: The desk grows up — personas, memory, funding, floors, backfill

Shipped in v0.41.0, on top of everything above. Nothing in the original spec
was replaced: the ten profile ids, the broker, the session model and the DB
tables are unchanged. This section is additive.

## Personas (`src/lib/paper/identity.ts`)
`profiles.ts` keeps the rulebook — universe, params, the written plan.
`identity.ts` keeps the character, keyed by profile id: a `role` label (two or
three words under the name), a `creed` (the bot's founding belief), a `hue`
(rank chip and selection tint), and a `face` config. A profile with no entry
falls back to a neutral face and its own tagline, so nothing breaks when a
profile is added.

Display names changed; **every `profile_id` is unchanged**, so accounts,
positions, trades, snapshots and notes carry over with no data migration:

| id | Name | Role |
|---|---|---|
| `index-dca` | Atlas | Index only |
| `sector-rotator` | Compass | Sector rotation |
| `megacap-momentum` | Northstar | Mega-cap momentum |
| `margin-bull` | Booster | Leveraged momentum |
| `dip-buyer` | Salvage | Dip buying |
| `put-seller` | Breakwater | Naked puts |
| `wheel` | Wheelhouse | The wheel |
| `pmcc-operator` | Longview | LEAPS and short calls |
| `spy-condor` | Canopy | Weekly iron condor |
| `growth-shadow` | Vector | Growth basket |

`src/components/paper/BotAvatar.tsx` draws the portrait as inline SVG from the
face config (disc, shirt, skin, hair style, accessory, beard). No image
assets, no CDN, no new dependency.

## Memory (`src/lib/paper/memory.ts`, table `paper_memory`)
Separate from the daily `paper_notes`: notes are what happened today, memory
is what the bot carries. Six kinds:

| Kind | What it captures |
|---|---|
| `creed` | The founding belief. Never earned, never lost. |
| `conviction` | A belief the record keeps confirming. |
| `lesson` | Something learned from how a trade went. |
| `scar` | A loss worth not repeating. |
| `streak` | A run of days in one direction. |
| `milestone` | An equity or trade-count threshold crossed. |

Migration `supabase/migrations/20260909010000_paper_memory.sql` (applied):
`paper_memory` (id uuid pk, profile_id text references `paper_profiles` on
delete cascade, kind text checked against the six values, headline text,
detail text, weight numeric default 1, hits int default 1, first_seen date,
last_seen date, stats jsonb, created_at) with `unique (profile_id, kind,
headline)` and an index on (profile_id, last_seen desc). RLS: authenticated
read, service_role manage — the same shape as the other `paper_*` tables.

Memories are derived from each close and upserted on the unique key:
re-observing one bumps `hits` and `last_seen` instead of inserting a
duplicate, so a repeated lesson gets heavier rather than the list getting
longer. The runner writes memories after the close session.

**Hard rule: memory is never read back into order generation.** Strategies
decide from quotes, history and account state exactly as before. Memory is
character, not signal.

## Buying power (`src/lib/paper/funding.ts`)
The original spec logged a rejected order and moved on, which is not what a
trader does. Every profile now shares one behaviour: an order refused for
buying power closes the weakest thing already on the book, then retries.
"Weakest" is the worst unrealised return across candidates. Two guards, both
absolute:

1. Nothing closes that would leave a short call uncovered — shares backing a
   covered call and the long LEAPS under a PMCC are untouchable while the
   short call is open.
2. Multi-leg structures close as a whole; a single wing is never lifted off a
   condor.

Both the funding sale and the funded trade record `reason` text saying what
happened. `src/lib/paper/engine.ts` executes closing orders before opening
ones, so a bot's own exits free capital within the same session.
`scripts/validate-paper-funding.ts` asserts the behaviour across 14 checks.

## Equity floors
- **Vector** (`growth-shadow`) previously added 25% of equity on margin on
  every 3% basket drop with no limit. It now stops adding within 5% of an
  **$85,000 equity floor**, never borrows more than **50% of equity**, and
  sells down to zero borrowing under the floor.
- **Breakwater** (`put-seller`) stops opening new puts under the same $85,000
  floor.

## Backfill harness (local only)
No provider serves a historical option chain, so the harness models one.
`src/lib/paper/synthetic.ts` prices chains with Black–Scholes off realised
volatility from the bars. `src/lib/paper/backfill.ts` replays past sessions
**entirely in memory** against recorded daily bars and never touches Supabase.
`src/lib/paper/invariants.ts` holds the safety checks shared by the validator
and the report.

| Script | Purpose |
|---|---|
| `scripts/paper-fetch-bars.ts` | Cache the daily bars a window needs |
| `scripts/paper-backfill.ts` | Replay a window across all ten bots |
| `scripts/paper-report.ts` | Write the HTML + Markdown report |
| `scripts/validate-paper-invariants.ts` | Assert the engine's safety invariants |
| `scripts/validate-paper-funding.ts` | Assert the buying-power behaviour |

The harness is an analysis tool: it runs from `scripts/`, writes nothing to
the database, and is wired to no cron and no route. Synthetic chains are a
model, not recorded quotes — backfilled option results are indicative and are
not comparable to the live sessions the crons record. Output lives in
`reports/`.

## UI additions
- **`/paper`** — a ranked two-column board: avatar, rank number, persona name
  and role per bot, replacing the plain `DataRow` list.
- **`/paper/[profileId]`** — a hero with the avatar and creed, a four-cell
  stat strip, the equity chart beside a Rulebook card, and four counted tabs:
  **Soul**, **Positions**, **Trades**, **Journal**. Positions render as a
  table — position, type, qty, avg, mark, market value, unrealized.
- `GET /api/paper` returns identity per bot; `GET /api/paper/[profileId]`
  returns identity and memory alongside the existing payload. Both stay
  public reads.

## Files
| File | Action |
|---|---|
| `src/lib/paper/{identity,memory,funding,backfill,synthetic,invariants}.ts` | Create |
| `src/components/paper/BotAvatar.tsx` | Create |
| `supabase/migrations/20260909010000_paper_memory.sql` | Create |
| `scripts/paper-{fetch-bars,backfill,report}.ts`, `scripts/validate-paper-{invariants,funding}.ts` | Create |
| `src/lib/paper/{profiles,engine,broker,runner,market}.ts`, `src/lib/paper/strategies/{shadow,puts}.ts` | Edit |
| `src/lib/db/paper.ts`, `src/app/api/paper/route.ts`, `src/app/api/paper/[profileId]/route.ts` | Edit |
| `src/app/(app)/paper/PaperLeaderboard.tsx`, `src/app/(app)/paper/[profileId]/{ProfileScreen,ProfileSections}.tsx` | Edit |

## Acceptance
- [ ] Renaming the profiles changes no `profile_id`; existing accounts, positions and snapshots still resolve.
- [ ] Every bot renders an avatar, including one with no `identity.ts` entry (neutral fallback).
- [ ] Re-deriving the same memory on a second close bumps `hits` instead of inserting a row.
- [ ] No strategy module imports `memory.ts`.
- [ ] `scripts/validate-paper-funding.ts` passes all 14 checks; `scripts/validate-paper-invariants.ts` passes.
- [ ] A backfill run issues zero Supabase calls.
- [ ] `npx tsc --noEmit` and `npx eslint` clean on touched files.
