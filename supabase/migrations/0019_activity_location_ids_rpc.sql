-- Migration: 0019_activity_location_ids_rpc.sql
--
-- Adds a helper RPC that returns DISTINCT location_ids for a given activity_type.
--
-- Problem: the venues API was using .limit(5000) on dropins/programs tables, but
-- Supabase max_rows is capped at 1000 per request. With 13,773 aquatics program
-- rows, only the first 1000 were scanned — venues like Dennis R. Timbrell
-- (location_id=1056) were silently omitted from results.
--
-- Solution: a single SQL function using UNION + DISTINCT avoids row-level scanning
-- and returns all matching location_ids regardless of table size.

set search_path to public, extensions;

CREATE OR REPLACE FUNCTION location_ids_for_activity(
  p_activity_type text,
  p_sub_activity  text DEFAULT NULL
)
RETURNS SETOF int
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT location_id
  FROM dropins
  WHERE activity_type = p_activity_type::activity_type
    AND location_id IS NOT NULL
    AND (p_sub_activity IS NULL OR sub_activity = p_sub_activity)

  UNION

  SELECT DISTINCT location_id
  FROM programs
  WHERE activity_type = p_activity_type::activity_type
    AND location_id IS NOT NULL
    AND (p_sub_activity IS NULL OR sub_activity = p_sub_activity);
$$;
