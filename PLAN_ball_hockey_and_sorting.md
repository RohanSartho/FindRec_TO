# Feature Implementation Plan

**Overall Progress:** `100%`

## TLDR
Two fixes: (1) "Ball Hockey" is misclassified as Skating because `inferActivityType` matches the word "hockey" broadly — fix by adding an early guard in the ingest function, a DB backfill migration, and adding "Ball Hockey" to `SHARED_SPORTS` config. (2) Add client-side sortable columns (Program, Location, Dates) to `ProgramsResultsTable`, defaulting to most-recent start date on top, replacing the current within-group status-priority sort.

## Critical Decisions
- **Ball Hockey DB fix via migration** — backfill both `programs` and `dropins` tables with `ILIKE '%ball hockey%'`; set `activity_type = 'sports'` and `sub_activity = 'Ball Hockey'`
- **ingest-ckan guard added before the broad `hockey` check** — `val.includes("ball hockey")` → `"sports"` must come first so future ingests are correct
- **`Ball Hockey` added to `SHARED_SPORTS`** — shared array used by both `SUB_ACTIVITY_MAP` and `PROGRAMS_SUB_ACTIVITY_MAP`, so one addition covers both drop-in and programs filters
- **Sort is per-group, shared sort state** — all activity-type groups respect the same sort column/direction simultaneously; simplest UX
- **Default sort: `start_date` descending** — most recent dates on top; replaces the current within-group status-priority default sort (status is still visible via badge)
- **Sort arrows on Program, Location, Dates columns only** — as specified; Days/Time/Age/Status remain unsortable

---

## Tasks

- [x] 🟩 **Step 1: DB migration — backfill Ball Hockey**
  - [x] 🟩 Created `supabase/migrations/0022_backfill_ball_hockey.sql`
  - [x] 🟩 `UPDATE programs SET activity_type = 'sports', sub_activity = 'Ball Hockey' WHERE course_title ILIKE '%ball hockey%'`
  - [x] 🟩 `UPDATE dropins SET activity_type = 'sports', sub_activity = 'Ball Hockey' WHERE course_title ILIKE '%ball hockey%'`

- [x] 🟩 **Step 2: Fix `inferActivityType` in ingest-ckan**
  - [x] 🟩 Added `if (val.includes("ball hockey")) return "sports";` before the broad `hockey` check

- [x] 🟩 **Step 3: Add "Ball Hockey" to config**
  - [x] 🟩 Added `{ value: "Ball Hockey", label: "Ball Hockey" }` to `SHARED_SPORTS` in `dropinFilters.ts`
  - [x] 🟩 Covered by both `SUB_ACTIVITY_MAP.sports` and `PROGRAMS_SUB_ACTIVITY_MAP.sports`

- [x] 🟩 **Step 4: Sortable columns in `ProgramsResultsTable`**
  - [x] 🟩 Added `sortCol` / `sortDir` state; default `{ col: "date", dir: "desc" }`
  - [x] 🟩 Added `sortPrograms()` comparator; replaced within-group status sort
  - [x] 🟩 Added `SortIcon` helper using `ChevronUp` / `ChevronDown` / `ChevronsUpDown`
  - [x] 🟩 Wired sort buttons onto Program, Location, Dates `<th>` headers
