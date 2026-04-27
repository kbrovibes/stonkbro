# /project:generate-backlog

Analyze the codebase and populate BACKLOG.md and IDEAS.md with new findings. Do NOT implement anything.

## Steps

1. Read the full project structure: `src/`, `BACKLOG.md`, `IDEAS.md`, and run `git log --oneline -20`.

2. Investigate the codebase for:
   - Bugs visible in code (unhandled nulls, missing error states, broken edge cases)
   - Missing error handling in API routes or data-fetch paths
   - UX gaps (loading states, empty states, form validation)
   - TypeScript type issues or any use of `any`
   - Performance issues (N+1 fetches, missing memoization)
   - Missing tests for critical paths
   - Potential features that extend existing functionality naturally

3. For each finding, classify and route:
   - **Bug fix, typo, missing type, minor improvement with clear acceptance criteria** → add to BACKLOG.md under `## 📋 P2 — Do Next` as:
     ```
     - [ ] **[Short Title]** · [1-2 sentence description with acceptance criteria]
     ```
   - **New feature, product decision, or anything requiring design input** → add to IDEAS.md as:
     ```
     ## [Title] — [YYYY-MM-DD]
     [3-4 sentences: what the idea is, why it matters, any open questions]
     ```

4. Do NOT add items already present in BACKLOG.md (check existing P1, P2, and Done sections).

5. Commit both files:
   ```
   git add BACKLOG.md IDEAS.md
   git commit -m "chore: generate-backlog session $(date +%Y-%m-%d)"
   ```

6. Print a summary:
   - X items added to BACKLOG.md P2
   - Y ideas added to IDEAS.md for review
   - List each item title on one line
