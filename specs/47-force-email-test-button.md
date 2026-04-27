# Spec 47: Force Email Test Button

## What it does
Adds a "Send Test Email" button to the Settings page that manually triggers a daily briefing email to the user's configured alert email address. The email contains real data — the same alerts and movers the cron job would generate — so the user can verify end-to-end email delivery without waiting for the scheduled cron.

## What it does NOT do
- No new email templates — reuses `sendDailyBriefing` as-is
- No new environment variables
- No scheduled or recurring behavior — strictly manual, one-shot trigger
- No separate admin-only gate (uses existing auth; user must be logged in)
- Does not modify the existing cron route

## Data / DB changes
None.

## API

### `POST /api/email/test`
**Auth:** Requires logged-in user (Supabase session).

**Request:** No body required.

**Response:**
```json
{
  "success": true,
  "email": "user@example.com",
  "alertCount": 5,
  "moversFound": 2
}
```

**Error cases:**
- `401` — not authenticated
- `400` — no alert email configured in user settings (`"Set an alert email in Settings first"`)
- `500` — Resend API failure

**Logic:**
1. Get the authenticated user's `alert_email` from `user_settings`
2. Fetch their active positions + watchlist symbols (same as cron route)
3. Get live quotes, generate alerts via `generateAlerts()`
4. Run `scanForMovers()` for market mover alerts
5. Combine and call `sendDailyBriefing(email, combinedAlerts)`
6. Return success with counts

## UI

### Settings page addition
Add a card/section below the existing alert email input on the Settings page:

- **Label:** "Test Email Delivery"
- **Description:** "Send a test briefing email with your current positions and market movers."
- **Button:** "Send Test Email" (primary style)
- **States:**
  - *Disabled* when no alert email is saved
  - *Loading* spinner while sending (disable button)
  - *Success* toast/inline message: "Test email sent to {email}"
  - *Error* inline message with the error detail

## Files to create/modify

| File | Action |
|---|---|
| `src/app/api/email/test/route.ts` | Create — POST handler that assembles alerts and sends briefing |
| `src/app/(app)/settings/page.tsx` | Modify — Add "Send Test Email" button below alert email input |

## Acceptance Criteria
- [ ] Button appears on Settings page, disabled when no alert email is configured
- [ ] Clicking the button sends a real briefing email to the user's alert email
- [ ] Email contains position alerts and/or market movers (same content as cron)
- [ ] Success feedback is shown after send completes
- [ ] Error feedback is shown if Resend fails or email is not configured
- [ ] Button shows loading state while request is in flight
- [ ] Unauthenticated requests to the API return 401
