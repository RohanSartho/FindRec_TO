-- UP
set search_path to public, extensions;

-- Bulk coordinate backfill from raw_geometry on locations
-- Uses jsonb array indexing: raw_geometry->'coordinates'->0 for lng, ->1 for lat
update locations l
set coordinates = ST_SetSRID(
  ST_MakePoint(
    (l.raw_geometry->'coordinates'->0)::text::float,
    (l.raw_geometry->'coordinates'->1)::text::float
  ), 4326
)
where
  l.raw_geometry is not null
  and l.raw_geometry->>'type' = 'Point'
  and l.coordinates is null;

-- DOWN
-- (non-destructive, no rollback needed)
