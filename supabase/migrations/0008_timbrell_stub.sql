-- Migration 0008: Backfill Dennis R. Timbrell Resource Centre
--
-- Root cause: location 1056 was created from the programs/drop-ins CKAN dataset
-- which provides Location ID and Name but no address/geometry. The outdoor rinks
-- CKAN dataset ("outdoor-artificial-ice-rinks") does not include Timbrell RC,
-- so no rink row was ever ingested and it never appeared in the Find Rinks grid.
-- Drop-in sessions for this venue ARE ingested and working correctly.
--
-- Fix:
--   1. Backfill address + district on location 1056
--   2. Insert a stub rink row so it surfaces in the grid
--      (asset_id 99001 is a manual stub; update to real CKAN ID if it's ever added
--       to the outdoor-artificial-ice-rinks dataset)

set search_path to public, extensions;

-- 1. Backfill location data (address corrected in migration 0009)
UPDATE locations
SET
  address           = '840 Don Mills Rd W',
  district          = 'Toronto and East York',
  community_council = 'Toronto and East York'
WHERE id = 1056
  AND address IS NULL; -- safe no-op on re-run

-- 2. Insert stub rink row
INSERT INTO rinks (
  asset_id,
  asset_name,
  public_name,
  rink_type,
  location_id,
  has_boards,
  activity_type,
  metadata
)
VALUES (
  99001,
  'DENNIS R. TIMBRELL RESOURCE CENTRE - Outdoor Ice Pad',
  'Dennis R. Timbrell Resource Centre',
  'outdoor',
  1056,
  false,
  'skating',
  '{"stub": true, "note": "manually inserted — absent from CKAN outdoor-artificial-ice-rinks dataset"}'
)
ON CONFLICT (asset_id) DO NOTHING;
