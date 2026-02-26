-- UP
set search_path to public, extensions;

-- Add last_synced_at to locations
alter table locations
  add column if not exists last_synced_at timestamptz default now();

-- Add source tracking to rinks (to distinguish CKAN vs manually inserted stubs)
alter table rinks
  add column if not exists data_source text default 'ckan'
    check (data_source in ('ckan', 'stub', 'manual'));

-- Add unique constraint on dropins course_id + location_id
-- (course_id alone is not unique for drop-ins unlike registered programs)
-- First deduplicate — multiple ingest runs may have inserted the same course_id+location_id
delete from dropins a
using dropins b
where a.id > b.id
  and a.course_id is not null
  and a.course_id = b.course_id
  and a.location_id = b.location_id;

alter table dropins
  drop constraint if exists dropins_course_id_location_unique;
alter table dropins
  add constraint dropins_course_id_location_unique
    unique (course_id, location_id);

-- DOWN
-- alter table locations drop column if exists last_synced_at;
-- alter table rinks drop column if exists data_source;
-- alter table dropins drop constraint if exists dropins_course_id_location_unique;
