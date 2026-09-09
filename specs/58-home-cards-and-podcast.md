# Spec 58: Home card grid + podcast back on Home and More

## What it does
The refresh Pulse home replaced the old ticker-card grid with a short movers
list. The user liked the old density: many tickers, each with a chart, in a
3–4 column card grid. This spec brings that back on the refresh home using the
refresh design language (surface-1 cards, hairline borders, mono numbers,
`Sparkline` primitive), and restores the Daily Briefing ("podcast") entry
point on the home screen and in the More menu.

## Home (`/home`, refresh style — the default)
Keep the existing header (title, date, market-status dot), index hero, breadth
bar and the three index tiles. Below them:

1. **Briefing card** — when the user has portfolio access and a briefing row
   exists (`getLatestBriefings(1)`), render a refresh-styled card linking to
   `/briefing`: `BriefingArt` thumbnail, eyebrow `TODAY'S BRIEFING`, title,
   summary (2-line clamp), minutes, amber play glyph. Also show it while
   `status === "running"` ("Preparing today's briefing…"). Guests / no access:
   nothing.
2. **Feature row** — 4 or 5 monochrome tiles (icon + label) in one row:
   Bloodbath `/bloodbath`, Portfolio `/portfolio` (portfolio access only),
   Hindsight `/time-machine` (portfolio access only), **Paper** `/paper`,
   **Briefing** `/briefing` (portfolio access only). Guests see Bloodbath +
   Paper. Style: `var(--surface-1)` bg, `1px solid var(--hairline)`, radius
   `var(--radius-block)`, icon in a `var(--inset)` circle, label 11px mono
   uppercase with tracking.
3. **Ticker card grid sections** (each section = heading row + 4-col grid on
   ≥380px, 3-col below):
   - `Explosive movers` — the movers the pulse already computes (`movers`
     with `points`), ALL n link to `/explosive`.
   - Each of the user's watchlists (name + avg return + `Manage` link to
     `/watchlists`), only when signed in and the list has tickers.
   - `Today's winners` / `Today's losers` (top/bottom 8 from the universe
     quotes) when the user has no watchlists — same as the classic fallback.
   Card: symbol (mono 12px 600), price (mono 11px dim), change % (mono 12px
   600 in `--up`/`--down`), and a `Sparkline` from the refresh primitives on
   the right (≈44×18). Card bg `var(--surface-1)`, hairline border, radius
   14, tinted hairline `--gain-border`/`--loss-border` by sign. Links to
   `/ticker/{symbol}`. Held tickers show a tiny `HELD` badge (`Badge` from
   `@/components/refresh`, tone info) and at-risk a `RISK` badge (tone risk).
   Use the existing `/api/sparklines?symbols=` client fetch (via
   `cachedFetchJson`, as `WatchlistWidget` does) for symbols whose points are
   not already in the server payload — the movers have points server-side,
   watchlist tickers do not.
   Sections collapse after 8 cards with a `+N more` toggle, like
   `WatchlistWidget`.
4. Keep the classic/HOOD tree (`refresh-except`) untouched.

`PulseScreenProps` grows: `briefing` (serialisable subset: id, title,
summary, minutes, mood, art_seed, status), `features` (list of {href,label,
icon}), `watchlists` ({id,name,tickers:[{symbol,price,changePct}]}[]),
`winners`/`losers` ({symbol,price,changePct}[]). `home/page.tsx` already
fetches everything needed — only the plumbing into `buildPulse`/`PulseScreen`
changes. Do not add fetches.

## More menu + bottom nav
`src/components/more-nav-data.tsx`:
- Discover group: add `{ emoji: "🎙️", title: "Daily Briefing", description:
  "3x-daily audio market podcast", href: "/briefing" }` — but the briefing
  page redirects users without portfolio access, so put it in the
  **Portfolio** group (which is already `requiresPortfolio`), first item.
- Options group: add `{ emoji: "📈", title: "LEAPS Lab", description:
  "Daily LEAPS scan + return grid", href: "/plays?s=leaps" }` and
  `{ emoji: "💵", title: "PMCC Income", description: "Monthly income on a
  capital budget", href: "/plays?s=pmcc" }` after "PMCC Picks".
- New group **Paper** (no portfolio requirement) before Portfolio, icon a
  simple flask/beaker path, links: `{ emoji: "🧪", title: "Paper Trading",
  description: "10 bots, $100K each, trading daily", href: "/paper" }`.

`src/components/BottomNav.tsx`: add a **Paper** tab (`/paper`) after Options
for signed-in users (order: Home · Options · Paper · Portfolio? · Learn ·
More). Icon: a flask outline. Guests keep their current tabs.

## Files
| File | Action |
|---|---|
| `src/app/(app)/home/page.tsx` | Modify — pass watchlists/winners/losers/briefing/features into the Pulse tree |
| `src/app/(app)/home/pulse.ts` | Modify — extend `PulseScreenProps` building |
| `src/app/(app)/home/PulseScreen.tsx` | Modify — new sections |
| `src/app/(app)/home/TickerCardGrid.tsx` | Create — client grid + sparkline fetch |
| `src/app/(app)/home/PulseBriefingCard.tsx` | Create |
| `src/components/more-nav-data.tsx` | Modify |
| `src/components/BottomNav.tsx` | Modify |

## Acceptance
- [ ] Refresh home shows ≥3 card sections with sparklines for a signed-in user with watchlists; movers grid for guests.
- [ ] Briefing card visible on home for a portfolio-access user; `/briefing` reachable from More.
- [ ] Paper tab in bottom nav; LEAPS Lab / PMCC Income / Paper Trading in More.
- [ ] `npx tsc --noEmit` clean for touched files; no new fetches on the home route.
