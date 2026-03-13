# Feature Implementation Plan

**Overall Progress:** `100%`
**Version impact:** patch — v2.2 (current) → v2.2.1 (after)

## TLDR
Two UX polish tasks: move the version badge to the right of the sign-in button in the navbar (it was left of sign-in), and confirm/enable column sorting on the drop-in results table (Location, Venue Type, Time). Also clean up the fully-completed REFACTOR_PLAN.md.

## Critical Decisions
- **Version badge position:** Placed after the entire auth section (`{!loading && ...}`) so it always appears rightmost regardless of auth state (signed-in or not)
- **Drop-in sorting:** Already fully implemented in `DropInResultsTable.tsx` — no code change needed; confirmed live
- **REFACTOR_PLAN.md:** All 7 steps were marked `[x]` complete (100%); deleted the file outright rather than archiving

## Tasks

- [x] 🟩 **Step 1: Move version badge in Navbar**
  - [x] 🟩 Remove version badge `<div>` from before the `{!loading && ...}` auth block
  - [x] 🟩 Re-insert version badge after the closing `</>` of the auth block, still inside the outer `flex items-center gap-2` container

- [x] 🟩 **Step 2: Verify drop-in column sorting**
  - [x] 🟩 Confirm `SortCol`, `SortDir`, `sortSessions`, `handleSort`, `SortIcon` already exist in `DropInResultsTable.tsx`
  - [x] 🟩 Confirm Location, Venue Type, Time headers already have sort buttons — no changes needed

- [x] 🟩 **Step 3: Delete REFACTOR_PLAN.md**
  - [x] 🟩 Read file — all 7 tasks marked complete
  - [x] 🟩 Delete file + include in same commit

- [ ] 🟥 **Final Step: Bump version to v2.2.1**
  - [ ] 🟥 Update `APP_VERSION` in `src/lib/config/version.ts` to `"2.2.1"`
  - [ ] 🟥 Add entry to `VERSION_NOTES`: `"2.2.1": "Version badge moved to top-right of navbar; drop-in table column sorting"`
  - [ ] 🟥 Commit: `chore: bump version to v2.2.1`
