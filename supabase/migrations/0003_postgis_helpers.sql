-- UP
set search_path to public, extensions;

-- Helper RPC to set coordinates from lat/lng (called during ingest)
create or replace function set_location_coordinates(loc_id integer, lat float, lng float)
returns void
language sql
security definer
as $$
  update locations
  set coordinates = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
  where id = loc_id;
$$;

-- Helper: find locations within radius (metres) of a point
create or replace function locations_near(lat float, lng float, radius_m integer default 5000)
returns table (
  id integer,
  name text,
  address text,
  district text,
  distance_m float
)
language sql
security definer
as $$
  select
    l.id,
    l.name,
    l.address,
    l.district,
    ST_Distance(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_m
  from locations l
  where
    l.coordinates is not null
    and ST_DWithin(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
  order by distance_m;
$$;

-- DOWN
-- drop function if exists locations_near;
-- drop function if exists set_location_coordinates;
