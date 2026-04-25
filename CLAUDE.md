# stonkbro

Explosive stock discovery + options strategy automation. Find stocks ready to move, then structure and manage PMCC, covered call, and put-selling strategies.

## Tech Stack

- **Framework**: Next.js (App Router, TypeScript)
- **Frontend**: React, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **Analytics**: Vercel Analytics + Speed Insights
- **Market Data**: Yahoo Finance (quotes + options chains)
- **AI**: Anthropic Claude SDK (research engine)
- **Email**: Resend (alert briefings)

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
| `ANTHROPIC_API_KEY` | Server | Claude AI research engine |
| `RESEND_API_KEY` | Server | Email alert briefings |
| `CRON_SECRET` | Server | Bearer token for cron endpoint |

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

## Documentation Discipline

When a feature is added, removed, or significantly changed (new pages, API routes, DB schema changes), also update:
1. **README.md** — update the relevant section (Features, API Routes, Tech Stack, Roadmap, or Version History)
2. **docs/index.html** — update the corresponding visual section (feature cards, API table, stack cards, timeline, or roadmap)

See `scripts/update-docs.md` for detailed guidance on what to update and what to skip.

Do NOT update docs for bug fixes, refactors, or non-user-facing changes.
