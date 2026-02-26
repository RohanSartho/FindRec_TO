-- UP

-- Supabase installs PostGIS into the 'extensions' schema.
-- This makes geometry types visible without schema-qualifying them.
set search_path to public, extensions;

-- Enable required extensions
create extension if not exists postgis;
create extension if not exists pg_cron;

-- ENUM: activity types (expandable without migration)
create type activity_type as enum (
  'skating', 'fitness', 'aquatics', 'arts', 'sports', 'other'
);

-- ENUM: facility operator
create type operator_type as enum (
  'PFR', 'Arena Board', 'Lakeshore Arena Corporation', 'Other'
);

-- ENUM: rink type
create type rink_type as enum ('indoor', 'outdoor');

-- ENUM: live status codes from Toronto live JSON
create type live_status_code as enum ('open', 'closed', 'service_alert');

-- ─────────────────────────────────────────────
-- CORE: locations (master anchor table)
-- ─────────────────────────────────────────────
create table locations (
  id                  integer primary key,  -- Toronto Location ID (join key)
  name                text not null,
  address             text,
  postal_code         text,
  city                text default 'Toronto',
  ward                text,
  community_council   text,  -- e.g. 'North York', 'Etobicoke York'
  district            text,  -- normalized sub-region for filtering
  coordinates         geometry(Point, 4326),
  raw_geometry        jsonb,  -- preserve original GeoJSON from source
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index locations_coordinates_idx on locations using gist(coordinates);
create index locations_district_idx on locations(district);
create index locations_community_council_idx on locations(community_council);

-- ─────────────────────────────────────────────
-- RINKS (indoor + outdoor combined)
-- ─────────────────────────────────────────────
create table rinks (
  id                  serial primary key,
  location_id         integer references locations(id) on delete cascade,
  asset_id            integer unique,  -- Toronto AssetID (FK for live status)
  asset_name          text not null,
  public_name         text,
  rink_type           rink_type not null,
  pad_length_ft       integer,
  pad_width_ft        integer,
  ice_pad_size        text,
  permit_class        text,
  operated_by         text,
  has_boards          boolean,
  activity_type       activity_type default 'skating',
  metadata            jsonb default '{}',  -- future extensibility
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index rinks_location_id_idx on rinks(location_id);
create index rinks_asset_id_idx on rinks(asset_id);
create index rinks_type_idx on rinks(rink_type);

-- ─────────────────────────────────────────────
-- LIVE RINK STATUS (refreshed every 15 min)
-- ─────────────────────────────────────────────
create table rink_live_status (
  id                  serial primary key,
  asset_id            integer references rinks(asset_id) on delete cascade,
  location_id         integer references locations(id) on delete cascade,
  status              live_status_code not null,
  reason              text,
  comments            text,
  season_start        date,
  season_end          date,
  posted_date         timestamptz,
  fetched_at          timestamptz default now()
);

create index rink_live_status_asset_id_idx on rink_live_status(asset_id);
create index rink_live_status_fetched_at_idx on rink_live_status(fetched_at desc);

-- Keep only last 48 hours of live status records (rolling)
-- (enforced by the sync function, not a trigger, for simplicity)

-- ─────────────────────────────────────────────
-- FACILITIES (amenities per location)
-- ─────────────────────────────────────────────
create table facilities (
  id                  serial primary key,
  location_id         integer references locations(id) on delete cascade,
  activity_type       activity_type not null,
  facility_name       text,
  section             text,
  metadata            jsonb default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index facilities_location_id_idx on facilities(location_id);
create index facilities_activity_type_idx on facilities(activity_type);

-- ─────────────────────────────────────────────
-- PROGRAMS (registered programs, weekly refresh)
-- ─────────────────────────────────────────────
create table programs (
  id                  serial primary key,
  course_id           integer unique,
  location_id         integer references locations(id) on delete cascade,
  activity_type       activity_type not null default 'other',
  activity_title      text,
  course_title        text,
  section             text,
  days_of_week        text[],  -- array: ['Mon', 'Wed']
  start_date          date,  -- parsed from non-ISO "From To" field
  end_date            date,
  start_time          time,
  end_time            time,
  min_age_months      integer,  -- ALWAYS stored in months
  max_age_months      integer,  -- ALWAYS stored in months
  registration_date   date,
  status              text,
  activity_url        text,
  program_category    text,
  season_id           integer,  -- FK → seasons (nullable until seasons table populated)
  metadata            jsonb default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index programs_location_id_idx on programs(location_id);
create index programs_activity_type_idx on programs(activity_type);
create index programs_date_range_idx on programs(start_date, end_date);
create index programs_season_id_idx on programs(season_id);

-- ─────────────────────────────────────────────
-- DROP-INS (drop-in courses, weekly refresh)
-- ─────────────────────────────────────────────
create table dropins (
  id                  serial primary key,
  course_id           integer,
  location_id         integer references locations(id) on delete cascade,
  activity_type       activity_type not null default 'other',
  course_title        text,
  section             text,
  day_of_week         text,
  first_date          date,
  last_date           date,
  start_time          time,
  end_time            time,
  min_age_months      integer,  -- normalized to months (Drop-in source is years × 12)
  max_age_months      integer,
  season_id           integer,
  metadata            jsonb default '{}',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index dropins_location_id_idx on dropins(location_id);
create index dropins_activity_type_idx on dropins(activity_type);
create index dropins_date_range_idx on dropins(first_date, last_date);

-- ─────────────────────────────────────────────
-- SEASONS (detected season windows)
-- ─────────────────────────────────────────────
create table seasons (
  id                  serial primary key,
  season_name         text not null,  -- e.g. 'Winter 2026'
  season_label        text,  -- e.g. 'Winter', 'Spring', 'Summer', 'Fall'
  start_date          date not null,
  end_date            date not null,
  detected_at         timestamptz default now(),
  is_current          boolean default false,
  notes               text
);

create unique index seasons_name_idx on seasons(season_name);

-- backfill FK now that seasons exists
alter table programs add constraint programs_season_fk
  foreign key (season_id) references seasons(id) on delete set null;

alter table dropins add constraint dropins_season_fk
  foreign key (season_id) references seasons(id) on delete set null;

-- ─────────────────────────────────────────────
-- USER FAVOURITES
-- ─────────────────────────────────────────────
create table user_favourites (
  id                  serial primary key,
  user_id             uuid references auth.users(id) on delete cascade,
  location_id         integer references locations(id) on delete cascade,
  created_at          timestamptz default now(),
  unique(user_id, location_id)
);

create index user_favourites_user_id_idx on user_favourites(user_id);
create index user_favourites_location_id_idx on user_favourites(location_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
-- Public read on all data tables
alter table locations enable row level security;
alter table rinks enable row level security;
alter table rink_live_status enable row level security;
alter table facilities enable row level security;
alter table programs enable row level security;
alter table dropins enable row level security;
alter table seasons enable row level security;
alter table user_favourites enable row level security;

create policy "Public read locations" on locations for select using (true);
create policy "Public read rinks" on rinks for select using (true);
create policy "Public read rink_live_status" on rink_live_status for select using (true);
create policy "Public read facilities" on facilities for select using (true);
create policy "Public read programs" on programs for select using (true);
create policy "Public read dropins" on dropins for select using (true);
create policy "Public read seasons" on seasons for select using (true);

-- Favourites: users can only see and modify their own
create policy "Users read own favourites" on user_favourites
  for select using (auth.uid() = user_id);
create policy "Users insert own favourites" on user_favourites
  for insert with check (auth.uid() = user_id);
create policy "Users delete own favourites" on user_favourites
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- UPDATED_AT trigger (shared utility)
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger locations_updated_at before update on locations
  for each row execute function update_updated_at();
create trigger rinks_updated_at before update on rinks
  for each row execute function update_updated_at();
create trigger facilities_updated_at before update on facilities
  for each row execute function update_updated_at();
create trigger programs_updated_at before update on programs
  for each row execute function update_updated_at();
create trigger dropins_updated_at before update on dropins
  for each row execute function update_updated_at();

-- DOWN
-- drop table if exists user_favourites cascade;
-- drop table if exists seasons cascade;
-- drop table if exists dropins cascade;
-- drop table if exists programs cascade;
-- drop table if exists facilities cascade;
-- drop table if exists rink_live_status cascade;
-- drop table if exists rinks cascade;
-- drop table if exists locations cascade;
-- drop type if exists live_status_code;
-- drop type if exists rink_type;
-- drop type if exists operator_type;
-- drop type if exists activity_type;
-- drop extension if exists pg_cron;
-- drop extension if exists postgis;
