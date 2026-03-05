set search_path to public, extensions;

-- The unique key (course_id, location_id, first_date) is too loose:
-- CKAN publishes multiple time slots per day that share the same course_id
-- (e.g. Lane Swim at Timbrell: 07:30, 12:15, 19:45 all have course_id=123048 on the same date).
-- Only one row survived the upsert — the others were silently dropped.
-- Fix: include start_time in the unique key.

alter table dropins
  drop constraint if exists dropins_session_unique;

alter table dropins
  add constraint dropins_session_unique
    unique (course_id, location_id, first_date, start_time);
