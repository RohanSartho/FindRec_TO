-- Backfill lat/lng coordinates for 7 active community centres missing geometry
-- Geocoded via Mapbox Geocoding API
set search_path to public, extensions;
BEGIN;

UPDATE locations SET lat = 43.6821566, lng = -79.28914, coordinates = ST_SetSRID(ST_MakePoint(-79.28914, 43.6821566), 4326) WHERE id = 13;
UPDATE locations SET lat = 43.6612108, lng = -79.4740297, coordinates = ST_SetSRID(ST_MakePoint(-79.4740297, 43.6612108), 4326) WHERE id = 17;
UPDATE locations SET lat = 43.674044, lng = -79.2985961, coordinates = ST_SetSRID(ST_MakePoint(-79.2985961, 43.674044), 4326) WHERE id = 24;
UPDATE locations SET lat = 43.727503, lng = -79.4000615, coordinates = ST_SetSRID(ST_MakePoint(-79.4000615, 43.727503), 4326) WHERE id = 27;
UPDATE locations SET lat = 43.6587751, lng = -79.4192495, coordinates = ST_SetSRID(ST_MakePoint(-79.4192495, 43.6587751), 4326) WHERE id = 30;
UPDATE locations SET lat = 43.6702122, lng = -79.4888903, coordinates = ST_SetSRID(ST_MakePoint(-79.4888903, 43.6702122), 4326) WHERE id = 25;
UPDATE locations SET lat = 43.6899161, lng = -79.5016171, coordinates = ST_SetSRID(ST_MakePoint(-79.5016171, 43.6899161), 4326) WHERE id = 9;

COMMIT;
