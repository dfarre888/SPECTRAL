-- ============================================================================
-- Spectrum Intelligence — schema migration
-- Tables: platforms, platform_variants, spectrum_capabilities
-- Conventions: snake_case, UUID PKs, RLS enabled, security_invoker views.
-- ============================================================================

-- ---------- enums ----------
do $$ begin
  create type spectrum_axis as enum ('rf','gnss','eo_ir','cbrn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spectrum_layer as enum ('comms','navigation','radar','eo_ir','cbrn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type platform_side as enum ('red','blue','neutral');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_confidence as enum ('curated','derived','estimated');
exception when duplicate_object then null; end $$;

-- ---------- platforms ----------
create table if not exists public.platforms (
  id              text primary key,                 -- slug id, e.g. 'shahed-136'
  name            text not null,
  variant_label   text,
  side            platform_side not null default 'neutral',
  "group"         smallint check ("group" between 1 and 5),
  origin          text,
  category        text,
  role            text,
  mass_kg         numeric,
  range_km        numeric,
  speed_kmh       numeric,
  ceiling_m       numeric,
  warhead_kg      numeric,
  -- legacy quick-reference fields (drive the fallback generator)
  c2_uplink_mhz   numeric,
  c2_downlink_mhz numeric,
  video_mhz       numeric,
  gnss_used       text[],
  datalink_mhz    numeric,
  satcom_band     text,
  confidence      source_confidence default 'curated',
  intel_note      text,
  icon            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ---------- platform_variants (evolution arc) ----------
create table if not exists public.platform_variants (
  id              text primary key,
  platform_id     text not null references public.platforms(id) on delete cascade,
  variant         text not null,                    -- 'gen0'..'gen4'
  label           text not null,
  effective_year  smallint,
  summary         text,
  defeat_verdict  text check (defeat_verdict in ('rf_works','rf_struggles','hpm_only')),
  sort_order      smallint default 0,
  created_at      timestamptz default now()
);

-- ---------- spectrum_capabilities ----------
create table if not exists public.spectrum_capabilities (
  id                 text primary key,
  platform_id        text not null references public.platforms(id) on delete cascade,
  variant            text,                          -- optional link to a variant
  axis               spectrum_axis not null,
  layer              spectrum_layer not null,
  fn                 text not null,                 -- CapabilityFunction
  label              text not null,
  freq_low_hz        double precision,
  freq_high_hz       double precision,
  wavelength_low_um  double precision,
  wavelength_high_um double precision,
  power_dbm          numeric,
  range_km           numeric,
  defeat_resistance  text[],
  note               text,
  derived            boolean default false,
  created_at         timestamptz default now(),
  -- a capability must provide either a frequency span or a wavelength span
  constraint has_extent check (
    (freq_low_hz is not null and freq_high_hz is not null)
    or (wavelength_low_um is not null and wavelength_high_um is not null)
  )
);

-- ---------- indexes ----------
create index if not exists idx_caps_platform   on public.spectrum_capabilities(platform_id);
create index if not exists idx_caps_axis_layer on public.spectrum_capabilities(axis, layer);
create index if not exists idx_caps_variant    on public.spectrum_capabilities(platform_id, variant);
create index if not exists idx_platforms_side  on public.platforms(side);
create index if not exists idx_variants_platform on public.platform_variants(platform_id, sort_order);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_platforms_touch on public.platforms;
create trigger trg_platforms_touch before update on public.platforms
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
-- Read: any authenticated user. Write: service role only (seed/admin).
-- Adjust to your org's policy model as needed.
-- ============================================================================
alter table public.platforms             enable row level security;
alter table public.platform_variants     enable row level security;
alter table public.spectrum_capabilities enable row level security;

drop policy if exists "read platforms" on public.platforms;
create policy "read platforms" on public.platforms
  for select using (auth.role() = 'authenticated');

drop policy if exists "read variants" on public.platform_variants;
create policy "read variants" on public.platform_variants
  for select using (auth.role() = 'authenticated');

drop policy if exists "read capabilities" on public.spectrum_capabilities;
create policy "read capabilities" on public.spectrum_capabilities
  for select using (auth.role() = 'authenticated');

-- writes restricted to service_role (no policy = denied for anon/authenticated)

-- ============================================================================
-- Convenience view: platforms with their capability count (security_invoker)
-- ============================================================================
create or replace view public.v_platform_summary
with (security_invoker = true) as
select
  p.*,
  coalesce(c.cap_count, 0) as capability_count
from public.platforms p
left join (
  select platform_id, count(*) as cap_count
  from public.spectrum_capabilities
  group by platform_id
) c on c.platform_id = p.id;
