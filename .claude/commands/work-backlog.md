# /project:work-backlog

Implement backlog items one by one until done or blocked. This is the core autonomous loop command.

## Loop Protocol

### Step 1 — Pick an item
Read BACKLOG.md. Take the first unchecked item from `## ✅ P1 — Do First`. If P1 is empty, take from `## 📋 P2 — Do Next`.

If nothing is left: write `DONE: all backlog items complete` to `.claude-status` and stop.

### Step 2 — Check if actionable
Before starting, verify the item does not require:
- New environment variables not already in the project
- External API credentials not already configured
- A product or design decision not described in the task

If blocked by any of these: add a note to the item (`NEEDS_INPUT: [what is needed]`), write `NEEDS_INPUT: [task title] — [what is needed]` to `.claude-status`, commit BACKLOG.md, and stop.

### Step 3 — Start the item
Move the item from its current section to `## 🔄 In Progress` in BACKLOG.md.
Commit: `git add BACKLOG.md && git commit -m "wip: starting [task title]"`

### Step 4 — Implement
Implement the task fully following project conventions (see CLAUDE.md).
- All DB access via `src/lib/db/*.ts`
- Business logic in `src/lib/`, not components
- Tailwind only, no other CSS
- Update CHANGELOG.md and create/update a releases/ file for any src/ change

After every file edit, run: `npm run build`

### Step 5a — If build passes
- Commit all changes: `git add -A && git commit -m "fix: [title]"` or `"feat: [title]"`
- Mark item done in BACKLOG.md: move to `## ✅ Done` with the git SHA and today's date
- Commit: `git add BACKLOG.md && git commit -m "chore: mark [task title] done"`
- Go back to Step 1 and pick the next item. Keep going without asking.

### Step 5b — If build fails
- Diagnose the error. Attempt a fix. Re-run build.
- If still failing after 2 attempts: move item back to P1 with note `BLOCKED: [what failed]`
- Write `BLOCKED: [task title] — [reason]` to `.claude-status`
- Commit BACKLOG.md and stop.

## Loop Self-Check
If you notice you are editing the same file repeatedly without progress, or the same error keeps appearing: write `LOOP_DETECTED: [describe what is repeating]` to `.claude-status` and stop immediately.

## What you may do autonomously (never ask):
- Bug fixes with clear reproduction
- Missing error handling or null checks
- TypeScript type fixes
- Console.log cleanup
- Test additions for existing behavior
- Minor copy/label fixes
- Performance improvements with no behavior change

## What requires stopping (write NEEDS_INPUT):
- New pages, routes, or major UI sections not described in the task
- New external API or data source integrations
- Changes to core business logic or calculations
- Anything requiring new environment variables
- Deleting or renaming existing database tables or API routes
