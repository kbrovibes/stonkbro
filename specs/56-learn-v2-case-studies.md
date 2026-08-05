# 56 — Learn v2: Real-Chain Case Studies

## Goal

A new "Case Studies" experience inside the Learn module (`/learn`), built **entirely from real
historical option-chain data** committed to this repo at `src/lib/learn/v2-data/`. It teaches
contract-level risk management — stop losses, stop limits, rolls, poor contract selection —
using the actual CSP/CC candidates the app's scanner surfaced between **2026-05-01 and 2026-08-05**.

## Data (already committed — DO NOT fabricate numbers)

`src/lib/learn/v2-data/{TICKER}.json`, one per ticker, plus `index.json` (manifest).

Shape per ticker file:

```jsonc
{
  "symbol": "PLTR",
  "universe": "traded" | "opportunity",
  "window": { "start": "2026-05-01", "end": "2026-08-05" },
  "prices": [ { "date", "open", "high", "low", "close", "volume" } ],   // 66 daily bars
  "snapshots": [                          // one per scan day the ticker appeared
    { "date": "2026-06-12",
      "puts":  [ { "symbol","strike","expiry","dte","bid","ask","mid","premium","delta","gamma","theta","vega","iv","rsi","aroc","volume","juiciness","priority","catalyst" } ],
      "calls": [ ...same fields, may include "score","maxLoss" ],
      "leaps": [ ... ] }
  ]
}
```

- **Traded universe (10)** — tickers the user actively holds / wheels: PLTR, SOFI, NBIS, MRVL,
  TSLA, TSM, ASTS, SNDK, META, RKLB.
- **Opportunity universe (5)** — tickers the user does NOT trade but the scanner repeatedly
  surfaced as strong CSP/CC candidates: NVDA, AMD, CRWD, HOOD, IWM. Frame these as
  "opportunities you weren't watching".

**Every number shown in a case study must be traceable to this dataset** (a snapshot row, a price
bar, or arithmetic on them, e.g. P&L = premium change, % OTM = strike vs close). Never invent
strikes, premiums, Greeks, or dates. Personal data (position sizes, cost basis, account P&L) must
NOT appear anywhere — this is a public repo.

## Requirements

### Content — per ticker, 5–10 case studies (aim for ≥5 strong ones; more only if data supports)

Mine the dataset for real setups. Case-study archetypes to look for (mix across each ticker):

1. **Stop-loss discipline** — a short put whose underlying subsequently fell hard (find via
   `prices`). Show the entry snapshot, then day-by-day what the position did, where a
   premium-based stop (e.g. 2×–3× credit) should have triggered, and the outcome with vs
   without the stop. Use later snapshots of the same/similar strike where available to show the
   premium actually blowing out.
2. **Stop-market vs stop-limit on options** — use real bid/ask spreads from snapshots (some are
   wide). Show how a stop-market fills through a wide spread vs a stop-limit that may not fill.
3. **Poor contract selection** — real candidates that were objectively bad entries: AROC too low
   for the collateral, delta too high for an income goal, DTE mismatched, entry right before a
   known catalyst, illiquid (low `volume`), spread too wide relative to mid.
4. **The good entry, verified** — high-`juiciness` candidates where the subsequent price path
   confirms the thesis: put expired OTM, annualized return realized. Show the full arc.
5. **Roll vs assignment decision** — snapshot sequences where a put went ITM: identify the day
   the decision had to be made, compare rolling (real later-dated snapshot premiums when
   available) vs taking assignment (price path afterwards).
6. **Covered-call strike regret** — on traded tickers that ripped (e.g. NBIS, ASTS windows),
   show how a too-tight call strike would have capped the move, vs a smarter strike/DTE choice.
7. **Premium/IV drift over time** — tickers with many snapshot days (IWM 176, AMD 111, NVDA
   105, MRVL 86) let you track comparable strikes across days: show theta decay and IV moves
   as an observed time series, not theory.

Each case study must have: **Setup** (real snapshot, dated) → **Decision point** (what would you
do?) → **What actually happened** (price path / later snapshots) → **Lesson** (one crisp
takeaway) → where natural, an **interactive element** (see below).

### Structure & UX

- New Learn track/section "Case Studies" alongside the existing v1 tracks; follow the existing
  curriculum structure (`src/lib/learn/curriculum.ts`, `src/lib/learn/content/*.ts`,
  `src/app/(app)/learn/[moduleId]/`). Extend, don't rewrite v1.
- Landing view: ticker grid (badge for traded vs opportunity universe), each ticker → its case
  studies with difficulty/type tags.
- Reuse the interactive-component patterns from v1 (guided sandboxes, quizzes, exploreers from
  commits 6111f16 / ab131e6 / ffd54ba): e.g. "place the stop" interaction on a real price chart,
  "pick the better contract" A/B quiz using two real candidates, premium-decay scrubber.
- Charts: render the real `prices` series (lightweight inline SVG is fine; match existing Learn
  chart components). Mobile-first, Tailwind only.
- Track completion via existing `learn_progress` mechanism (`src/lib/learn/progress.ts`).

### Offline (see also spec 57)

Learn v2 must be fully offline-capable: content and dataset are statically imported /
RSC-rendered and pre-cached exactly like v1 lessons (see commit 4b73fd3 pattern + `public/sw.js`).
No runtime fetches for case-study content.

### Non-goals

- No live market data in case studies. No AI generation at runtime. No new env vars. No DB
  schema changes (reuse `learn_progress`).
