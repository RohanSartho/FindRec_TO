-- Fix locations_near: after migration 0015 added lat/lng columns to the
-- locations table, the unqualified `lat` and `lng` references inside the
-- language sql function body resolved to the TABLE columns instead of the
-- FUNCTION parameters. ST_DWithin was therefore computing the distance from
-- each location to itself (always 0), making every row pass the filter and
-- returning all locations regardless of the requested radius.
--
-- Fix: use positional parameters ($1=lat, $2=lng, $3=radius_m) in the
-- function body so there is no ambiguity with column names.
set search_path to public, extensions;

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
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
    ) as distance_m
  from locations l
  where
    l.coordinates is not null
    and ST_DWithin(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
      $3
    )
  order by distance_m;
$$;
