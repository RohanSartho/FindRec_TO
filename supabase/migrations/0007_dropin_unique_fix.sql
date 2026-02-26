-- UP
set search_path to public, extensions;

-- Drop the wrong unique constraint (course_id, location_id)
-- Drop-ins are per-session, unique key is (course_id, location_id, first_date)
alter table dropins
  drop constraint if exists dropins_course_id_location_unique;

-- Add correct unique constraint
alter table dropins
  add constraint dropins_session_unique
    unique (course_id, location_id, first_date);

-- DOWN
-- alter table dropins drop constraint if exists dropins_session_unique;
-- alter table dropins add constraint dropins_course_id_location_unique unique (course_id, location_id);
