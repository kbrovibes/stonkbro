# Spec 01: Project Skeleton & Auth

## What it does
Sets up the app shell with Supabase auth (email/password + Google OAuth), a bottom nav, and the core layout. After login, users land on the Discovery dashboard (empty state initially). Unauthenticated users are redirected to /login.

## What it does NOT do
- No stock data fetching yet
- No options analysis
- No alerts or notifications
- No portfolio tracking

## Data / DB changes

### Table: `watchlist`
```sql
create table watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  ticker text not null,
  added_at timestamptz default now(),
  notes text,
  unique(user_id, ticker)
);

alter table watchlist enable row level security;

create policy "Users can manage their own watchlist"
  on watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Table: `user_settings`
```sql
create table user_settings (
  user_id uuid primary key references auth.users(id),
  alert_email text,
  alert_phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users can manage their own settings"
  on user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## API
None yet — direct Supabase client calls for auth.

## UI

### Pages
- `/login` — Email/password + Google OAuth sign-in
- `/(app)` — Authenticated layout with bottom nav
- `/(app)/page.tsx` — Discovery page (empty state: "Set up your watchlist to start scanning")
- `/(app)/portfolio` — Portfolio page (empty state)
- `/(app)/settings` — User settings (alert preferences)

### Bottom Nav
- **Discover** (chart icon) — Stock discovery dashboard
- **Portfolio** (briefcase icon) — Positions & P&L
- **Settings** (gear icon) — Alert preferences, account

### Layout
- Dark theme (slate/zinc palette — trading app aesthetic)
- Mobile-first, max-width container for desktop
- Top header: "stonkbro" branding + logout

## Files to create/modify

| File | Action |
|---|---|
| `src/lib/supabase.ts` | Create — Service role client |
| `src/lib/supabase-server.ts` | Create — Auth-aware server client |
| `src/lib/supabase-browser.ts` | Create — Browser client (anon key) |
| `src/app/layout.tsx` | Modify — Dark theme, fonts, analytics |
| `src/app/globals.css` | Modify — Dark theme base styles |
| `src/app/login/page.tsx` | Create — Auth UI |
| `src/app/(app)/layout.tsx` | Create — Authenticated shell with nav |
| `src/app/(app)/page.tsx` | Create — Discovery empty state |
| `src/app/(app)/portfolio/page.tsx` | Create — Portfolio empty state |
| `src/app/(app)/settings/page.tsx` | Create — Settings page |
| `src/components/Header.tsx` | Create — Top bar |
| `src/components/BottomNav.tsx` | Create — Navigation |
| `src/middleware.ts` | Create — Auth redirect middleware |
| `supabase/migrations/20260422_init.sql` | Create — Initial schema |

## Acceptance Criteria
- [ ] Unauthenticated users are redirected to /login
- [ ] Users can sign up and log in with email/password
- [ ] After login, users see the Discovery page with empty state
- [ ] Bottom nav switches between Discover, Portfolio, Settings
- [ ] Dark theme applied consistently
- [ ] Logout button works
