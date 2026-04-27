# /project:ship

Implement a single backlog item by number, test it, update the backlog, and push.

## Usage

```
/project:ship <number>
```

Example:
```
/project:ship 34
/project:ship 47
```

## Steps

### 1. Find the item

Read `BACKLOG.md`. Find the item with the given number in P1, P2, or In Progress. If it's already Done or not found, stop and tell the user.

### 2. Move to In Progress

Edit `BACKLOG.md`: move the item line from its current section into `## 🔄 In Progress`.

```
git add BACKLOG.md
git commit -m "wip: starting #NN — <Title>"
```

### 3. Read or create the spec

- Check if `specs/NN-*.md` exists. If yes, read it.
- If no spec exists, write one now following the template in `AGENTS.md` before implementing. Commit it: `git add specs/ && git commit -m "docs: spec for #NN — <Title>"`

### 4. Implement

Follow the spec exactly — no more, no less. Apply all CLAUDE.md coding conventions:
- DB access only through `src/lib/db/*.ts`
- Market data only through `src/lib/market/`
- Options math only through `src/lib/options/`
- `"use client"` only when interactivity is required
- Tailwind only

If the spec is missing detail needed to implement, use best judgment consistent with existing patterns in the codebase — do not stop unless a new environment variable or external API is required (write NEEDS_INPUT to `.claude-status` and stop).

### 5. Build test

```
npm run build
```

If the build fails: fix the errors, rebuild. If still failing after 2 attempts, write `BLOCKED: build failed after retries — <error summary>` to `.claude-status` and stop.

### 6. Update docs

- `BACKLOG.md`: move item from In Progress → Done section. Add git SHA and today's date in parentheses.
  Format: `- [x] **NN — Title** · one-liner (SHA date)`
- `CHANGELOG.md`: add entry under the correct version heading (create new version if needed).
- `releases/`: create or update the release notes file for this version.

Only update `README.md` and `docs/index.html` if the feature adds a new page, API route, or DB table (per CLAUDE.md documentation discipline).

### 7. Commit and push

Stage only the files you changed:
```
git add <specific files>
git commit -m "feat: #NN — <Title>"
git push
```

### 8. Confirm to user

Print:
```
✅ #NN — <Title> shipped
Build: passed
Committed: <short SHA>
Pushed to main
```
