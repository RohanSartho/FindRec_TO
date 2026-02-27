-- Migration 0009: Fix Dennis R. Timbrell Resource Centre address
--
-- Migration 0008 used an incorrect address (840 Don Mills Rd W).
-- The correct address is 29 St Dennis Dr, North York, ON M3C 1E6.
-- Also backfill PostGIS coordinates so the venue appears in Near Me results.

set search_path to public, extensions;

UPDATE locations
SET
  address           = '29 St Dennis Dr',
  postal_code       = 'M3C 1E6',
  district          = 'North York',
  community_council = 'North York',
  coordinates       = ST_SetSRID(ST_MakePoint(-79.3402, 43.7231), 4326)
WHERE id = 1056;
