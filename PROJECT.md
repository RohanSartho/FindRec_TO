# FindRec TO — Project Memory

> Last updated: 2026-02-26 (story: Phase 10 — 12 UX improvements)
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

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/rinks` | GET | List rinks — filters: type, district, lat/lng/radius |
| `/api/rinks/[id]` | GET | Single rink with location + live status |
| `/api/rinks/[id]/status` | GET | Live status only (lightweight polling) |
| `/api/rinks/[id]/programs` | GET | Timetable — dropins + programs by view/date |
| `/api/dropin-search` | GET | Drop-in sessions — filters: date, program_types, district, geo |
| `/api/programs` | GET | Programs — filters: location_id, activity_type, date |
| `/api/districts` | GET | Distinct districts for filter UI |
| `/api/seasons` | GET | Season list |
| `/api/favourites` | GET/POST/DELETE | Auth-gated user favourites |

---

## Pages

| Route | Type | Purpose |
|---|---|---|
| `/` | Server | Home — hero + CTA |
| `/skating` | Client | Rink grid + Drop-ins Today mode |
| `/skating/[asset_id]` | Server | Rink detail — info + timetable |
| `/favourites` | Client | Auth-gated saved rinks |
| `/auth/callback` | Route Handler | Supabase OAuth callback |
| `/auth/error` | Server | Auth error fallback |

---

## Key Components
```
src/
├── components/
│   ├── dropin/
│   │   ├── DropInFilterPanel.tsx   # Program type chips, location, date, time-of-day filters
│   │   └── DropInResultsTable.tsx  # Grouped sessions table with Free badge
│   ├── layout/
│   │   └── Navbar.tsx              # Sticky nav, auth state, user menu
│   ├── rinks/
│   │   ├── RinkCard.tsx            # Card — live status, full-card link, colored type badge
│   │   ├── RinkListItem.tsx        # Compact list row (list view mode)
│   │   └── Timetable.tsx           # Day/Week schedule view; Free badge for outdoor rinks
│   └── ui/
│       ├── AuthModal.tsx           # Google OAuth + email sign in/up
│       └── StatusBadge.tsx         # open/closed/service_alert/unknown
├── lib/
│   ├── config/
│   │   └── dropinFilters.ts        # Program filter options + districts + radius
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
│       └── timetable.ts            # formatTime, formatAgeRange, compactTitle
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
| 33 locations missing coordinates | Open | No geometry in CKAN source |
| `pad_length_ft` null on outdoor rinks | Open | CKAN doesn't include for outdoor |
| 2,437 facilities skipped | Open | location_id not in our locations table |
| District filter needs 2-step query | Fixed | PostgREST can't filter parent via join |
| Dennis R. Timbrell not showing | Open | Likely missing rink row — run: `SELECT * FROM rinks r JOIN locations l ON l.id=r.location_id WHERE l.name ILIKE '%timbrell%'` |
| Dropin dedup wrong unique key | Fixed | Was (course_id, location_id), now (+first_date) |
| PostGIS in extensions schema | Fixed | Add `set search_path to public, extensions` to all migrations |
| Next.js 15 params are Promise | Fixed | Always `await params` in dynamic routes |

---

## Backlog

See `BACKLOG.md` for tracked stories.

Key items:
- `[DATA-001]` Free Centre flag on locations
- `[NOTIF-001]` Seasonal change notification on login
- `[UX-001]` Map view for rink discovery
- `[UX-002]` Add to Calendar
- `[ADMIN-001]` Sync health dashboard

---

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Never commit `.env.local`. Keys are in Supabase dashboard → Settings → API.

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
| Next | Vercel deploy, analytics, polish |
