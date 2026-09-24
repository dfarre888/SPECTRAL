-- House style: no em dashes in on-screen text. Reference-data tables only
-- (catalogues, GNSS, incidents, defeat rationale, exercise ORBAT); never
-- tenant, user, audit or evidence tables. Identifier and enum-like columns
-- are skipped. Spaced em dash becomes a colon. Idempotent.
do $$
declare
  r record;
  skip text[] := array['id','data_confidence','classification','side','catalog_tier','category','force_side',
    'service_status','program_stage','domain','role','status','system_category','dependency_level','jamming_type',
    'confidence','incident_type','defeat_method','portability','type','jammer_tier','cost_confidence','guidance_type',
    'source','nation_code','a3dm_drone_id','a3dm_category','sub_category'];
begin
  for r in
    select c.table_name, c.column_name, c.udt_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and c.udt_name in ('text', 'varchar', '_text')
      and c.table_name in ('platforms','anti_drone_systems','gnss_constellations','gnss_platform_dependencies',
        'gnss_jamming_incidents','gnss_jammers','conflict_incidents','defeat_effectiveness','bmi_exercise_platforms',
        'bmi_exercises','engagement_economics')
      and c.column_name <> all (skip)
      and c.column_name not like '%\_id' escape '\'
  loop
    if r.udt_name = '_text' then
      execute format(
        'update public.%I set %I = (select array_agg(replace(x, '' — '', '': '')) from unnest(%I) x) where array_to_string(%I, chr(31)) like ''%% — %%''',
        r.table_name, r.column_name, r.column_name, r.column_name);
    else
      execute format(
        'update public.%I set %I = replace(%I, '' — '', '': '') where %I like ''%% — %%''',
        r.table_name, r.column_name, r.column_name, r.column_name);
    end if;
  end loop;
end $$;
