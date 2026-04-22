# stonkbro

Explosive stock discovery + options strategy automation. Find stocks ready to move, then structure and manage PMCC, covered call, and put-selling strategies.

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript)
- **Frontend**: React, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics + Speed Insights
- **Market Data**: Polygon.io (equities + options chains)
- **News/Sentiment**: Finnhub

## Project Structure

```
src/
  app/              Next.js App Router pages & API routes
  components/       React components
  lib/
    db/             All database access (never query Supabase directly in components)
    market/         Market data fetching & technical analysis
    options/        Options strategy calculations (PMCC, covered calls, puts)
    scoring/        Stock scoring engine (explosive potential)
specs/              Feature specifications (NN-feature-name.md)
releases/           Technical release notes per version
screenshots/        UI screenshots for README
journal/            Technical deep-dive documents
scripts/            Build/deployment automation
supabase/
  migrations/       Timestamped SQL migration files
```

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key (RLS-protected) |
| `SUPABASE_URL` | Server | Supabase project URL (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase admin key (bypasses RLS) |
| `POLYGON_API_KEY` | Server | Polygon.io market data |
| `FINNHUB_API_KEY` | Server | Finnhub news & sentiment |

## Coding Conventions

1. All DB access goes through `src/lib/db/*.ts` — never query Supabase directly in components
2. Prefer React Server Components for read-only data
3. `"use client"` only when interactivity is required (forms, state, effects)
4. API routes in `src/app/api/` — one file per resource
5. Keep components thin — business logic lives in `src/lib/`
6. Tailwind only — mobile-first, no other CSS frameworks
7. Market data logic in `src/lib/market/` — isolated from UI
8. Options math in `src/lib/options/` — pure functions, testable

## Agent Workflow

See `AGENTS.md` for the full protocol.

## Changelog Discipline

Every commit touching `src/` must also update `CHANGELOG.md` and create/update a release file in `releases/`.
