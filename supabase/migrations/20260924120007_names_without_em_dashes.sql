-- House style: no em dashes in on-screen text. Names and titles are what the
-- tables, headers and timeline show, so replace the spaced em dash with a
-- colon. Idempotent: rows without the pattern are untouched.
update platforms set name = replace(name, ' — ', ': ') where name like '% — %';
update anti_drone_systems set name = replace(name, ' — ', ': ') where name like '% — %';
update conflict_incidents set incident_title = replace(incident_title, ' — ', ': ') where incident_title like '% — %';
