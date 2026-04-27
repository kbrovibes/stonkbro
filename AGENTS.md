# Agent Protocol

## Session Start

1. Read `CLAUDE.md` for project context
2. Read `BACKLOG.md` to find the next task
3. Pick the first unchecked `[ ]` item from `P1 — Do First`. If P1 is empty, pick from `P2 — Do Next`
4. Move it to `🔄 In Progress` and commit
5. Read the linked spec in `specs/` (or write one if missing)
6. Implement exactly what the spec says — no more, no less
7. Update `BACKLOG.md` (move to Done), `CHANGELOG.md`, and `releases/`
8. Commit and push
9. Loop: go back to step 2

See `RUNNER.md` for the full autonomous loop system and `run-backlog.sh` for hands-off execution.

## Core Rules

- **Never implement more than what the spec asks**
- **All DB queries go through `src/lib/db/*.ts`**
- **All market data fetching goes through `src/lib/market/`**
- **All options calculations go through `src/lib/options/`**
- **Update changelog with every feature/fix**

## Spec Template

```markdown
# Spec NN: Feature Name

## What it does
Plain English description from user's perspective.

## What it does NOT do
Explicit scope boundaries.

## Data / DB changes
New tables, columns, or queries. Include SQL for schema changes.

## API
New or modified routes. Method, path, auth, request/response shape.

## UI
Pages, components, layout, interactions.

## Files to create/modify
| File | Action |
|---|---|
| `path/to/file.ts` | Create / Modify — brief description |

## Acceptance Criteria
- [ ] Verifiable, testable condition
```

## Changelog Format

```markdown
## v0.X.0 — Short Title

- Feature or fix description (user-facing language)
```

## Release Notes Format

```markdown
# v0.X.0 — Short Title

## Summary
One-liner about the change.

## Dependencies added
- List of new npm packages

## Files changed
| File | Change |
|---|---|
| `path/to/file.ts` | Description |

## Notes
Technical details, gotchas, or implementation notes.
```
