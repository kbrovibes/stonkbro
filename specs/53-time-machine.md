# 53 — Time Machine

A portfolio "what-if" simulator: pick a date in the past, freeze your holdings at
that moment, then simulate what they'd be worth today assuming you'd stopped
trading entirely after that point. Surfaces the opportunity cost (or savings) of
every trade you've made since.

## Goal

Answer: **"What would my portfolio be worth today if I had stopped trading on
date X?"**

Compare that hypothetical against the real current portfolio. Color-code the
delta. Highlight the two cash-flow events that complicate the comparison:
post-snapshot **deposits** (cash that would still be sitting in the account) and
post-snapshot **withdrawals** (which would have had to be funded elsewhere).

## Non-goals (v1)

- Tax-lot accuracy on the snapshot reconstruction.
- Recreating the order book for option pricing on expiry dates.
- Margin / buying-power simulation.
- Splits handled approximately (Tradier history is split-adjusted; raw share
  counts from SnapTrade activity are not — we apply the ratio at simulation).
- Mid-period dividend reinvestment plans (DRIP).
- Spinoffs, mergers, symbol changes.

## User flow

1. User opens **Time Machine** (linked from More → Portfolio group).
2. Default date is ~6 months ago, capped at "today − 7 days".
3. User picks a date, taps **Simulate**.
4. Page renders:
   - Snapshot summary: holdings + cash on that date.
   - Simulated total today vs actual total today.
   - Big delta hero stat (green = would-be ahead, red = would-be behind).
   - Holdings table: snapshot units × today's price.
   - **Deposits since snapshot** highlight (warm yellow): kept as cash in sim.
   - **Withdrawals since snapshot** highlight (warm orange): tracked but NOT
     subtracted — labeled "Would need to fund elsewhere: $X".
   - Notes section listing assumptions and any options that expired.

## Data sources

- **SnapTrade `getAccountActivities`** — full transaction log. Already wired in
  `src/lib/snaptrade/client.ts`. For Time Machine we fetch with
  `startDate=2010-01-01` to get whatever history SnapTrade has.
- **Tradier `/markets/history`** — split-adjusted daily OHLC. Already wired in
  `src/lib/market/history.ts`. Used for today's price on each held symbol.
  (Today's price alternately from `getQuotes`.)
- **No new env vars required.**

## Algorithm

### Step 1 — Reconstruct positions at snapshot date

```
positions = {}  // symbol -> { units, costBasisRunning }
options   = {}  // contract key -> { units, premiumCollected }
cash      = 0

for tx in transactions sorted by date ascending:
  if tx.date > snapshotDate: break

  switch tx.type:
    "BUY":            positions[sym].units += tx.units; cash -= tx.amount
    "SELL":           positions[sym].units -= tx.units; cash += tx.amount
    "DEPOSIT":        cash += tx.amount
    "WITHDRAWAL":     cash -= tx.amount
    "DIVIDEND":       cash += tx.amount
    "INTEREST":       cash += tx.amount
    "FEE":            cash -= tx.amount
    "OPTIONEXPIRATION": options[key].units = 0
    "OPTIONASSIGNMENT": apply per option_type/long-short rules to stock + cash
    "BUY" (option):   options[key].units += tx.units; cash -= tx.amount
    "SELL" (option):  options[key].units -= tx.units; cash += tx.amount
```

Result: snapshot of stock units, options units, and cash on `snapshotDate`.

### Step 2 — Categorize post-snapshot cash flows

For transactions where `tx.date > snapshotDate`:
- **Deposits** → add to simulated cash, listed in highlight section.
- **Withdrawals** → DO NOT subtract from simulated total. Push to "would need to
  fund elsewhere" list.
- **Dividends on still-held shares** → add to simulated cash. (Skip dividends on
  symbols sold before snapshot — those didn't happen in the sim.)
- **Interest** → add (would have accrued regardless).
- **Fees** → ignore for v1 (negligible).
- **BUY/SELL/OPTION* on or after snapshot** → ignore entirely. This is the whole
  point: simulate as if no trading occurred.

### Step 3 — Forward-simulate to today

- For each held stock: `value = units × Tradier today price`.
- For each held option:
  - If `expiry > today`: value at current market mid (use existing Tradier
    options-chain pricing, optional v1).
  - If `expiry <= today`: assume worthless. Long → already lost the premium
    (sunk on snapshot); short → premium kept (already in cash from sale).
- Sum: `simulatedTotal = stockValue + optionValue + simulatedCash`.

### Step 4 — Compare to actual

- `actualTotal = /api/portfolio` summary's `total_market_value + cash`.
- `delta = simulatedTotal - actualTotal`.
- `favorableToHold = delta > 0` → "you'd have $X more" (green).
- `unfavorableToHold = delta < 0` → "you'd have $X less" (red).

## API

```
GET /api/portfolio/time-machine?date=YYYY-MM-DD

200 OK
{
  snapshotDate: "2025-09-15",
  todayDate: "2026-05-29",
  snapshot: {
    positions: [{ symbol, units, costBasis, snapshotPrice }],
    options:   [{ ticker, underlying, type, strike, expiry, units }],
    cash: number,
    total: number,
  },
  simulation: {
    stockValues:   [{ symbol, units, todayPrice, value }],
    optionValues:  [{ ticker, status, value, note }],
    cashStart: number,
    deposits:     [{ date, amount }],
    withdrawals:  [{ date, amount }],   // tracked NOT subtracted
    dividends:    [{ date, symbol, amount }],
    interest:     [{ date, amount }],
    totalDepositsAdded: number,
    totalWithdrawalsFunded: number,     // tracked NOT subtracted
    total: number,                      // simulatedTotal
  },
  actual: { total: number },
  delta: { absolute: number, pct: number, favorableToHold: boolean },
  assumptions: [string],                // human-readable notes
}
```

## UI components

`src/app/(app)/time-machine/page.tsx`
- Date picker + Simulate button.
- HeroDelta: big colored number.
- SnapshotSummary card.
- ComparisonTable (stock-by-stock: snapshot units, today price, value).
- DepositsSection (warm yellow).
- WithdrawalsSection (warm orange, "would need to fund elsewhere $X").
- OptionsNotes section.
- AssumptionsNote at bottom.

Linked from MoreNav under **Portfolio** group.

## Open questions / risks

1. **Does SnapTrade return transactions from inception?** Untested. If it
   silently truncates to N years, the date picker upper-bound limit comes from
   the earliest returned transaction date. The page should disable dates older
   than the available data and show a banner: "Transaction history available
   back to YYYY-MM-DD".

2. **Are splits/spinoffs handled?** Tradier history is split-adjusted; SnapTrade
   raw share counts may also be retroactively adjusted by Fidelity. If a 4:1
   split occurred between snapshot and today and SnapTrade activity shows 100
   shares but the actual position is 400, we under-count. Mitigation: a
   per-symbol split factor calc using Tradier history split fields. v1 punts
   and notes the assumption.

3. **Long options that expired between snapshot and today.** v1 assumes
   worthless (caps the loss at premium paid). For ITM expiries this
   under-represents value — note in assumptions.

4. **Performance.** ~3 SnapTrade activity calls (one per account) + N Tradier
   quotes for held symbols + 1 Tradier batch quote for options. Should complete
   in <5s. Cache for 5 min on the API route.

## Feasibility

**Verdict: feasible to build now.** All data sources are available. Hardest
v1 trade-off is option expiry treatment, which we punt on cleanly with
documented assumptions. ~5 hours of implementation work, broken into ~18
atomic tasks (see backlog).
