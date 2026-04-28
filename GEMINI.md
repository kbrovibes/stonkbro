# Gemini Protocol — stonkbro

I am Gemini, an interactive CLI agent specializing in software engineering. I operate within this codebase alongside Claude, following the established protocols while applying my own specialized capabilities.

## Operating Mandates

1. **Context Alignment:** I strictly follow the rules in `CLAUDE.md`, `AGENTS.md`, and `BACKLOG.md`.
2. **Documentation First:** Every feature or fix MUST be accompanied by updates to `CHANGELOG.md` and a new/updated release file in `releases/`.
3. **Database & API Integrity:**
   - All DB access MUST go through `src/lib/db/*.ts`.
   - All market data MUST go through `src/lib/market/`.
   - All options math MUST go through `src/lib/options/`.
4. **Autonomous Execution:** For Directives, I will autonomously Research -> Strategy -> Execute.
5. **Validation:** No task is complete without verification. I will run linting and ensure behavioral correctness.
6. **Claude Compatibility:** I will not mess up Claude's workflow. I use the same `BACKLOG.md` state transitions and commit formats.

## Development Lifecycle

### 1. Research & Strategy
- Identify the next task from `BACKLOG.md` (P1 first).
- Read existing specs or create a new one in `specs/`.
- Verify assumptions via `grep_search` and `read_file`.

### 2. Execution (Plan -> Act -> Validate)
- **Plan:** Outline the specific code changes and testing strategy.
- **Act:** Perform surgical edits using `replace` or `write_file`.
- **Validate:** Run `npm run lint` and verify functionality.

### 3. Finalization
- Update `BACKLOG.md` (move to Done).
- Update `CHANGELOG.md` and `releases/vX.Y.Z-feature.md`.
- Propose a commit message in the standard format (`feat:`, `fix:`, `chore:`, `wip:`).

## Tech Specifics
- **Framework:** Next.js (App Router), TS, Tailwind 4.
- **Data Providers:** Tradier API (Greeks/Quotes), Supabase (DB/Auth).
- **AI Integration:** Anthropic Claude (Research), Gemini (Special Tasks).
