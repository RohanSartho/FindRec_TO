# RecTO — Product Backlog

## 🏷️ Data & Infrastructure

### [DATA-001] Free Centre Flag on Locations
**Priority:** Medium
**Context:** Toronto Parks & Recreation operates a set of "Free Centres" where
all programs are free regardless of income. Currently we show `operated_by`
(PFR, Arena Board, etc.) but have no machine-readable flag for free vs paid.
**Acceptance Criteria:**
- Add `is_free_centre boolean default false` column to `locations` table
- Populate from Toronto's published free centres list:
  https://www.toronto.ca/explore-enjoy/parks-recreation/how-to-use-our-services/how-to-register-for-recreation-programs/free-lower-cost-recreation-options/
- Show "Free Centre" badge on RinkCard and detail page
- Add to weekly CKAN sync: check if location name matches known free centres list
**Effort:** M (schema migration + manual data entry + UI badge)

---

## 🔔 Notifications & Seasonal

### [NOTIF-001] Seasonal Change Notification on Login
**Priority:** Medium  
**Context:** Season detection is live (`seasons` table, `is_current` flag).
When a new season is detected by `ingest-ckan`, logged-in users should see
a banner on next login saying "New season schedule is now available."
**Acceptance Criteria:**
- Add `last_season_seen_id` column to a user preferences table
- On login, compare to current `seasons.id`
- If different, show dismissible banner: "Winter 2026 programs are now available"
- Dismissing updates `last_season_seen_id`
**Effort:** M (new table + auth hook update + banner component)

---

## 🗺️ Discovery & UX

### [UX-003] Google Places Enrichment — Hours + Address Gaps
**Priority:** Medium
**Context:** Users want to see venue hours of operation on the detail page
(e.g. "Mon–Fri 6am–11pm"). Toronto's CKAN API has no hours data.
Additionally, a small number of venues (~3) have no address even after the
CKAN component-field backfill (migration 0012) — Google Places can fill both.

**Background on addresses (already partially solved):**
- Migration 0012 backfilled addresses for 1,922 of 1,925 CKAN locations by
  constructing address from CKAN split fields (Street No / Street Name / etc.)
  The ingest function was also fixed to do this going forward.
- ~3 CKAN locations had no street data at all. Some DB locations (from rinks
  datasets) may also be missing. Google Places can resolve these.

**Technical approach:**
- Add `google_place_id text` and `hours_json jsonb` columns to `locations` table (migration)
- Create a one-time admin script (`scripts/fetch-google-places.mjs`) that:
  1. Iterates all `location_ids` with a name + address (or name alone)
  2. Calls Google Places **Text Search** API to resolve `place_id`
  3. Calls Google Places **Place Details** API (`fields=formatted_address,opening_hours`)
  4. Upserts `google_place_id`, `hours_json`, and `address` (only where currently NULL)
     into `locations`
- Venue detail page reads `hours_json` and renders a weekday hours table
- Fallback: if `hours_json` is null, show nothing (no empty section)

**Prerequisites:**
- Google Cloud project with **Places API (New)** enabled and billing configured
- `GOOGLE_PLACES_API_KEY` added to `.env.local` and Vercel env vars

**Cost estimate:** ~$2.30 USD for a one-time full scan of 135 rinks
(Place Details: $17/1000 requests × 135 venues + ~135 Text Search calls)

**Acceptance Criteria:**
- [ ] Migration adds `google_place_id` + `hours_json` to `locations`
- [ ] Fetch script resolves place_id and stores hours for ≥ 80% of indoor rinks
- [ ] Fetch script fills `address` for any location where it is still NULL
- [ ] Venue detail page shows hours section when data is available
- [ ] Outdoor rinks / pads with no Google listing handled gracefully
- [ ] `GOOGLE_PLACES_API_KEY` documented in README / env variable list

**Effort:** M (migration + fetch script + UI section)

### [UX-001] Map View for Rink Discovery
**Priority:** Medium
**Context:** Geo search works (`locations_near` RPC). A map view would let
users visually discover rinks near them rather than scanning a grid.
**Acceptance Criteria:**
- Toggle between grid view and map view on /skating page
- Map pins show rink type (indoor/outdoor) with colour coding
- Clicking a pin opens rink detail
- Consider: Mapbox free tier or Leaflet + OpenStreetMap (no API cost)
**Effort:** L

### [UX-002] Program Schedule Export / Add to Calendar
**Priority:** Low
**Context:** Users find a skating program they want. Let them add it to
Google Calendar or download an .ics file.
**Effort:** S

---

## 📊 Analytics & Admin

### [ADMIN-001] Sync Health Dashboard
**Priority:** Low
**Context:** `sync_log` table tracks every ingest run. Build a simple
internal page at `/admin/sync` showing last sync time, row counts,
and any failures.
**Effort:** S