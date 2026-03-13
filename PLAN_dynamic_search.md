# Feature Implementation Plan — Dynamic Search (Drop-ins + Programs)

**Overall Progress:** `100%`
**Version impact:** minor bump — v2.2 (current) → v2.3

## TLDR
After the user's first explicit search (click "Find Drop-ins" / "Find Programs"), subsequent filter changes auto-trigger a new search — with two exceptions: text inputs (venue name, program/activity name) require pressing Enter. Date changes auto-search immediately on picker change. A visual "dirty" state tells the user when results are stale and the Find button needs a click.

---

## Behaviour Spec

| Filter | Cold (no results yet) | Warm (after first search) |
|---|---|---|
| Date (drop-ins) | — | Auto-search on change |
| Date From / Date To (programs) | — | Auto-search on change |
| Activity type dropdown | — | Auto-search on change |
| Sub-activity dropdown / chip | — | Auto-search on change |
| Time of day / custom time | — | Auto-search on change |
| Near Me / district dropdown | — | Auto-search on change |
| Venue name text input | — | Auto-search on **Enter** only |
| Program / query text input | — | Auto-search on **Enter** only |
| Age category (programs) | — | Auto-search on change |
| Find button (explicit) | ✅ Required first time | Also works anytime |

**Visual feedback rules:**
- `filtersDirty = false` (results match current filters): Find button is muted (gray border, normal weight)
- `filtersDirty = true` (filters changed, results stale): Find button pulses with brand border + "Update results" label hint
- During any search (including auto): spinner in Find button; results area shows a translucent loading overlay

---

## Critical Decisions
- **`searchDone` boolean in Section (not FilterPanel):** The Section owns search state; FilterPanel is a controlled form. FilterPanel receives `searchDone` as a read-only prop so it can know when to enable auto-search callbacks.
- **`filtersDirty` in Section:** Becomes `true` when any filter changes after `searchDone`; becomes `false` when a search completes. Passed to FilterPanel to control Find button visual state.
- **Auto-search via `useEffect` in Section:** A single `useEffect` with a dependency array of the "auto-search" fields fires `search()` when `searchDone && !loading`. Text fields are excluded from this effect — they call `onSearch` on `keyDown Enter` instead.
- **Debounce not needed:** All auto-search triggers are discrete events (dropdown selects, date pickers, chip clicks), not free-text keypresses.
- **No API route changes needed:** All logic is purely in the Section + FilterPanel components.
- **Apply identically to both sections:** DropInsSection + DropInFilterPanel, and ProgramsSection + ProgramsFilterPanel get the same pattern.

---

## Tasks

- [x] 🟩 **Step 1: DropInsSection — add `searchDone` + `filtersDirty` + auto-search effect**
  - [x] 🟩 Add `const [searchDone, setSearchDone] = useState(false)`
  - [x] 🟩 Add `const [filtersDirty, setFiltersDirty] = useState(false)`
  - [x] 🟩 In `search()`: set `setSearchDone(true)` and `setFiltersDirty(false)` at start (button enters Searching… state immediately)
  - [x] 🟩 Add `searchDoneRef` + `searchRef` refs to avoid stale closures in effects; updated by dedicated `useEffect`s
  - [x] 🟩 Add auto-search `useEffect` watching discrete fields (`date, activityType, subActivity, selectedPrograms, ageCategory, timeFrom, timeTo, isNearMe, lat, lng, district, radiusKm`) — calls `searchRef.current()` when `searchDoneRef.current`
  - [x] 🟩 Add `handleFilterChange` wrapper: calls `setFilters` + sets `filtersDirty(true)` when warm
  - [x] 🟩 Pass `searchDone` and `filtersDirty` to `<DropInFilterPanel>`
  - [x] 🟩 Results area: `opacity-60 pointer-events-none` on `loading` (warm state refresh feedback)

- [x] 🟩 **Step 2: DropInFilterPanel — Enter key on text inputs + Find button visual state**
  - [x] 🟩 Add `searchDone: boolean` and `filtersDirty: boolean` to `DropInFilterPanelProps`
  - [x] 🟩 Remove `filterChangedSinceSearch` state + all `markChanged()` calls (dirty state now owned by Section)
  - [x] 🟩 `handleSearch()`: remove `setFilterChangedSinceSearch(false)`; keep cold-state activity guard (`!searchDone && !activityChosen && !query`)
  - [x] 🟩 Venue name `<input>` + program query `<input>`: `onKeyDown Enter → handleSearch()` (already present, preserved)
  - [x] 🟩 Find Drop-ins button: `isPending = !searchDone || filtersDirty`; pulses when pending; label = "Update Results" when `searchDone && filtersDirty`

- [x] 🟩 **Step 3: ProgramsSection — same pattern as Step 1**
  - [x] 🟩 Add `searchDone` + `filtersDirty` states + `searchDoneRef` + `searchRef` refs
  - [x] 🟩 Set `searchDone(true)` + `filtersDirty(false)` at start of `search()`
  - [x] 🟩 Auto-search `useEffect` watching: `[dateFrom, dateTo, timeOfDay, activityType, subActivity, ageCategory, isNearMe, lat, lng, district, radiusKm]`
  - [x] 🟩 `handleFilterChange` wrapper marks dirty when warm; stable (reads ref only)
  - [x] 🟩 Pass `searchDone` + `filtersDirty` to `<ProgramsFilterPanel>`
  - [x] 🟩 Results area: `opacity-60 pointer-events-none` on `loading`

- [x] 🟩 **Step 4: ProgramsFilterPanel — Enter key on text inputs + Find button visual state**
  - [x] 🟩 Add `searchDone: boolean` and `filtersDirty: boolean` to `ProgramsFilterPanelProps`
  - [x] 🟩 Remove `filterChangedSinceSearch` state + all `markChanged()` calls
  - [x] 🟩 Venue search `<input>` + query `<input>`: `onKeyDown Enter → handleSearch()` (preserved)
  - [x] 🟩 Find Programs button: `isPending = !searchDone || filtersDirty`; label = "Update Results" when dirty+warm

- [x] 🟩 **Final Step: Bump version to v2.3**
  - [x] 🟩 Update `APP_VERSION` in `src/lib/config/version.ts` to `"2.3"`
  - [x] 🟩 Add to `VERSION_NOTES`: `"2.3": "Smart search — filters auto-refresh results after your first search"`
  - [x] 🟩 Update `PROJECT.md` — Phase 26 entry + last updated date
