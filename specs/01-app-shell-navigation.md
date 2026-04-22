# Spec 01: App Shell & Navigation

## What it does
Sets up the app shell with a top header, bottom nav, and empty state pages for each section. No auth — all pages are publicly accessible for now.

## What it does NOT do
- No authentication (moved to spec 12)
- No stock data fetching
- No options analysis
- No alerts or notifications

## Data / DB changes
None.

## API
None.

## UI

### Pages
- `/` — Discovery page (empty state: "Your watchlist is empty — add tickers to start scanning")
- `/portfolio` — Portfolio page (empty state: "No open positions yet")
- `/settings` — Settings page (placeholder for alert preferences)

### Top Header
- "stonkbro" branding (left-aligned, bold)

### Bottom Nav (fixed, 3 tabs)
- **Discover** (chart icon) — Stock discovery dashboard
- **Portfolio** (briefcase icon) — Positions & P&L
- **Settings** (gear icon) — Alert preferences, account

### Layout
- Light theme (stone palette — matching snobaddy)
- Mobile-first, max-width container for desktop
- Plus Jakarta Sans font

## Files to create/modify

| File | Action |
|---|---|
| `src/app/page.tsx` | Modify — Discovery empty state (becomes the app home) |
| `src/app/portfolio/page.tsx` | Create — Portfolio empty state |
| `src/app/settings/page.tsx` | Create — Settings page |
| `src/app/layout.tsx` | Modify — Add header + bottom nav to root layout |
| `src/components/Header.tsx` | Create — Top bar |
| `src/components/BottomNav.tsx` | Create — Navigation |

## Acceptance Criteria
- [ ] Root page shows Discovery empty state
- [ ] Bottom nav switches between Discover, Portfolio, Settings
- [ ] Active tab is visually highlighted
- [ ] Light stone theme applied consistently
- [ ] Mobile-first layout with max-width on desktop
