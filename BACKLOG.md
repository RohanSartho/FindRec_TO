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