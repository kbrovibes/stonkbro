# Spec 52: Plaid Broker Integration (Fidelity) for Portfolio Monitoring

## What it does
Connects the user's Fidelity account (via Plaid) to establish a read-only sync of real holdings (stocks and option contracts). It provides a live Portfolio view displaying individual cards for each stock and option contract. It introduces an hourly background cron to monitor these positions, sending push notifications if any position trends negatively. Finally, it sends a daily post-open email digest (e.g., 9:45 AM ET) with specific recommendations tailored to the synced portfolio.

## What it does NOT do
- No write access, order execution, or staging of trades back to Fidelity.
- No real-time streaming updates (relies on hourly crons and manual syncs).
- Does not replace the existing manual position entry (users can use either).
- Does not sync transaction history or cost-basis tracking beyond what is needed for current P&L calculations.

## Data / DB changes
New tables to support Plaid linking and mirrored holdings:

```sql
CREATE TABLE plaid_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT UNIQUE NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  institution_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ
);

CREATE TABLE broker_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id UUID REFERENCES plaid_items(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'stock', 'option'
  quantity NUMERIC NOT NULL,
  cost_basis NUMERIC,
  -- Option specific fields
  option_type TEXT, -- 'call', 'put'
  strike NUMERIC,
  expiry DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API
- `POST /api/plaid/create-link-token`: Generates a token to initialize the Plaid Link UI.
- `POST /api/plaid/exchange-public-token`: Exchanges the public token for an access token and stores it.
- `POST /api/plaid/sync`: On-demand sync of holdings from Plaid.
- `GET /api/cron/broker-monitor`: Hourly job that checks synced holdings against current market data, computes health scores, and triggers push notifications for positions trending "danger" or "critical".
- `GET /api/cron/portfolio-digest`: Daily job (running after market open) that generates an AI-powered digest based on the user's synced holdings and sends it via Resend.

## UI
- **Settings > Connections**: A new section with a "Connect Broker" button utilizing `react-plaid-link`. Displays connection status and last sync time.
- **Portfolio Page**: Refactored to list individual cards for synced stocks and option contracts, displaying current P&L, health score, and relevant metrics.

## Files to create/modify
| File | Action |
|---|---|
| `supabase/migrations/20260428_plaid_integration.sql` | Create — Schema for Plaid items and holdings |
| `src/app/api/plaid/create-link-token/route.ts` | Create — Plaid Link initialization |
| `src/app/api/plaid/exchange-public-token/route.ts` | Create — Token exchange and storage |
| `src/app/api/plaid/sync/route.ts` | Create — Holdings sync logic |
| `src/app/api/cron/broker-monitor/route.ts` | Create — Hourly health check and push notification trigger |
| `src/app/api/cron/portfolio-digest/route.ts` | Create — Daily post-open email digest |
| `src/components/PlaidLink.tsx` | Create — Client component for the Plaid UI flow |
| `src/app/(app)/settings/page.tsx` | Modify — Integrate PlaidLink component |
| `src/app/(app)/portfolio/page.tsx` | Modify — Update UI to render `broker_holdings` cards |

## Acceptance Criteria
- [ ] User can successfully authenticate with a broker via Plaid Sandbox/Development.
- [ ] Holdings (stocks and options) sync to the `broker_holdings` table.
- [ ] Portfolio page correctly renders individual cards for synced stocks and options.
- [ ] `broker-monitor` cron runs hourly and sends a push notification if a position health score drops to danger/critical.
- [ ] `portfolio-digest` cron runs daily after market open and sends an email with tailored recommendations based on the user's synced portfolio.
