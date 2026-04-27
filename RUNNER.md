# Backlog Runner — How to Use

## Quick Start

```bash
# Option 1: Fully autonomous loop (hands-off)
cd ~/claude/stonkbro
./run-backlog.sh

# Option 2: Single item (interactive)
claude "/project:work-backlog"

# Option 3: Just see what's next
claude "/project:list-backlog"
```

## The System

Three commands work together:

| Command | What it does | When to use |
|---|---|---|
| `/project:work-backlog` | Picks the top P1 item (or P2 if P1 empty), writes a spec, implements it, commits, pushes, then loops to the next item | Main workhorse — run this to ship features |
| `/project:generate-backlog` | Scans codebase for bugs/gaps/improvements, adds findings to P2 or IDEAS.md | Run periodically to discover tech debt and opportunities |
| `/project:list-backlog` | Prints current backlog status (read-only) | Quick check on what's queued |
| `/groom-backlog` | Deep audit: cleans stale items, adds new ones based on project goals, re-prioritizes | Run when backlog feels stale or after a big sprint |

## Backlog Structure

```
BACKLOG.md
├── 🔄 In Progress     ← Claude moves items here while working
��── ✅ P1 — Do First   ← High priority, implement next
├── 📋 P2 — Do Next    ← Lower priority queue
├── 💡 IDEAS            ← Unreviewed brainstorm items
├── ✅ Done             ← Completed with SHA + date
└── Removed             ← Deprioritized with reasoning
```

**You control priority** by moving items between P1 and P2. Claude always picks from P1 first.

## The Autonomous Loop (`run-backlog.sh`)

The shell script loops Claude invocations until it hits a stop condition:

1. Claude reads BACKLOG.md, picks top item
2. Moves it to "In Progress", commits
3. Implements, runs `npm run build`
4. If passes: commits, marks done, loops to next item
5. If blocked: writes `.claude-status` and exits

**Stop conditions** (written to `.claude-status`):
- `DONE` — all items complete
- `BLOCKED: [reason]` — build failed after retries
- `NEEDS_INPUT: [what's needed]` — requires a human decision or missing credential
- `LOOP_DETECTED: [description]` — stuck in a cycle

After the loop exits, check `.claude-status` to see why it stopped.

## Typical Workflow

### Daily
```bash
# Morning: check what's ready
claude "/project:list-backlog"

# Let it rip
./run-backlog.sh
```

### Weekly
```bash
# Find new work items from codebase analysis
claude "/project:generate-backlog"

# Review IDEAS.md in git diff, promote good ones to P1/P2

# Deep groom if needed
claude "/groom-backlog"
```

### Managing Priority

Edit BACKLOG.md directly:
- Move items from P2 → P1 to prioritize them
- Move items from IDEAS → P1/P2 to approve them
- Delete items from IDEAS to reject them
- Add new items manually to any section

## Safety Rails

Claude will **auto-approve** (never ask):
- Bug fixes, null checks, type fixes
- Console.log cleanup, minor copy fixes
- Performance improvements with no behavior change

Claude will **stop and write NEEDS_INPUT** for:
- New pages/routes not described in the task
- New external API integrations
- Core business logic changes
- New environment variables needed
- Deleting/renaming DB tables or API routes

## Current Queue (Apr 26, 2026)

**P1 — Do First:**
- 31: Tradier Live Data Activation
- 32: Push Notifications
- 33: News & Sentiment Pipeline
- 34: Scoring Engine

**P2 — 12 more items** (roll advisor, earnings plays, options flow, journal, broker API, etc.)

See `BACKLOG.md` for the full list.

## Tips

- Run `/project:generate-backlog` after a big sprint — it'll find loose ends
- The loop pushes each completed item individually, so you get real-time git notifications
- If you want to skip an item, move it down in the file or add `SKIP:` prefix
- The `.claude-status` file is gitignored — it's ephemeral session state
