#!/bin/bash
# Called by Claude Code PostToolUse hook when BACKLOG.md is modified.
# 1. Regenerates the static backlog HTML page
# 2. Sends a push notification via the app's API

cd "$(dirname "$0")/.." || exit 0

# Regenerate backlog page
node scripts/generate-backlog-page.js 2>/dev/null
git add docs/backlog.html 2>/dev/null

# Send push notification (best-effort, non-blocking)
# Extract what changed from the tool input
TITLE="Backlog Updated"
BODY="The stonkbro backlog was just modified."

# Try to send via the deployed app
APP_URL="${STONKBRO_APP_URL:-https://stonkbro.vercel.app}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -n "$CRON_SECRET" ]; then
  curl -s -X POST "$APP_URL/api/push/send" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $CRON_SECRET" \
    -d "{\"title\":\"$TITLE\",\"body\":\"$BODY\",\"url\":\"/settings\",\"tag\":\"backlog-update\"}" \
    >/dev/null 2>&1 &
fi
