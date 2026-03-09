-- Migration 0022: Reclassify Ball Hockey from skating → sports
-- Ball Hockey was incorrectly classified as skating because inferActivityType
-- matched the word "hockey" broadly. Ball Hockey is a floor sport, not ice.

set search_path to public, extensions;

UPDATE programs
SET activity_type = 'sports',
    sub_activity  = 'Ball Hockey'
WHERE course_title ILIKE '%ball hockey%';

UPDATE dropins
SET activity_type = 'sports',
    sub_activity  = 'Ball Hockey'
WHERE course_title ILIKE '%ball hockey%';
