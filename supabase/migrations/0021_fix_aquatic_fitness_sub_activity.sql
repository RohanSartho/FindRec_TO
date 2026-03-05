set search_path to public, extensions;

-- Fix: Aquatic Fitness drop-ins were incorrectly tagged with sub_activity = 'Leisure Swim'
-- due to ILIKE backfill in migration 0011. Correct them to 'Aquafit'.
UPDATE dropins
SET sub_activity = 'Aquafit'
WHERE activity_type = 'aquatics'
  AND course_title ILIKE 'Aquatic Fitness%'
  AND sub_activity = 'Leisure Swim';
