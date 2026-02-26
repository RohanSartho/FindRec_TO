# FindRec TO — Toronto Parks & Recreation

> One-stop destination for Toronto Parks & Recreation activities, rinks, programs and facilities.

**Repo:** https://github.com/RohanSartho/FindRec_TO
**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + PostGIS + Auth) · Vercel
**Data:** Toronto Open Data (CKAN) · Open Government Licence – Toronto
**Attribution:** Contains information licensed under the Open Government Licence – Toronto.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres + PostGIS + Auth + Edge Functions)
- Vercel (hosting)

## Setup
1. Create a Supabase project at https://supabase.com
2. Fill in `.env.local` with your project URL and keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Run `npx supabase db push` to apply migrations
4. Enable PostGIS in Supabase dashboard: Database → Extensions → postgis
5. Deploy edge functions: `npx supabase functions deploy`

## Features
- Browse all 135 Toronto ice rinks (indoor + outdoor)
- Filter by district, type, or location (Near Me via geolocation)
- Live rink status (open/closed/service alert) synced every 15 minutes
- Drop-in and registered program timetable per rink (day/week/all views)
- Favourites with Google OAuth or email/password auth
- Rink detail pages with address, dimensions, operator info

## Data Sources
- Toronto Open Data (CKAN): https://open.toronto.ca
- Live rink status: https://www.toronto.ca/data/parks/live/skate_allupdates.json
- Licence: Open Government Licence – Toronto

## Sync Schedule
- Facility/program data: weekly (Sunday 7am UTC via Supabase Edge Function cron)
- Live rink status: every 15 minutes (Supabase Edge Function cron)
