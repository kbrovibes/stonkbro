# /project:add-backlog

Add a new item to the backlog, write its spec, and push.

## Usage

```
/project:add-backlog P1|P2 <description of the feature>
```

Example:
```
/project:add-backlog P1 Add dark mode toggle to settings page with localStorage persistence
/project:add-backlog P2 Show open interest chart on ticker detail page
```

## Steps

### 1. Parse arguments

- First token is the priority: `P1` or `P2` (case-insensitive). If missing or invalid, stop and ask.
- Everything after is the raw description.

### 2. Determine the next item number

Read `BACKLOG.md`. Find the highest item number across ALL sections (P1, P2, Done, Removed, In Progress). The new item gets that number + 1.

### 3. Craft the backlog entry

Shorten the raw description into:
- **Title** (3–5 words, title case, punchy)
- **One-liner** (≤12 words describing what it does — implementation language, no fluff)

Format:
```
- [ ] **NN — Title** · One-liner description
```

### 4. Insert into BACKLOG.md

- For P1: append after the last `- [ ]` item in `## ✅ P1 — Do First`
- For P2: append after the last `- [ ]` item in `## 📋 P2 — Do Next`

### 5. Commit the backlog entry

```
git add BACKLOG.md
git commit -m "chore: add #NN to backlog — <Title>"
```

### 6. Write the spec (background agent)

Launch a background agent with this prompt:

> Read BACKLOG.md and find item #NN. Read AGENTS.md for the spec template.
> Read the existing specs in specs/ to understand style and depth.
> Write a spec file at specs/NN-kebab-case-title.md following the template in AGENTS.md exactly.
> The spec should define: what it does, what it does NOT do, DB/API/UI changes, files to create/modify, and acceptance criteria.
> Base the scope strictly on the backlog one-liner — do not invent extra features.
> When done, run: git add specs/ && git commit -m "docs: spec for #NN — <Title>" && git push

### 7. Push the backlog commit

```
git push
```

### 8. Confirm to user

Print:
```
Added #NN — <Title> to <P1|P2>
Spec: specs/NN-<slug>.md (writing in background)
Pushed.
```
