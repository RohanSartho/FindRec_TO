-- Migration: 0020_remove_timbrell_stub.sql
--
-- Removes the synthetic rink stub row for Dennis R. Timbrell Resource Centre.
--
-- Background: asset_id 99001 was manually inserted in Phase 11 with a fake ID
-- (not from CKAN). Timbrell is a community centre with aquatics, sports, and arts
-- programs but NO skating rink. The fake stub caused VenueCard to link to
-- /skating/99001 instead of /venues/1056, hiding the full aquatics timetable.
--
-- After this migration, Timbrell (location_id=1056) will:
--   - NOT appear in the skating filter (correct)
--   - Link to /venues/1056 which shows all activities including Lane Swim

set search_path to public, extensions;

BEGIN;

DELETE FROM rinks WHERE asset_id = 99001;

COMMIT;
