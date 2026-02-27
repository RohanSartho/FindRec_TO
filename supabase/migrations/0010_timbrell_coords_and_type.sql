-- Migration 0010: Correct Timbrell RC coordinates and rink type
--
-- Migration 0009 used approximate coordinates; correct values provided.
-- Venue is an indoor facility, not outdoor.

set search_path to public, extensions;

-- Fix coordinates
UPDATE locations
SET coordinates = ST_SetSRID(ST_MakePoint(-79.3319993197508, 43.71795903209779), 4326)
WHERE id = 1056;

-- Fix rink type
UPDATE rinks
SET
  rink_type  = 'indoor',
  asset_name = 'DENNIS R. TIMBRELL RESOURCE CENTRE - Indoor Ice Pad'
WHERE asset_id = 99001;
