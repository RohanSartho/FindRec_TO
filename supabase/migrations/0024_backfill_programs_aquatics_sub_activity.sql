-- 0024_backfill_programs_aquatics_sub_activity.sql
-- Migration 0011 left ~92% of aquatics programs as sub_activity = 'Leisure Swim' because it
-- only caught %lesson%, %parent%, %tot% patterns. This migration correctly backfills all 6
-- program-specific aquatics categories.
--
-- Category counts (approximate, from 13,773 total aquatics programs):
--   Ultra Swim         ~6,000   (Ultra Swim 1-9, Ultra Youth Swim, Adapted Ultra Swim)
--   Swim Lessons       ~5,500   (Preschool Swim, Guardian Swim, Tiny Tots, Private, Stroke, etc.)
--   Adult Swim           ~800   (Adult Swim 1-3, Swim Fit, Stroke Improvement)
--   Aquatic Leadership   ~350   (Bronze, National Lifeguard, First Aid, Swim to Survive)
--   Parent & Tot Swim    ~350   (Tiny Tots, Guardian Swim, Parent & Tot)
--   Swim Team             ~65   (SPLASH Swim Team)

set search_path to public, extensions;

-- Order matters: most-specific patterns first, catch-all Swim Lessons last.

-- Ultra Swim (most distinctive — match before anything else)
UPDATE programs
SET sub_activity = 'Ultra Swim'
WHERE activity_type = 'aquatics'
  AND (
    activity_title ILIKE '%ultra swim%'
    OR activity_title ILIKE '%ultra youth swim%'
    OR activity_title ILIKE '%adapted ultra swim%'
  );

-- Adult Swim
UPDATE programs
SET sub_activity = 'Adult Swim'
WHERE activity_type = 'aquatics'
  AND (
    activity_title ILIKE '%adult swim%'
    OR activity_title ILIKE '%swim fit%'
    OR activity_title ILIKE '%stroke improvement%'
  );

-- Aquatic Leadership (Bronze, National Lifeguard, First Aid, Swim to Survive)
UPDATE programs
SET sub_activity = 'Aquatic Leadership'
WHERE activity_type = 'aquatics'
  AND (
    activity_title ILIKE '%bronze%'
    OR activity_title ILIKE '%national lifeguard%'
    OR activity_title ILIKE '%aquatic fitness instructor%'
    OR activity_title ILIKE '%first aid%'
    OR activity_title ILIKE '%swim to survive%'
    OR activity_title ILIKE '%challenge swim%'
  );

-- Swim Team
UPDATE programs
SET sub_activity = 'Swim Team'
WHERE activity_type = 'aquatics'
  AND (
    activity_title ILIKE '%swim team%'
    OR activity_title ILIKE '%splash swim%'
  );

-- Parent & Tot Swim (parent-accompanied or caregiver-accompanied programs)
UPDATE programs
SET sub_activity = 'Parent & Tot Swim'
WHERE activity_type = 'aquatics'
  AND (
    activity_title ILIKE '%parent%'
    OR activity_title ILIKE '%tiny tot%'
    OR activity_title ILIKE '%guardian swim%'
  );

-- Swim Lessons — catch-all for remaining aquatics (Preschool Swim, Private Lessons, Adapted, etc.)
UPDATE programs
SET sub_activity = 'Swim Lessons'
WHERE activity_type = 'aquatics'
  AND sub_activity NOT IN (
    'Ultra Swim', 'Adult Swim', 'Aquatic Leadership', 'Swim Team', 'Parent & Tot Swim'
  );
