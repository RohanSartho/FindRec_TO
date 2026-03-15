-- 0026_user_alerts_and_watchlist.sql
-- Adds two user-personalisation tables:
--   • user_dropin_alerts   — track a recurring drop-in by (location_id, course_title)
--   • user_program_watchlist — track a specific registered program by (course_id, location_id)
-- Both tables follow the same RLS pattern as user_favourites.

-- ─────────────────────────────────────────────────────────────────────────────
-- user_dropin_alerts
-- Stores a (location_id, course_title) pair.  The dashboard queries the
-- dropins table for matching sessions in the next 7 days — no stale-data
-- problem because past sessions naturally disappear from that window.
-- ─────────────────────────────────────────────────────────────────────────────
create table user_dropin_alerts (
  id           bigserial primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  location_id  integer     not null references locations(id)  on delete cascade,
  course_title text        not null,
  created_at   timestamptz not null default now()
);

-- One alert per (user, venue, course title)
create unique index user_dropin_alerts_unique
  on user_dropin_alerts (user_id, location_id, course_title);

create index user_dropin_alerts_user_idx on user_dropin_alerts (user_id);

-- RLS: users can only see and modify their own rows
alter table user_dropin_alerts enable row level security;

create policy "users_select_own_dropin_alerts"
  on user_dropin_alerts for select
  using (auth.uid() = user_id);

create policy "users_insert_own_dropin_alerts"
  on user_dropin_alerts for insert
  with check (auth.uid() = user_id);

create policy "users_delete_own_dropin_alerts"
  on user_dropin_alerts for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_program_watchlist
-- Stores a (course_id, location_id) pair.  The dashboard joins the programs
-- table to show current status, registration dates, and an enrol link.
-- Stale entries (end_date passed) are shown as "Ended" and can be removed by
-- the user — we never auto-delete so users can see what they tracked.
-- ─────────────────────────────────────────────────────────────────────────────
create table user_program_watchlist (
  id           bigserial primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  course_id    integer     not null,
  location_id  integer     not null references locations(id)  on delete cascade,
  created_at   timestamptz not null default now()
);

-- One entry per (user, course, venue)
create unique index user_program_watchlist_unique
  on user_program_watchlist (user_id, course_id, location_id);

create index user_program_watchlist_user_idx on user_program_watchlist (user_id);

-- RLS: users can only see and modify their own rows
alter table user_program_watchlist enable row level security;

create policy "users_select_own_program_watchlist"
  on user_program_watchlist for select
  using (auth.uid() = user_id);

create policy "users_insert_own_program_watchlist"
  on user_program_watchlist for insert
  with check (auth.uid() = user_id);

create policy "users_delete_own_program_watchlist"
  on user_program_watchlist for delete
  using (auth.uid() = user_id);
