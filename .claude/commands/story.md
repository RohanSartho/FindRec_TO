# /story — Execute a Product Story

When this command is invoked, the user will describe a feature, fix, or improvement they want.

## Your job:

### Step 1: Read context
Before doing anything, read `PROJECT.md` in the project root. This contains the full project memory — stack, schema, API routes, components, known issues, and phase history.

### Step 2: Understand the story
The user will describe what they want in plain language. Ask clarifying questions if critical information is missing (e.g. which page, which API, specific behaviour). Keep questions to a minimum — 1-2 max. If you can make a reasonable decision, make it and note it.

### Step 3: Plan out loud
Before writing any code, explain your plan in plain English:
- What files you will create or modify
- What database changes (if any) are needed
- What API changes (if any) are needed
- Any risks or tradeoffs
- Estimated scope: Small (< 1hr) / Medium (1-3hr) / Large (3hr+)

Wait for the user to say **"go"** or **"looks good"** before executing.

### Step 4: Execute
- Work through the plan completely without stopping
- Do not ask for file edit permissions between steps
- Fix all TypeScript errors before finishing
- Run `npx tsc --noEmit` at the end

### Step 5: Verify
- Run `npm run dev` and test affected routes
- Report what you tested and what the results were

### Step 6: Commit
```bash
git add .
git commit -m "<type>: <summary>"
git push
```

Use conventional commit types: `feat`, `fix`, `refactor`, `chore`, `docs`

### Step 7: Update PROJECT.md
After completing the story, update the relevant sections of `PROJECT.md`:
- Add new routes to the API Routes table if added
- Add new pages to the Pages table if added
- Add new components to the Key Components section if added
- Add any new known issues discovered
- Move resolved known issues to Fixed status
- Update the Phase History with a new row if it's a significant addition
- Update `Last updated` date at the top

### Step 8: Status report
Return a concise markdown report:
- What was built
- Files created / modified
- Test results
- Git commit hash
- Any issues found that should go in BACKLOG.md

---

## Rules
- Always read `PROJECT.md` first — never assume context from memory
- Never commit `.env.local` or any file containing secrets
- Always run `npx tsc --noEmit` — never leave TypeScript errors
- If a migration is needed, follow the pattern in existing migrations (always include `set search_path to public, extensions;` at top)
- If schema changes, run `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` after pushing
- Keep `PROJECT.md` and `BACKLOG.md` up to date — they are the project's memory
