# Feature Implementation Plan — FAV-002 Drop-in Alerts + FAV-003 Program Watchlist

**Overall Progress:** `100%`
**Version impact:** minor bump — v2.3 (current) → v2.4 (after)

---

## TLDR

Two new auth-gated user features on the dashboard. **Drop-in Alerts** lets users track a recurring drop-in by name (e.g. "Leisure Skate at Don Mills") and shows upcoming sessions in the next 7 days — no stale data since past sessions fall off naturally. **Program Watchlist** lets users track a specific registered program (course_id + location_id) and shows its live status (Open / Waitlist / Full / Cancelled) with registration dates and a link to register on toronto.ca.

---

## Critical Decisions

- **Drop-in match strategy:** `course_title` ILIKE match against `dropins` table — same as how drop-in search works. No exact course_id since recurring drop-ins reuse the same title across dates.
- **Program match strategy:** Exact `(course_id, location_id)` pair — programs have stable IDs; stale entries shown as "Ended" when `end_date` has passed rather than auto-deleted.
- **Single migration file:** Both tables in one migration (`0026_user_alerts_and_watchlist.sql`) to keep migration count tidy.
- **Separate API routes:** `/api/dropin-alerts` and `/api/program-watchlist` — mirrors the existing `/api/favourites` pattern.
- **Dashboard layout:** Add two new `<section>` blocks below "Saved Venues" in `dashboard/page.tsx`, same visual language (icon + heading + count badge + card grid/list).
- **RLS:** Same pattern as `user_favourites` — `auth.uid() = user_id` for all operations.

---

## Tasks

- [x] 🟩 **Step 1: DB Migration — `0026_user_alerts_and_watchlist.sql`**
  - [x] 🟩 Create `user_dropin_alerts (id, user_id, location_id, course_title, created_at)` with RLS
  - [x] 🟩 Create `user_program_watchlist (id, user_id, course_id, location_id, created_at)` with RLS
  - [x] 🟩 Add unique constraints: `(user_id, location_id, course_title)` and `(user_id, course_id, location_id)`
  - [ ] 🟥 Run migration in Supabase dashboard ← **manual step**

- [x] 🟩 **Step 2: API Route — `/api/dropin-alerts`**
  - [x] 🟩 `GET` — fetch user's alerts + join `dropins` for sessions in next 7 days (group by alert, include sessions array)
  - [x] 🟩 `POST` — insert `(user_id, location_id, course_title)` — 409 if duplicate
  - [x] 🟩 `DELETE` — remove by alert `id`

- [x] 🟩 **Step 3: API Route — `/api/program-watchlist`**
  - [x] 🟩 `GET` — fetch user's watchlist + join `programs` on `(course_id, location_id)` for current status, dates, location name
  - [x] 🟩 `POST` — insert `(user_id, course_id, location_id)` — 409 if duplicate
  - [x] 🟩 `DELETE` — remove by watchlist entry `id`

- [x] 🟩 **Step 4: Dashboard — "Drop-in Alerts" section**
  - [x] 🟩 Fetch from `/api/dropin-alerts` on mount (auth-gated, same pattern as favourites)
  - [x] 🟩 Render a row per alert: venue name + course title + upcoming session pills (date + time)
  - [x] 🟩 Empty state: "No drop-in alerts yet. Add one from the drop-in search." with link to `/activities`
  - [x] 🟩 Remove button (×) per alert row
  - [x] 🟩 "No upcoming sessions" sub-state when alert exists but no matching sessions in next 7 days

- [x] 🟩 **Step 5: Dashboard — "Program Watchlist" section**
  - [x] 🟩 Fetch from `/api/program-watchlist` on mount
  - [x] 🟩 Render a row per watchlist entry: course title + venue + status badge (Open / Waitlist / Full / Cancelled / Ended) + registration date range + enroll link to toronto.ca
  - [x] 🟩 "Ended" badge with remove prompt when `end_date` has passed
  - [x] 🟩 Empty state: "No programs tracked yet. Add one from the programs search." with link to `/activities`
  - [x] 🟩 Remove button (×) per row

- [x] 🟩 **Step 6: Add alert button to `DropInResultsTable`**
  - [x] 🟩 Bell icon button on each row (auth-gated — triggers AuthModal if not signed in)
  - [x] 🟩 Filled/outlined state based on whether `(location_id, course_title)` is already tracked
  - [x] 🟩 POST/DELETE to `/api/dropin-alerts` on click

- [x] 🟩 **Step 7: Add watchlist button to `ProgramsResultsTable`**
  - [x] 🟩 Bookmark icon button on each row (auth-gated)
  - [x] 🟩 Filled/outlined state based on whether `(course_id, location_id)` is already tracked
  - [x] 🟩 POST/DELETE to `/api/program-watchlist` on click

- [x] 🟩 **Final Step: Bump version to v2.4**
  - [x] 🟩 Update `APP_VERSION` in `src/lib/config/version.ts` → `"2.4"`
  - [x] 🟩 Add entry to `VERSION_NOTES`: `"2.4": "Drop-in Alerts + Program Watchlist — track sessions and registrations from your dashboard"`
  - [x] 🟩 Commit: `chore: bump version to v2.4`
