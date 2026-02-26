-- UP
set search_path to public, extensions;

-- Insert location stubs for orphaned rinks if not already present
insert into locations (id, name, address, district, city)
values
  (14300, 'Orphan Rink 14300', null, null, 'Toronto'),
  (14076, 'Orphan Rink 14076', null, null, 'Toronto'),
  (37126, 'Grenadier Pond', 'High Park, Toronto', 'Etobicoke York', 'Toronto')
on conflict (id) do nothing;

-- Insert rink stubs so live status FK resolves
insert into rinks (location_id, asset_id, asset_name, rink_type, activity_type, data_source)
values
  (14300, 14300, 'Orphan Rink 14300', 'outdoor', 'skating', 'stub'),
  (14076, 14076, 'Orphan Rink 14076', 'outdoor', 'skating', 'stub'),
  (37126, 37126, 'Grenadier Pond Natural Ice', 'outdoor', 'skating', 'stub')
on conflict (asset_id) do nothing;

-- DOWN
-- delete from rinks where asset_id in (14300, 14076, 37126);
-- delete from locations where id in (14300, 14076, 37126);
