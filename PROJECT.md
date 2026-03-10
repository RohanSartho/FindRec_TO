# FindRec TO — Project Memory

> Last updated: 2026-03-09 (v2.2 — feedback widget Report Bug / Suggest Feature → Linear)
> Read this file at the start of every session before doing anything.

---

## What We're Building

**FindRec TO** is a public-facing web app — one-stop destination for Toronto Parks & Recreation activities. Users can find skating rinks, drop-in programs, and facility schedules without navigating the City of Toronto website.

**Repo:** https://github.com/RohanSartho/FindRec_TO
**Local:** `toronto-parks/` directory
**Live:** Not yet deployed (Vercel — pending)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4, App Router |
| State | React Context (FavouritesContext), useState |
| Backend | Supabase (Postgres + PostGIS + RLS + Auth + Edge Functions) |
| Data | Toronto Open Data (CKAN API) — Open Government Licence |
| Auth | Supabase Auth — Google OAuth + email/password |
| Hosting | Vercel (not yet deployed) |
| Analytics | PostHog (posthog-js + posthog-js/react) |
| Repo | GitHub private — RohanSartho/FindRec_TO |
| AI assist | Claude Code (you) |

---

## Architecture

### Data Flow
```
Toronto CKAN (weekly) ──→ Edge Function: ingest-ckan ──→ Supabase Postgres
Toronto Live JSON (15min) ──→ Edge Function: ingest-live-status ──→ Postgres
                                                                        ↓
                                                               Next.js API Routes
                                                                        ↓
                                                                     Client
```

### Database Tables (Supabase)
| Table | Rows | Purpose |
|---|---|---|
| `locations` | 1,941 | Master anchor — all PFR locations with PostGIS coords |
| `rinks` | 135 | Indoor + outdoor ice rinks (63 indoor, 69 outdoor, 3 stubs) |
| `rink_live_status` | rolling 48hr | Real-time open/closed/service_alert feed |
| `facilities` | 7,212 | Amenities per location |
| `programs` | 34,108 | Registered programs (weekly refresh) |
| `dropins` | 29,034 | Drop-in sessions — one row per session occurrence |
| `seasons` | 1 | Auto-detected season windows (Fall 2025: Sep 2–Jun 19) |
| `user_favourites` | — | Auth-gated saved locations |
| `sync_log` | — | Ingest run history |

### Key Data Facts
- Drop-ins: each row = one session on one date (`first_date = last_date` for most)
- Programs: age in **months** (normalized from CKAN's inconsistent months/years)
- `From To` dates in programs were non-ISO (`Jan-05-2026`) — parsed at ingest
- 102/135 rink locations have PostGIS coordinates
- 3 orphan asset IDs not in CKAN: 14300, 14076, 37126 (stub rows inserted)
- Distinct districts: Etobicoke York, North York, Scarborough, Toronto and East York

### Migrations (in order)
| File | Purpose |
|---|---|
| `0001_initial_schema.sql` | All 8 tables, PostGIS, RLS, triggers |
| `0002_sync_log.sql` | Sync run tracking |
| `0003_postgis_helpers.sql` | `set_location_coordinates`, `locations_near` RPCs |
| `0004_schema_additions.sql` | `last_synced_at`, `data_source`, dropin unique constraint fix |
| `0005_orphan_rink_stubs.sql` | 3 orphan location + rink stubs |
| `0006_coordinate_backfill_helper.sql` | Backfill PostGIS coords from raw_geometry |
| `0007_dropin_unique_fix.sql` | Correct unique key: (course_id, location_id, first_date) |
| `0011_sub_activity.sql` | Add sub_activity column to dropins + programs; fix Pickleball/Badminton/Tai Chi activity_type; backfill sub_activity via ILIKE |
| `0012_backfill_addresses.sql` | Backfill address + postal_code for 1,922 locations from CKAN component fields (Street No / Street Name / Street Type / Street Direction) |
| `0013_venue_type.sql` | Add venue_type TEXT column to locations (indoor/outdoor) |
| `0014_backfill_venue_types.sql` | Backfill venue_type from CKAN facilities (147 indoor, 291 outdoor) |
| `0015_location_lat_lng.sql` | Add lat/lng float columns to locations, backfilled from PostGIS coordinates |
| `0016_backfill_missing_coords.sql` | Manual geocode for 7 active community centres that had no geometry (Adam Beck, Annette, Beaches, Bedford Park, Bob Abate, David Appleton, Eglinton Flats) |
| `0017_locations_near_fix.sql` | Fix `locations_near` RPC — SQL param collision with `lat`/`lng` column names |
| `0018_backfill_missing_coords.sql` | Geocode all 227 active venues (appearing in dropins or programs) with `lat IS NULL`; 225 via Nominatim + 2 manual; covers aquatics pools, community centres, arenas, schools |
| `0019_activity_location_ids_rpc.sql` | New RPC `location_ids_for_activity(p_activity_type, p_sub_activity)` — UNION DISTINCT on dropins+programs to bypass Supabase 1000-row cap; fixes aquatics venues missing from map (was 5/16, now 76 locations) |
| `0020_remove_timbrell_stub.sql` | Delete fake rink stub (asset_id=99001) inserted for Dennis R. Timbrell in Phase 11 — caused wrong `/skating/99001` routing |
| `0021_fix_aquatic_fitness_sub_activity.sql` | Correct sub_activity for all "Aquatic Fitness: …" drop-ins from "Leisure Swim" (wrong ILIKE backfill in 0011) to "Aquafit" |
| `0022_dropin_unique_add_start_time.sql` | Add start_time to dropin unique key — multiple time slots per course_id on same day |
| `0023_backfill_districts.sql` | Backfill district field on locations |
| `0024_backfill_programs_aquatics_sub_activity.sql` | Backfill sub_activity for aquatics programs |
| `0025_backfill_ball_hockey.sql` | Reclassify Ball Hockey from `skating` → `sports`; set `sub_activity = 'Ball Hockey'` on both programs + dropins |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/rinks` | GET | List rinks — filters: type, district, lat/lng/radius |
| `/api/rinks/[id]` | GET | Single rink with location + live status |
| `/api/rinks/[id]/status` | GET | Live status only (lightweight polling) |
| `/api/rinks/[id]/programs` | GET | Timetable — dropins + programs by view/date |
| `/api/venues` | GET | All venues enriched with activity_types + rink info; filters: activity_type, sub_activity, rink_type, district, geo |
| `/api/locations/[id]/programs` | GET | Timetable by location_id (for non-rink venues); includes sub_activity |
| `/api/dropin-search` | GET | Drop-in sessions — skating mode (program_types chips) or non-skating mode (activity_type + sub_activity); filters: date, district, geo, time |
| `/api/programs` | GET | Programs — filters: location_id, activity_type, date |
| `/api/programs-search` | GET | Registered programs search — filters: date_from/date_to (overlap), time_of_day, activity_type, sub_activity, district/geo, age_category, q (text searches both activity_title + course_title); 300-row cap; client-side sort by location name |
| `/api/districts` | GET | Distinct districts for filter UI |
| `/api/seasons` | GET | Season list |
| `/api/favourites` | GET/POST/DELETE | Auth-gated user favourites |
| `/api/admin/auth` | POST | Validate admin passphrase, set `admin_token` httpOnly cookie (8hr) |

---

## Pages

| Route | Type | Purpose |
|---|---|---|
| `/` | Server | Home — hero + CTA |
| `/activities` | Client | Venues browser (all activities) + Drop-ins Today mode |
| `/skating/[asset_id]` | Server | Rink detail — info + timetable |
| `/venues/[location_id]` | Server | Non-rink venue detail — info + schedule |
| `/favourites` | Client | Auth-gated saved locations |
| `/auth/callback` | Route Handler | Supabase OAuth callback |
| `/auth/error` | Server | Auth error fallback |
| `/internal-ops-findrecto/login` | Server | Admin login (posts to /api/admin/auth) |
| `/internal-ops-findrecto` | Server | Admin dashboard — PostHog analytics (cookie-gated) |

---

## Key Components
```
src/
├── components/
│   ├── dropin/
│   │   ├── DropInFilterPanel.tsx   # Activity type + sub-activity chips; Program type chips (skating only); location, date, time-of-day filters
│   │   └── DropInResultsTable.tsx  # Grouped sessions table with Free badge; links to /venues/{location_id} with returnTo param
│   ├── programs/
│   │   ├── ProgramsFilterPanel.tsx # Date range (From/To), time of day, location, activity + sub-activity chips, age category, text search; same pulsing-border UX as DropInFilterPanel
│   │   └── ProgramsResultsTable.tsx # Flat results table: Program | Location | Days | Dates | Time | Age | Status (Full/Open/Cancelled) | Price; venue links with returnTo
│   ├── layout/
│   │   ├── Navbar.tsx              # Sticky nav, auth state, user menu
│   │   └── Footer.tsx              # Site footer — Open Data credit + version badge (v2.1) with hover changelog
│   ├── map/
│   │   ├── VenueMapView.tsx        # Mapbox map for Find Venues tab — markers + popup (name, address, chips, link)
│   │   └── DropInMapView.tsx       # Mapbox map for Drop-ins tab — unique location markers with session time popups
│   ├── rinks/
│   │   ├── RinkCard.tsx            # Card — live status, full-card link, colored type badge
│   │   ├── RinkListItem.tsx        # Compact list row (list view mode)
│   │   └── Timetable.tsx           # Day/Week schedule view; accepts assetId OR locationId
│   ├── venues/
│   │   └── VenueCard.tsx           # Generic venue card — activity chips, rink badge, favourite
│   ├── analytics/
│   │   ├── PostHogProvider.tsx     # PHProvider wrapper + SPA pageview tracker
│   │   └── AnalyticsPageEvent.tsx  # Client bridge: fires posthog event on mount (for server pages)
│   ├── admin/
│   │   ├── KpiCard.tsx             # Metric tile (label, value, optional trend)
│   │   └── AdminChart.tsx          # Recharts bar/line chart for admin sections
│   └── ui/
│       ├── AuthModal.tsx           # Google OAuth + email sign in/up
│       ├── ScrollHint.tsx          # Mobile scroll-hint pill (triggerKey prop — re-shows on each Find click, 30s)
│       └── StatusBadge.tsx         # open/closed/service_alert/unknown
├── lib/
│   ├── config/
│   │   ├── dropinFilters.ts        # Program filter options + districts + radius + ACTIVITY_FILTER_OPTIONS + SUB_ACTIVITY_MAP
│   │   └── version.ts              # APP_VERSION ("2.1") + VERSION_NOTES changelog map
│   ├── context/
│   │   └── FavouritesContext.tsx   # Single fetch, optimistic toggle, shared state
│   ├── hooks/
│   │   ├── useAuth.ts              # User state, sign in/out methods
│   │   └── useFavourite.ts         # Per-location favourite state via context
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (App Router)
│   │   └── types.ts                # Generated DB types
│   └── utils/
│       └── timetable.ts            # formatTime, formatAgeRange, compactTitle, activityTypeColor
└── middleware.ts                   # Session refresh + /api/favourites auth guard
```

---

## Edge Functions (Supabase)

| Function | Schedule | Purpose |
|---|---|---|
| `ingest-ckan` | Sunday 7am UTC | Fetch all CKAN datasets, normalize, upsert |
| `ingest-live-status` | Every 15 min | Fetch live rink status JSON, insert, prune 48hr |

### ingest-ckan processes (in order):
1. Locations (from programs dataset)
2. Indoor rinks + location geometry
3. Outdoor rinks + location geometry
4. Registered programs (normalized dates + ages)
5. Drop-ins (one row per session, correct unique key)
6. Facilities
7. Season detection + backfill season_id
8. Coordinate extraction from raw_geometry

---

## Known Issues / Gotchas

| Issue | Status | Notes |
|---|---|---|
| 33 locations missing coordinates | Fixed | Migration 0018 geocoded all 227 active venues with missing coords via Nominatim; 2 manual fixes for Nominatim misses |
| `pad_length_ft` null on outdoor rinks | Open | CKAN doesn't include for outdoor |
| 2,437 facilities skipped | Open | location_id not in our locations table |
| Outdoor aquatics absent in winter | Expected | Outdoor pools run June–September only; sessions don't appear in CKAN until ~May when City publishes summer schedules |
| District filter needs 2-step query | Fixed | PostgREST can't filter parent via join |
| Dennis R. Timbrell not showing in aquatics filter | Fixed | Root cause: Supabase 1000-row cap in `/api/venues`; fixed via RPC (migration 0019) |
| Dennis R. Timbrell routing to `/skating/99001` | Fixed | Removed fake rink stub (migration 0020); context-aware `venueHref()` in VenueCard |
| Monday empty in Timbrell calendar | Fixed | Timezone bug: `new Date(dateParam)` parsed as UTC causing wrong weekday; fixed with `new Date(dateParam + "T00:00:00")` in both programs API routes |
| Aquatic Fitness sub_activity wrong | Fixed | Migration 0021 corrected "Aquatic Fitness: …" from "Leisure Swim" → "Aquafit" |
| Ball Hockey misclassified as Skating | Fixed | `inferActivityType` matched "hockey" broadly; added early guard for "ball hockey" → "sports"; migration 0025 backfilled DB |
| Baseball results incomplete | Fixed | `q` text search in `/api/programs-search` was only checking `activity_title`; now ORs `course_title` too |
| Dropin dedup wrong unique key | Fixed | Was (course_id, location_id), now (+first_date) |
| PostGIS in extensions schema | Fixed | Add `set search_path to public, extensions` to all migrations |
| Next.js 15 params are Promise | Fixed | Always `await params` in dynamic routes |
| AbortError "lock broken" on all pages | Fixed | Next.js 15 Web Lock cookie race; `createClient()` in `server.ts` now catches AbortError at both `await cookies()` and `cookieStore.getAll()`, falling back to anonymous session; same guard in `auth/callback/route.ts`; handler-level catch in all `/api/favourites` handlers |
| Admin dashboard dark theme mismatch | Fixed | Restyled `/internal-ops-findrecto` + login page to match site-wide palette: `#f5f2ec` bg, white cards, brand green Fraunces headings, gray-100 borders |

---

## Backlog

See `BACKLOG.md` for tracked stories.

Key items:
- `[DATA-001]` Free Centre flag on locations
- `[NOTIF-001]` Seasonal change notification on login
- `[UX-001]` Map view — **Done (Phase 15)**
- `[UX-002]` Add to Calendar
- `[ADMIN-001]` Sync health dashboard

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_MAPBOX_TOKEN=        # public token (pk.eyJ1...) — styles:read, tiles:read, fonts:read
NEXT_PUBLIC_POSTHOG_KEY=         # phc_... — browser PostHog project key
NEXT_PUBLIC_POSTHOG_HOST=        # https://us.i.posthog.com
POSTHOG_PRIVATE_KEY=             # phx_... — server-only, for HogQL Query API
POSTHOG_PROJECT_ID=              # numeric PostHog project ID
ADMIN_SECRET=                    # passphrase for /internal-ops-findrecto (64-char hex)
```

Never commit `.env.local`. Keys are in Supabase dashboard → Settings → API.

### PostHog Events Tracked
| Event | Where | Key Properties |
|---|---|---|
| `$pageview` | PostHogProvider | `$current_url` |
| `auth_login` | useAuth, AuthModal | `method` (google/email) |
| `auth_signup` | AuthModal | `method` (email) |
| `dropin_search` | DropInsSection | `activity_type, sub_activity, date, time_of_day, location_mode, district` |
| `dropin_search_empty` | DropInsSection | same |
| `dropin_result_venue_click` | DropInResultsTable | `location_id, location_name, activity_type` |
| `programs_search` | ProgramsSection | `activity_type, sub_activity, date_from, date_to, time_of_day, age_category, location_mode, district, query` |
| `programs_search_empty` | ProgramsSection | same |
| `programs_result_venue_click` | ProgramsResultsTable | `location_id, location_name, activity_type, sub_activity` |
| `map_near_me_click` | VenuesSection | `tab` |
| `venues_filter_applied` | VenuesSection | `activity_type, sub_activity, view_mode` |
| `venues_view_toggle` | VenuesSection | `view_mode` |
| `venue_card_click` | VenueCard | `location_id, location_name, activity_type` |
| `map_marker_click` | VenueMapView, DropInMapView | `location_id, location_name` |
| `favourite_add` / `favourite_remove` | useFavourite | `location_id, location_name` |
| `timetable_view` | Timetable | `location_id, view, sub_filter` |
| `venue_detail_view` | /venues/[id] | `location_id, location_name` |
| `rink_detail_view` | /skating/[id] | `asset_id, location_name` |

---

## Commands Reference
```bash
# Dev
npm run dev                                    # Start local dev server

# Supabase
npx supabase db push                           # Apply pending migrations
npx supabase functions deploy <name>           # Deploy edge function
npx supabase functions invoke <name>           # Manually trigger function
npx supabase gen types typescript --linked > src/lib/supabase/types.ts

# Git
git add . && git commit -m "..." && git push   # Commit and push to main

# TypeScript
npx tsc --noEmit                               # Check for type errors
```

---

## Phase History

| Phase | What Was Built |
|---|---|
| 1 | Supabase project, schema, PostGIS, migrations 0001 |
| 2 | ingest-ckan + ingest-live-status Edge Functions, sync_log |
| 3 | Facilities ingestion, season detection, orphan stubs, Supabase client, API routes |
| 4 | Coordinate backfill, auth middleware, favourites/programs/districts APIs |
| 5 | Auth UI, Navbar, RinkCard, /skating page, /favourites page |
| 6 | District filter fix, FavouritesContext, rink detail page, timetable |
| Hotfix | Dropin unique key fix, re-ingest (5,130 → 29,034 rows) |
| 7 | Drop-in search mode, DropInFilterPanel, DropInResultsTable |
| 8 | 6 UX fixes: right-click cards, alpha sort, remove All tab, filter button position, independent scroll, Maps links |
| 9 | 8 UX improvements: full card click, sport filter in timetable, venue font polish, remove status badge, wider drop-ins layout, bolder filter border, side-by-side location controls, table font bump |
| 10 | 12 UX improvements: live status in grid, no unknown badge, pointer-events fix, colored type badge, grid/list toggle, name search, Near Me X + radius in grid, time-of-day filter in drop-ins, Free badge on outdoor sessions, Google Maps + web links in venue detail |
| 11 | Custom time range filter (preset chips + From/To dropdowns, overlap logic), Toronto.ca official venue page links, Dennis R. Timbrell address + coords + indoor type corrections |
| 12 | Venues browser redesign — /skating renamed /activities, shows all community centres; Activity filter dropdown (skating/fitness/aquatics/arts/sports); conditional Indoor/Outdoor dropdown for skating; /api/venues + /api/locations/[id]/programs; VenueCard; /venues/[location_id] detail page; Navbar "Explore" |
| 13 | sub_activity column on dropins + programs (migration 0011); inferActivityType bug fix (Pickleball/Badminton/Tai Chi now correctly classified); SUB_ACTIVITY_MAP config; sub-activity dropdown in venues browser; sub-activity chips in DropInFilterPanel; sport+sub-activity dropdowns in Timetable; non-skating drop-in search mode |
| 14 | Address backfill: discovered CKAN locations resource has split fields (Street No/Name/Type/Dir) not a single "Address" field. Script fetched 1,925 records, generated migration 0012 with 1,922 UPDATEs. Fixed ingest-ckan to build address from components going forward. [UX-003] updated to cover remaining gap via Google Places. |
| 15 | Mapbox map view: migration 0015 (lat/lng cols on locations), VenueMapView + DropInMapView components (react-map-gl v8 + mapbox-gl v3), Grid/List/Map toggle in Find Venues, List/Map toggle in Drop-ins. Requires NEXT_PUBLIC_MAPBOX_TOKEN in env. Near Me + user location pulsing dot on maps. Migration 0017 fixed locations_near SQL param collision. Timetable calendar + week category grouping view. |
| 16 | Activities page nav redesign: replaced pill toggle with border-2 icon+text tab cards (Community Centres / Drop-in Activities / Registered Programs). Search bar white bg. View toggle reordered Map→Grid→List with labels. Compact list VenueCard (horizontal row, dot indicator, tighter gap-1.5). Registered Programs placeholder tab. |
| 17 | Timetable UX overhaul: default to Calendar view, reordered tabs (Calendar→Today→Week), compact ‹/› prev-next navigation, sport + sub-filter grouped flex-nowrap, compact alternating week-list rows. Map coord backfill: amber warning banner in VenueMapView for venues missing coords; script `geocode-all-missing-coords.mjs` paginates all 63K dropin/program rows to find 315 active location IDs, geocodes 227 with missing lat/lng via Nominatim; migration 0018 applied — aquatics map improved from 5/16 → 16/16 venues. |
| 18 | Routing + data-quality fixes: RPC for activity location IDs (0019) bypasses Supabase 1000-row cap; remove fake Timbrell rink stub (0020); context-aware VenueHref in VenueCard routes to /skating only when skating filter active; filter context preserved in URL (?activity=&sub=) when navigating to venue; Timetable accepts defaultSubFilter prop; timezone bug fixed in both programs API routes (new Date + "T00:00:00"); Aquatic Fitness sub_activity corrected to Aquafit (0021). |
| 19 | Drop-in Filter UX overhaul: layout reorder (Date + Time side-by-side, Location moved up); blinking border attention indicators on all filter sections (pulse stops on touch, border persists); Near Me chip highlighted in brand green; activity type converted to dropdown select; skating sub-type buttons (Leisure/Shinny/Learn to Skate); Leisure opens age filter with default "All Ages" + "Adult 19+"; fitness/aquatics sub-filters allow multi-select; Find Drop-ins button pulses until clicked; dynamic result refresh after first search when sub-filters change. |
| 20 | Venue routing migration + filter preservation: all drop-in search result venue links unified to /venues/{location_id} (was /skating/{asset_id} for rinks, no link for non-rink venues); same fix applied to DropInMapView popup; drop-in filter state encoded in ?returnTo=… URL param on venue links; venue detail Back button uses returnTo href; filter state initialized from URL params on mount; auto-search on back-nav via autoSearchDone ref. |
| 21 | Registered Programs search: /api/programs-search route (date overlap, null-safe age OR filter, time-of-day, activity/sub, geo/district, text ILIKE, 300-row cap, client-side sort); ProgramsFilterPanel (Date From/To, Time of Day dropdown, Location Near Me/District, Activity + sub-activity chips from SUB_ACTIVITY_MAP, Age Category select, text search, pulsing Find Programs button); ProgramsResultsTable (8 columns, StatusBadge Full/Open/Cancelled, returnTo venue links, truncation warning); programs tab wired into /activities page with URL-param state init + auto-search on back-nav. |
| 22 | Bug fixes + UX: Ball Hockey reclassified from skating → sports (migration 0025 + ingest-ckan guard); "Ball Hockey" added to SHARED_SPORTS config; baseball/programs q-search fixed to OR both activity_title + course_title; ProgramsResultsTable sortable columns (Program/Location/Dates with ↑↓ arrows, default date desc); VenuesSection filter UX — district + venue-type dropdowns reduced width (~40%) + blinking brand border; All Activities dropdown blinking border; codebase refactor complete (REFACTOR_PLAN 100%). |
| 23 | Analytics + admin dashboard: PostHog HogQL server queries (17 parallel, 5-min cache); admin dashboard 7 sections (KpiCard + AdminChart); admin restyle to site palette; AbortError definitive fix (double try/catch in server.ts + auth/callback); maple leaf logo; ScrollHint mobile pill; Vercel deploy. **App version: v2.1** |
| 24 | Feedback widget: fixed bottom-right bubble with sonar ripple rings; two-path menu (Report a Bug / Suggest a Feature); forms with title, description, urgency (bug), screenshot upload, optional pre-filled email; /api/feedback creates Linear issues via GraphQL (team + label UUIDs resolved at cold-start); /api/feedback/upload handles Linear fileUpload → S3 PUT → assetUrl in issue markdown. **App version: v2.2** |
| Next | Price/fee data investigation, mobile UX polish, notification system |
