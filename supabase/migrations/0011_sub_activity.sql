-- 0011_sub_activity.sql
-- Adds sub_activity text column to dropins and programs tables.
-- Backfills existing rows using ILIKE keyword matching on course_title / activity_title.
-- Also fixes misclassified activity_type rows (Pickleball/Badminton/Tai Chi were landing in 'other').

set search_path to public, extensions;

-- ── 1. Add column ─────────────────────────────────────────────────────────────

ALTER TABLE programs ADD COLUMN IF NOT EXISTS sub_activity text;
ALTER TABLE dropins  ADD COLUMN IF NOT EXISTS sub_activity text;

-- ── 2. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS programs_sub_activity_idx      ON programs(sub_activity);
CREATE INDEX IF NOT EXISTS dropins_sub_activity_idx       ON dropins(sub_activity);
CREATE INDEX IF NOT EXISTS programs_activity_sub_idx      ON programs(activity_type, sub_activity);
CREATE INDEX IF NOT EXISTS dropins_activity_sub_idx       ON dropins(activity_type, sub_activity);

-- ── 3. Fix misclassified activity_type in dropins ────────────────────────────
-- These keywords were not in the original inferActivityType function, so rows
-- landed in 'other'. Reclassify them before the sub_activity backfill.

UPDATE dropins SET activity_type = 'sports'
WHERE activity_type = 'other'
  AND (
    course_title ILIKE '%pickleball%'
    OR course_title ILIKE '%badminton%'
    OR course_title ILIKE '%volleyball%'
    OR course_title ILIKE '%squash%'
    OR course_title ILIKE '%dodgeball%'
    OR course_title ILIKE '%floor hockey%'
    OR course_title ILIKE '%table tennis%'
    OR course_title ILIKE '%ping pong%'
    OR course_title ILIKE '%lacrosse%'
    OR course_title ILIKE '%cricket%'
    OR course_title ILIKE '%ringette%'
    OR course_title ILIKE '%broomball%'
  );

UPDATE dropins SET activity_type = 'fitness'
WHERE activity_type = 'other'
  AND (
    course_title ILIKE '%tai chi%'
    OR course_title ILIKE '%taichi%'
    OR course_title ILIKE '%stretching%'
    OR course_title ILIKE '%bootcamp%'
    OR course_title ILIKE '%boot camp%'
    OR course_title ILIKE '%weight training%'
  );

-- ── 4. Fix misclassified activity_type in programs ────────────────────────────

UPDATE programs SET activity_type = 'sports'
WHERE activity_type = 'other'
  AND (
    COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%pickleball%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%badminton%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%volleyball%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%squash%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%dodgeball%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%floor hockey%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%table tennis%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%ping pong%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%lacrosse%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%cricket%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%ringette%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%broomball%'
  );

UPDATE programs SET activity_type = 'fitness'
WHERE activity_type = 'other'
  AND (
    COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%tai chi%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%taichi%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%stretching%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%bootcamp%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%boot camp%'
    OR COALESCE(activity_title, '') || ' ' || COALESCE(course_title, '') ILIKE '%weight training%'
  );

-- ── 5. Backfill sub_activity for dropins ──────────────────────────────────────

UPDATE dropins SET sub_activity = CASE
  -- ── Skating ─────────────────────────────────────────────────────────────
  WHEN activity_type = 'skating'
    AND (course_title ILIKE '%hockey%' OR course_title ILIKE '%shinny%' OR course_title ILIKE '%stick%')
    THEN 'Hockey'
  WHEN activity_type = 'skating'
    AND (course_title ILIKE '%figure%' OR course_title ILIKE '%learn to skate%')
    THEN 'Figure Skating'
  WHEN activity_type = 'skating' AND course_title ILIKE '%speed%'
    THEN 'Speed Skating'
  WHEN activity_type = 'skating' AND (course_title ILIKE '%ringette%')
    THEN 'Ringette'
  WHEN activity_type = 'skating' AND (course_title ILIKE '%broomball%')
    THEN 'Broomball'
  WHEN activity_type = 'skating'
    THEN 'Public Skating'

  -- ── Aquatics ─────────────────────────────────────────────────────────────
  WHEN activity_type = 'aquatics'
    AND (course_title ILIKE '%aquafit%' OR course_title ILIKE '%aqua fit%' OR course_title ILIKE '%water aerobic%')
    THEN 'Aquafit'
  WHEN activity_type = 'aquatics'
    AND (course_title ILIKE '%lesson%' OR course_title ILIKE '%learn to swim%')
    THEN 'Swim Lessons'
  WHEN activity_type = 'aquatics'
    AND (course_title ILIKE '%lane%' OR course_title ILIKE '%lap%' OR course_title ILIKE '%length%')
    THEN 'Lane Swimming'
  WHEN activity_type = 'aquatics'
    AND (course_title ILIKE '%dive%' OR course_title ILIKE '%diving%')
    THEN 'Diving'
  WHEN activity_type = 'aquatics'
    AND (course_title ILIKE '%tot%' OR course_title ILIKE '%parent%' OR course_title ILIKE '%parent & tot%')
    THEN 'Parent & Tot Swim'
  WHEN activity_type = 'aquatics' AND course_title ILIKE '%water polo%'
    THEN 'Water Polo'
  WHEN activity_type = 'aquatics'
    THEN 'Leisure Swim'

  -- ── Fitness ───────────────────────────────────────────────────────────────
  WHEN activity_type = 'fitness' AND course_title ILIKE '%yoga%'
    THEN 'Yoga'
  WHEN activity_type = 'fitness' AND course_title ILIKE '%pilates%'
    THEN 'Pilates'
  WHEN activity_type = 'fitness' AND course_title ILIKE '%zumba%'
    THEN 'Zumba'
  WHEN activity_type = 'fitness'
    AND (course_title ILIKE '%cardio%' OR course_title ILIKE '%bootcamp%'
         OR course_title ILIKE '%boot camp%' OR course_title ILIKE '%hiit%')
    THEN 'Cardio'
  WHEN activity_type = 'fitness'
    AND (course_title ILIKE '%tai chi%' OR course_title ILIKE '%taichi%')
    THEN 'Tai Chi'

  -- ── Arts ─────────────────────────────────────────────────────────────────
  WHEN activity_type = 'arts'
    AND (course_title ILIKE '%dance%' OR course_title ILIKE '%ballet%'
         OR course_title ILIKE '%hip hop%' OR course_title ILIKE '%salsa%'
         OR course_title ILIKE '%ballroom%')
    THEN 'Dance'
  WHEN activity_type = 'arts'
    AND (course_title ILIKE '%paint%' OR course_title ILIKE '%draw%'
         OR course_title ILIKE '%sketch%' OR course_title ILIKE '%watercolour%'
         OR course_title ILIKE '%watercolor%')
    THEN 'Painting'
  WHEN activity_type = 'arts'
    AND (course_title ILIKE '%potter%' OR course_title ILIKE '%ceramics%' OR course_title ILIKE '%clay%')
    THEN 'Pottery'
  WHEN activity_type = 'arts'
    AND (course_title ILIKE '%craft%' OR course_title ILIKE '%knit%' OR course_title ILIKE '%sew%')
    THEN 'Crafts'
  WHEN activity_type = 'arts'
    AND (course_title ILIKE '%music%' OR course_title ILIKE '%guitar%'
         OR course_title ILIKE '%piano%' OR course_title ILIKE '%choir%' OR course_title ILIKE '%sing%')
    THEN 'Music'
  WHEN activity_type = 'arts'
    AND (course_title ILIKE '%drama%' OR course_title ILIKE '%theatre%' OR course_title ILIKE '%theater%')
    THEN 'Drama'

  -- ── Sports ────────────────────────────────────────────────────────────────
  WHEN activity_type = 'sports' AND course_title ILIKE '%pickleball%'
    THEN 'Pickleball'
  WHEN activity_type = 'sports'
    AND (course_title ILIKE '%soccer%' OR course_title ILIKE '% football%')
    THEN 'Soccer'
  WHEN activity_type = 'sports' AND course_title ILIKE '%basketball%'
    THEN 'Basketball'
  WHEN activity_type = 'sports' AND course_title ILIKE '%badminton%'
    THEN 'Badminton'
  WHEN activity_type = 'sports' AND course_title ILIKE '%volleyball%'
    THEN 'Volleyball'
  WHEN activity_type = 'sports' AND course_title ILIKE '%tennis%'
    THEN 'Tennis'
  WHEN activity_type = 'sports'
    AND (course_title ILIKE '%baseball%' OR course_title ILIKE '%softball%')
    THEN 'Baseball'
  WHEN activity_type = 'sports' AND course_title ILIKE '%squash%'
    THEN 'Squash'
  WHEN activity_type = 'sports' AND course_title ILIKE '%floor hockey%'
    THEN 'Floor Hockey'
  WHEN activity_type = 'sports' AND course_title ILIKE '%dodgeball%'
    THEN 'Dodgeball'
  WHEN activity_type = 'sports'
    AND (course_title ILIKE '%table tennis%' OR course_title ILIKE '%ping pong%')
    THEN 'Table Tennis'
  WHEN activity_type = 'sports' AND course_title ILIKE '%lacrosse%'
    THEN 'Lacrosse'
  WHEN activity_type = 'sports' AND course_title ILIKE '%cricket%'
    THEN 'Cricket'
  WHEN activity_type = 'sports' AND course_title ILIKE '%ringette%'
    THEN 'Ringette'
  WHEN activity_type = 'sports' AND course_title ILIKE '%broomball%'
    THEN 'Broomball'

  ELSE NULL
END;

-- ── 6. Backfill sub_activity for programs ─────────────────────────────────────
-- Uses activity_title as primary signal (it's a cleaner CKAN field), falls back to course_title.

UPDATE programs SET sub_activity = CASE
  -- ── Skating ─────────────────────────────────────────────────────────────
  WHEN activity_type = 'skating'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%hockey%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%shinny%')
    THEN 'Hockey'
  WHEN activity_type = 'skating'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%figure%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%learn to skate%')
    THEN 'Figure Skating'
  WHEN activity_type = 'skating'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%speed%'
    THEN 'Speed Skating'
  WHEN activity_type = 'skating'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%ringette%'
    THEN 'Ringette'
  WHEN activity_type = 'skating'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%broomball%'
    THEN 'Broomball'
  WHEN activity_type = 'skating'
    THEN 'Public Skating'

  -- ── Aquatics ─────────────────────────────────────────────────────────────
  WHEN activity_type = 'aquatics'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%aquafit%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%water aerobic%')
    THEN 'Aquafit'
  WHEN activity_type = 'aquatics'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%lesson%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%learn to swim%')
    THEN 'Swim Lessons'
  WHEN activity_type = 'aquatics'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%lane%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%lap%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%length%')
    THEN 'Lane Swimming'
  WHEN activity_type = 'aquatics'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%dive%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%diving%')
    THEN 'Diving'
  WHEN activity_type = 'aquatics'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%tot%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%parent%')
    THEN 'Parent & Tot Swim'
  WHEN activity_type = 'aquatics'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%water polo%'
    THEN 'Water Polo'
  WHEN activity_type = 'aquatics'
    THEN 'Leisure Swim'

  -- ── Fitness ───────────────────────────────────────────────────────────────
  WHEN activity_type = 'fitness'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%yoga%'
    THEN 'Yoga'
  WHEN activity_type = 'fitness'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%pilates%'
    THEN 'Pilates'
  WHEN activity_type = 'fitness'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%zumba%'
    THEN 'Zumba'
  WHEN activity_type = 'fitness'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%cardio%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%bootcamp%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%boot camp%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%hiit%')
    THEN 'Cardio'
  WHEN activity_type = 'fitness'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%tai chi%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%taichi%')
    THEN 'Tai Chi'

  -- ── Arts ─────────────────────────────────────────────────────────────────
  WHEN activity_type = 'arts'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%dance%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%ballet%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%hip hop%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%salsa%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%ballroom%')
    THEN 'Dance'
  WHEN activity_type = 'arts'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%paint%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%draw%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%sketch%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%watercolour%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%watercolor%')
    THEN 'Painting'
  WHEN activity_type = 'arts'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%potter%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%ceramics%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%clay%')
    THEN 'Pottery'
  WHEN activity_type = 'arts'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%craft%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%knit%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%sew%')
    THEN 'Crafts'
  WHEN activity_type = 'arts'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%music%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%guitar%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%piano%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%choir%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%sing%')
    THEN 'Music'
  WHEN activity_type = 'arts'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%drama%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%theatre%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%theater%')
    THEN 'Drama'

  -- ── Sports ────────────────────────────────────────────────────────────────
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%pickleball%'
    THEN 'Pickleball'
  WHEN activity_type = 'sports'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%soccer%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '% football%')
    THEN 'Soccer'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%basketball%'
    THEN 'Basketball'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%badminton%'
    THEN 'Badminton'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%volleyball%'
    THEN 'Volleyball'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%tennis%'
    THEN 'Tennis'
  WHEN activity_type = 'sports'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%baseball%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%softball%')
    THEN 'Baseball'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%squash%'
    THEN 'Squash'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%floor hockey%'
    THEN 'Floor Hockey'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%dodgeball%'
    THEN 'Dodgeball'
  WHEN activity_type = 'sports'
    AND (COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%table tennis%'
         OR COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%ping pong%')
    THEN 'Table Tennis'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%lacrosse%'
    THEN 'Lacrosse'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%cricket%'
    THEN 'Cricket'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%ringette%'
    THEN 'Ringette'
  WHEN activity_type = 'sports'
    AND COALESCE(activity_title,'') || ' ' || COALESCE(course_title,'') ILIKE '%broomball%'
    THEN 'Broomball'

  ELSE NULL
END;
