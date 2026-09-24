-- WOPR: tick history, branching lineage, demo tenant clean-up
-- UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
--
-- 1. Lineage and initial laydown columns on wopr_scenarios (branching, MSDL export).
-- 2. wopr_scenario_ticks: one row per recorded turn with the world state after it
--    (replay after reload, branch from a past turn, JSON and CSV export).
-- 3. Removes the placeholder "test N" scenarios for the demo tenant.
--
-- The three demo scenarios (Talisman Sabre 27, RAAF Williamtown, Al Minhad) are
-- defined in lib/wopr/demo-scenarios.ts, with engine-recorded history, and the
-- store adds them for the demo tenant when no row with their id exists. No demo
-- rows are inserted here, so code and database cannot drift apart.
--
-- The app works without this migration (history and lineage fall back to process
-- memory); with it, recorded turns and branch lineage survive a restart.

alter table public.wopr_scenarios add column if not exists initial_world_state jsonb;
alter table public.wopr_scenarios add column if not exists parent_scenario_id uuid references public.wopr_scenarios(id) on delete set null;
alter table public.wopr_scenarios add column if not exists branch_turn integer;
create index if not exists wopr_scenarios_parent on public.wopr_scenarios (parent_scenario_id) where parent_scenario_id is not null;

comment on column public.wopr_scenarios.initial_world_state is 'Laydown before the first tick. MSDL export uses it.';
comment on column public.wopr_scenarios.parent_scenario_id is 'Scenario this one was branched from.';
comment on column public.wopr_scenarios.branch_turn is 'Turn of the parent at which the branch was taken (0 = initial laydown).';

create table if not exists public.wopr_scenario_ticks (
  scenario_id uuid not null references public.wopr_scenarios(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  turn integer not null check (turn >= 1),
  elapsed_min numeric not null,
  tick jsonb not null,
  world_state jsonb,
  created_at timestamptz not null default now(),
  primary key (scenario_id, turn)
);
create index if not exists wopr_scenario_ticks_tenant on public.wopr_scenario_ticks (tenant_id);

alter table public.wopr_scenario_ticks enable row level security;
drop policy if exists wopr_scenario_ticks_select on public.wopr_scenario_ticks;
drop policy if exists wopr_scenario_ticks_insert on public.wopr_scenario_ticks;
drop policy if exists wopr_scenario_ticks_update on public.wopr_scenario_ticks;
drop policy if exists wopr_scenario_ticks_delete on public.wopr_scenario_ticks;
create policy wopr_scenario_ticks_select on public.wopr_scenario_ticks
  for select to authenticated using (tenant_id in (select auth_user_tenant_ids()));
create policy wopr_scenario_ticks_insert on public.wopr_scenario_ticks
  for insert to authenticated with check (tenant_id in (select auth_user_tenant_ids()));
create policy wopr_scenario_ticks_update on public.wopr_scenario_ticks
  for update to authenticated using (tenant_id in (select auth_user_tenant_ids()))
  with check (tenant_id in (select auth_user_tenant_ids()));
create policy wopr_scenario_ticks_delete on public.wopr_scenario_ticks
  for delete to authenticated using (tenant_id in (select auth_user_tenant_ids()));
comment on table public.wopr_scenario_ticks is
  'Recorded WOPR turns: tick result plus world state after the turn. Drives replay, branching and export.';

-- Placeholder rows ("test 1", "test 2") for the demo tenant.
delete from public.wopr_scenarios
 where tenant_id = '00000000-0000-0000-0000-000000000001' and name ~* '^test\y';
