# Codebase Refactor Plan

**Overall Progress:** `100%`

## TLDR
Reduce bloat across the frontend by extracting repeated patterns into shared utilities and small components. The biggest gains are: a shared `useNearMe` hook (geo handler is copy-pasted 3×), a shared `ViewToggle` component (toggle buttons duplicated 3×), a data-driven `StatusBadge` (5 near-identical if-blocks), shared filter constants (`filterBorder`/`BRAND_BORDER` duplicated across two panels), and splitting the 720-line `activities/page.tsx` into focused pieces. Also deduplicate config data in `dropinFilters.ts` and `dropin-search/route.ts`.

## Critical Decisions
- **No new abstractions for their own sake** — only extract when the same code appears 2+ times or a component exceeds ~200 lines
- **Shared UI extracted to `src/components/ui/`** — `ViewToggle` goes there alongside `StatusBadge`, `AuthModal`, etc.
- **Shared hook extracted to `src/lib/hooks/`** — alongside existing `useAuth` and `useFavourite`
- **Shared filter constants to `src/lib/config/filterUI.ts`** — small constants consumed by both filter panels
- **No splitting of API routes** — they are clean and focused already
- **`SKATING_COURSE_TITLES` in route derived from config** — eliminates a 35-line list maintained in two places

---

## Tasks

- [x] 🟩 **Step 1: Shared `filterBorder` + `BRAND_BORDER` constant**
  - [x] 🟩 Created `src/lib/config/filterUI.ts`
  - [x] 🟩 Removed duplicates from `DropInFilterPanel.tsx` and `ProgramsFilterPanel.tsx`

- [x] 🟩 **Step 2: Extract `useNearMe` hook**
  - [x] 🟩 Created `src/lib/hooks/useNearMe.ts`
  - [x] 🟩 Replaced 3× copy-pasted geo handler in `DropInFilterPanel`, `ProgramsFilterPanel`, `VenuesSection`

- [x] 🟩 **Step 3: Extract `ViewToggle` component**
  - [x] 🟩 Created `src/components/ui/ViewToggle.tsx`
  - [x] 🟩 Used in `VenuesSection`, `DropInsSection`, `ProgramsSection`

- [x] 🟩 **Step 4: Simplify `StatusBadge`**
  - [x] 🟩 Replaced 5 if-blocks with `STATUS_CONFIG` map → single render path in `ProgramsResultsTable.tsx`

- [x] 🟩 **Step 5: Deduplicate `SUB_ACTIVITY_MAP`**
  - [x] 🟩 Defined `SHARED_FITNESS`, `SHARED_ARTS`, `SHARED_SPORTS` once; both maps reference them

- [x] 🟩 **Step 6: Derive `SKATING_COURSE_TITLES` from config**
  - [x] 🟩 Replaced 35-line hardcoded list with `DROPIN_FILTER_OPTIONS.flatMap(o => o.courseTitles)`

- [x] 🟩 **Step 7: Split `activities/page.tsx`**
  - [x] 🟩 Created `VenuesSection` (`src/components/venues/VenuesSection.tsx`)
  - [x] 🟩 Created `DropInsSection` (`src/components/dropin/DropInsSection.tsx`)
  - [x] 🟩 Created `ProgramsSection` (`src/components/programs/ProgramsSection.tsx`)
  - [x] 🟩 `activities/page.tsx` reduced from 720 → 62 lines; sections stay mounted (CSS hidden) so filter state is preserved across tab switches
