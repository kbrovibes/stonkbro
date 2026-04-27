# Spec 48: Auto-Refresh Ticker Data

## What it does
Pages that display live ticker/quote data automatically poll for fresh quotes every 60 seconds during US market hours (9:30 AM - 4:00 PM ET, weekdays). A subtle "last updated" indicator shows when data was last refreshed. Outside market hours, no polling occurs — data loads once on mount as it does today.

## What it does NOT do
- No WebSocket or SSE streaming — simple polling via `setInterval`
- No new API routes — reuses existing data-fetching patterns (server component reload or existing API routes)
- No user-configurable interval or toggle (hardcoded 60s, always on during market hours)
- No polling on pages without ticker data (settings, research history, position entry forms)
- No real-time options chain refreshing — only quote/price data
- Does not change how data is fetched server-side (Tradier revalidate stays at 60s)

## Data / DB changes
None.

## API

### `GET /api/quotes?symbols=AAPL,TSLA,NVDA`
**New route** — lightweight endpoint returning just quote data for a list of symbols.

**Auth:** Requires logged-in user (Supabase session).

**Request:** Query param `symbols` (comma-separated, max 50).

**Response:**
```json
{
  "quotes": [
    {
      "symbol": "AAPL",
      "last": 189.84,
      "change": 2.31,
      "changePct": 1.23,
      "volume": 54321000,
      "open": 187.50,
      "high": 190.10,
      "low": 187.20,
      "prevClose": 187.53
    }
  ],
  "timestamp": "2026-04-26T15:30:00Z"
}
```

**Error cases:**
- `401` — not authenticated
- `400` — missing or empty `symbols` param
- `400` — more than 50 symbols requested

**Why a new route:** Server Components cannot be partially re-rendered from the client. The existing pages are RSCs that fetch quotes inline. The client-side polling hook needs a lightweight JSON endpoint to fetch updated quotes without a full page reload.

## UI

### `useAutoRefresh` hook
A shared React hook that encapsulates the polling logic:

```typescript
function useAutoRefresh(symbols: string[], options?: { intervalMs?: number }): {
  quotes: Map<string, QuoteData>;
  lastUpdated: Date | null;
  isRefreshing: boolean;
  isMarketOpen: boolean;
}
```

**Behavior:**
1. On mount, immediately populates `quotes` from server-rendered data passed as initial props (no extra fetch on first load)
2. Checks `isMarketOpen()` — if false, does nothing; re-checks every 60s in case market opens/closes mid-session
3. If market is open, starts a 60-second `setInterval` calling `GET /api/quotes?symbols=...`
4. Updates `quotes` map and `lastUpdated` on each successful response
5. Sets `isRefreshing` to true during fetch, false after
6. Cleans up interval on unmount
7. Pauses polling when the browser tab is hidden (`document.visibilityState`) and resumes when visible

### `isMarketOpen` utility
Pure function in `src/lib/market/hours.ts`:
- Returns `true` if current time is between 9:30 AM and 4:00 PM ET on a weekday (Mon-Fri)
- Does not account for market holidays (acceptable scope for v1)

### "Last Updated" indicator
A small inline component shown on pages using auto-refresh:
- Text: "Updated 12s ago" / "Updated 1m ago" — relative time, updates every 10s
- When `isRefreshing`: shows a subtle spinning dot or pulse animation
- When market is closed: shows "Market closed" in muted text
- Placement: top-right of the page content area, below the page header

### Pages to integrate

| Page | Symbols source | Notes |
|---|---|---|
| `/` (Discover) | Watchlist symbols | Pass watchlist ticker arrays to hook |
| `/today` | Already client-side; movers + picks symbols | Wrap existing fetch with hook for quote refresh |
| `/portfolio` | Position symbols | Convert to client component wrapper pattern |
| `/dashboard` | Position symbols | Convert to client component wrapper pattern |
| `/ticker/[symbol]` | Single symbol from URL | Convert to client component wrapper pattern |
| `/risk` | Position symbols | Convert to client component wrapper pattern |
| `/sectors/[slug]` | Sector tickers | Convert to client component wrapper pattern |

**Client wrapper pattern** for current RSC pages:
1. RSC fetches initial data server-side (unchanged)
2. RSC renders a new client component, passing initial quotes + symbol list as props
3. Client component uses `useAutoRefresh(symbols, { initialQuotes })` to overlay fresh data
4. Display components read from the hook's `quotes` map instead of the static server data

### Pages NOT integrated (no polling needed)
- `/settings` — no ticker data
- `/positions/new` — form page
- `/research`, `/research/history` — AI reports, not live data
- `/explosive`, `/signals`, `/scanner` — on-demand scan results, not persistent views
- `/covered-calls` — on-demand analysis
- `/pmcc-picks` — on-demand scan
- `/earnings` — calendar data, not live quotes

## Files to create/modify

| File | Action |
|---|---|
| `src/lib/market/hours.ts` | Create — `isMarketOpen()` utility function |
| `src/hooks/useAutoRefresh.ts` | Create — shared polling hook |
| `src/components/LastUpdated.tsx` | Create — "Updated Xs ago" indicator component |
| `src/app/api/quotes/route.ts` | Create — GET endpoint returning quotes for symbol list |
| `src/app/(app)/page.tsx` | Modify — add client wrapper that uses `useAutoRefresh` |
| `src/app/(app)/DiscoveryTable.tsx` | Modify — accept refreshed quotes, overlay on server data |
| `src/app/(app)/WatchlistWidget.tsx` | Modify — accept refreshed quotes from parent |
| `src/app/(app)/today/page.tsx` | Modify — integrate `useAutoRefresh` for quote data alongside existing fetch logic |
| `src/app/(app)/portfolio/page.tsx` | Modify — add client wrapper with `useAutoRefresh` |
| `src/app/(app)/dashboard/page.tsx` | Modify — add client wrapper with `useAutoRefresh` |
| `src/app/(app)/ticker/[symbol]/page.tsx` | Modify — add client wrapper with `useAutoRefresh` |
| `src/app/(app)/risk/page.tsx` | Modify — add client wrapper with `useAutoRefresh` |
| `src/app/(app)/sectors/[slug]/page.tsx` | Modify — add client wrapper with `useAutoRefresh` |

## Acceptance Criteria
- [ ] `isMarketOpen()` returns true only during 9:30 AM - 4:00 PM ET on weekdays
- [ ] `GET /api/quotes?symbols=AAPL,TSLA` returns fresh quote data for authenticated users
- [ ] `useAutoRefresh` polls every 60s when market is open, stops when closed
- [ ] Polling pauses when the browser tab is hidden and resumes when visible
- [ ] Discovery page shows live-updating quotes during market hours
- [ ] Portfolio page shows live-updating P&L during market hours
- [ ] Dashboard page shows live-updating position values during market hours
- [ ] Ticker detail page shows live-updating quote during market hours
- [ ] Risk page shows live-updating portfolio risk during market hours
- [ ] "Last Updated" indicator displays on all auto-refreshing pages
- [ ] No polling occurs outside market hours — pages load once as before
- [ ] No extra network request on initial page load (hook uses server-rendered data first)
