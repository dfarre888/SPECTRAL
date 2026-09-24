-- House style, second pass: the remaining reference and training-library
-- tables (accredited supplements, BMI comms and sensors, spectrum
-- capabilities, variants, inject library, scenario templates) plus two JSONB
-- reference columns. Learner and exercise records (turn records, competency
-- records, exercise world state) are left as written. Spaced em dash becomes
-- a colon. Idempotent.
do $$
declare
  r record;
  skip text[] := array['id','data_confidence','classification','side','catalog_tier','category','force_side',
    'service_status','program_stage','domain','status','system_category','dependency_level','jamming_type',
    'confidence','incident_type','defeat_method','portability','type','jammer_tier','cost_confidence','guidance_type',
    'source','nation_code','a3dm_drone_id','a3dm_category','sub_category'];
begin
  for r in
    select c.table_name, c.column_name, c.udt_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and c.udt_name in ('text', 'varchar', '_text')
      and c.table_name in ('accredited_defeat_pk','accredited_erp_profiles','accredited_waveform_profiles',
        'bmi_future_program_detail','bmi_platform_comms','bmi_platform_sensors','catalogue_data_gaps','payloads',
        'platform_variants','scenario_templates','spectral_inject_library','spectral_platform_catalogue',
        'spectral_scenarios','spectrum_capabilities')
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

-- JSONB reference columns: the dash only appears inside string values.
update public.defeat_effectiveness set modifiers = replace(modifiers::text, ' — ', ': ')::jsonb
  where modifiers::text like '% — %';
update public.gnss_jamming_incidents set platform_impacts = replace(platform_impacts::text, ' — ', ': ')::jsonb
  where platform_impacts::text like '% — %';
update public.spectral_scenarios set inject_library = replace(inject_library::text, ' — ', ': ')::jsonb
  where inject_library::text like '% — %';
