-- Add lat/lng float columns to locations for use in map views
-- Backfilled from existing PostGIS coordinates geometry

set search_path to public, extensions;

ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision;

UPDATE locations
SET
  lat = ST_Y(coordinates),
  lng = ST_X(coordinates)
WHERE coordinates IS NOT NULL;
