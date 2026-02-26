-- UP
create type sync_status as enum ('running', 'success', 'failed');

create table sync_log (
  id              serial primary key,
  function_name   text not null,
  status          sync_status not null default 'running',
  started_at      timestamptz default now(),
  finished_at     timestamptz,
  rows_upserted   jsonb default '{}',  -- e.g. {"locations": 1925, "rinks": 132}
  error_message   text,
  notes           text
);

create index sync_log_function_name_idx on sync_log(function_name);
create index sync_log_started_at_idx on sync_log(started_at desc);

alter table sync_log enable row level security;
create policy "Public read sync_log" on sync_log for select using (true);

-- DOWN
-- drop table if exists sync_log;
-- drop type if exists sync_status;
