# /story — Execute a Product Story

When this command is invoked, the user will describe a feature, fix, or improvement they want.

## Your job:

### Step 1: Read context
Before doing anything, read `PROJECT.md` in the project root. This contains the full project memory — stack, schema, API routes, components, known issues, and phase history.
Also read `src/lib/config/version.ts` to get the **current version**.

### Step 2: Understand the story
The user will describe what they want in plain language. Ask clarifying questions if critical information is missing (e.g. which page, which API, specific behaviour). Keep questions to a minimum — 1-2 max. If you can make a reasonable decision, make it and note it.

### Step 3: Plan out loud
Before writing any code, explain your plan in plain English:
- What files you will create or modify
- What database changes (if any) are needed
- What API changes (if any) are needed
- Any risks or tradeoffs
- Estimated scope: Small (< 1hr) / Medium (1-3hr) / Large (3hr+)

**Also classify the version bump and state it explicitly:**

| Story type | Bump | Example |
|---|---|---|
| Bug fix / typo / style tweak only | **patch** `v2.1 → v2.1.1` | Fixing a broken filter |
| 1–2 new user-facing features, new page, new filter, new API, new activity type | **minor** `v2.1 → v2.2` | Adding price display |
| Full redesign, new platform, multi-city, mobile, fundamentally new data model | **major** `v2.x → v3.0` | Multi-city support |

State: `"This story is a [patch | minor | major] bump. Current: vX.Y.Z → New: vA.B.C"`

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
git commit -m "<type>(vX.Y.Z): <summary>"
git push
```

Include the new version in the commit message. Use conventional commit types: `feat`, `fix`, `refactor`, `chore`, `docs`

### Step 6.5: Bump version
After committing, update `src/lib/config/version.ts`:
- Set `APP_VERSION` to the new version string
- Add a new entry to `VERSION_NOTES` summarising what this version introduced (one sentence, user-facing language)

```ts
// Example after a minor bump
export const APP_VERSION = "2.2";

export const VERSION_NOTES: Record<string, string> = {
  "1.0": "Skating rinks, ice timetables & live rink status",
  "2.0": "All activities — venues browser, community centres & Mapbox maps",
  "2.1": "Drop-in search, registered programs & analytics dashboard",
  "2.2": "Your new one-sentence summary here",
};
```

Commit this separately:
```bash
git add src/lib/config/version.ts
git commit -m "chore: bump version to vX.Y.Z"
git push
```

**Skip the version bump entirely for patch fixes** (v2.1.1 style) unless the user asks for it — patch fixes don't need a `VERSION_NOTES` entry.

### Step 7: Update PROJECT.md
After completing the story, update the relevant sections of `PROJECT.md`:
- Add new routes to the API Routes table if added
- Add new pages to the Pages table if added
- Add new components to the Key Components section if added
- Add any new known issues discovered
- Move resolved known issues to Fixed status
- Update the Phase History with a new row — **include the new version number** if this was a minor or major bump
- Update `Last updated` date at the top

### Step 8: Status report
Return a concise markdown report:
- What was built
- Version bump: `vX.Y.Z → vA.B.C` (or "no version bump — patch fix")
- Files created / modified
- Test results
- Git commit hash
- Any issues found that should go in BACKLOG.md

---

## Rules
- Always read `PROJECT.md` first — never assume context from memory
- Always read `src/lib/config/version.ts` to know the current version before classifying
- Never commit `.env.local` or any file containing secrets
- Always run `npx tsc --noEmit` — never leave TypeScript errors
- If a migration is needed, follow the pattern in existing migrations (always include `set search_path to public, extensions;` at top)
- If schema changes, run `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` after pushing
- Keep `PROJECT.md` and `BACKLOG.md` up to date — they are the project's memory
- Version bump is **mandatory** for minor and major stories. Skip only for pure bug fixes.
