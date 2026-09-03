/**
 * Force Catalogue → Supabase seed generator.
 *
 * Reads the compiled TS catalogue (single source of truth) and emits an
 * idempotent SQL seed migration for the catalogue tables. Re-runnable:
 * it wipes existing catalogue rows (is_catalog = true) and re-inserts, so it
 * never drifts from the TS files and never touches exercise (Pitch Black) data.
 *
 * PLACE THIS FILE AT:  scripts/generate-force-catalog-seed.ts
 * RUN:                 npx tsx scripts/generate-force-catalog-seed.ts
 * OUTPUT:              supabase/migrations/<timestamp>_force_catalog_seed.sql
 *
 * Requires the schema migration 20260719180000_force_catalog_extension.sql to
 * have been applied first (it adds is_catalog / nation_name / etc. and creates
 * bmi_future_program_detail + bmi_catalog_nations).
 *
 * Path aliases: relative imports used so tsx resolves without next.config paths.
 */

import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { catalogBundle, CATALOG_NATIONS } from '../data/force-catalog'
import type {
  CatalogNation,
  CommsBearer,
  ForceCatalogPlatformFull,
  FutureProgramDetail,
  PlatformSensor,
} from '../lib/bmi/bmi-types'

// ── SQL literal helpers ─────────────────────────────────────────────────────
const q = (s: string | null | undefined): string =>
  s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`

const qArr = (arr: string[] | null | undefined): string => {
  if (!arr || arr.length === 0) return `'{}'`
  const items = arr.map((v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
  return `'{${items.join(',')}}'`
}

const bool = (b: boolean | null | undefined): string => (b ? 'true' : 'false')
const num = (n: number | null | undefined): string =>
  n === null || n === undefined ? 'NULL' : String(n)

// ── Row emitters ────────────────────────────────────────────────────────────
function nationRow(n: CatalogNation): string {
  return `  (${q(n.code)}, ${q(n.name)}, ${q(n.force_side)}, ${qArr(n.blocs)}, ${q(n.region)})`
}

function platformRow(p: ForceCatalogPlatformFull): string {
  return (
    `  (${q(p.id)}, NULL, ${q(p.nation_code)}, ${q(p.designation)}, ${q(p.short_name)}, ` +
    `${q(p.domain)}, ${q(p.role)}, NULL, NULL, ${q(p.force_side)}, ${q(p.open_source_summary)}, ` +
    `${q(p.data_confidence)}, ${qArr(p.sources)}, ${q(p.platform_library_id ?? null)}, true, ` +
    `${q(p.nation_name)}, ${q(p.manufacturer)}, ${q(p.service_status)}, ${num(p.ioc_year)}, ${q(p.program_stage)})`
  )
}

function sensorRow(s: PlatformSensor): string {
  return (
    `  (${q(s.id)}, ${q(s.platform_id)}, ${q(s.kind)}, ${q(s.label)}, ${q(s.band)}, ${q(s.antenna)}, ` +
    `${q(s.role)}, ${qArr(s.can_detect)}, ${qArr(s.cannot_detect)}, ${q(s.strengths)}, ${q(s.limitations)}, ` +
    `${q(s.confidence)}, ${q(s.intel_note)}, ${qArr(s.sources)}, ${q(s.performance_ref ?? null)}, ${q(s.radar_catalog_id ?? null)})`
  )
}

function commsRow(c: CommsBearer): string {
  return (
    `  (${q(c.id)}, ${q(c.platform_id)}, ${q(c.kind)}, ${q(c.standard)}, ${q(c.band)}, ${q(c.label)}, ` +
    `${bool(c.gateway_capable)}, ${q(c.comsec_note)}, ${bool(c.pnt_dependent)}, ${q(c.data_confidence)}, ` +
    `${qArr(c.sources)}, ${q(c.boundary_note)}, NULL)`
  )
}

function futureRow(f: FutureProgramDetail): string {
  return (
    `  (${q(f.platform_id)}, ${q(f.program_name)}, ${q(f.lead_contractor)}, ${qArr(f.partner_nations)}, ` +
    `${q(f.first_flight_est)}, ${q(f.ioc_est)}, ${qArr(f.key_features)}, ${q(f.status_note)}, ` +
    `${q(f.data_confidence)}, ${qArr(f.sources)})`
  )
}

// ── Build SQL ───────────────────────────────────────────────────────────────
const { platforms } = catalogBundle()
const sensors = platforms.flatMap((p) => p.sensors)
const comms = platforms.flatMap((p) => p.comms)
const futures = platforms.map((p) => p.future).filter((f): f is FutureProgramDetail => !!f)

const chunk = <T,>(rows: T[], render: (r: T) => string): string => rows.map(render).join(',\n')

const sql = `-- Force Catalogue seed — GENERATED from data/force-catalog/*.ts. DO NOT EDIT BY HAND.
-- Regenerate: npx tsx scripts/generate-force-catalog-seed.ts
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY. OSINT only.
-- Idempotent: wipes catalogue rows (is_catalog = true) then re-inserts. Exercise data untouched.

BEGIN;

-- Wipe existing catalogue rows (cascades to catalogue sensors/comms/future via FK).
DELETE FROM bmi_exercise_platforms WHERE is_catalog = true;
DELETE FROM bmi_catalog_nations;

-- ── Nations ──────────────────────────────────────────────────────────────────
INSERT INTO bmi_catalog_nations (code, name, force_side, blocs, region) VALUES
${chunk(CATALOG_NATIONS, nationRow)}
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, force_side = EXCLUDED.force_side, blocs = EXCLUDED.blocs, region = EXCLUDED.region;

-- ── Platforms (catalogue rows: exercise_id NULL, is_catalog true) ─────────────
INSERT INTO bmi_exercise_platforms
  (id, exercise_id, nation_code, designation, short_name, domain, role, qty, base_id, force_side,
   open_source_summary, data_confidence, sources, platform_library_id, is_catalog, nation_name,
   manufacturer, service_status, ioc_year, program_stage) VALUES
${chunk(platforms, platformRow)}
ON CONFLICT (id) DO UPDATE SET
  designation = EXCLUDED.designation, short_name = EXCLUDED.short_name, domain = EXCLUDED.domain,
  role = EXCLUDED.role, force_side = EXCLUDED.force_side, open_source_summary = EXCLUDED.open_source_summary,
  data_confidence = EXCLUDED.data_confidence, sources = EXCLUDED.sources,
  platform_library_id = EXCLUDED.platform_library_id, is_catalog = EXCLUDED.is_catalog,
  nation_name = EXCLUDED.nation_name, manufacturer = EXCLUDED.manufacturer,
  service_status = EXCLUDED.service_status, ioc_year = EXCLUDED.ioc_year, program_stage = EXCLUDED.program_stage;

${
  sensors.length
    ? `-- ── Sensors ──────────────────────────────────────────────────────────────────
INSERT INTO bmi_platform_sensors
  (id, platform_id, kind, label, band, antenna, role, can_detect, cannot_detect, strengths,
   limitations, confidence, intel_note, sources, performance_ref, radar_catalog_id) VALUES
${chunk(sensors, sensorRow)}
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label, band = EXCLUDED.band, role = EXCLUDED.role, can_detect = EXCLUDED.can_detect,
  cannot_detect = EXCLUDED.cannot_detect, confidence = EXCLUDED.confidence, intel_note = EXCLUDED.intel_note,
  sources = EXCLUDED.sources, performance_ref = EXCLUDED.performance_ref;
`
    : '-- (no sensors)\n'
}

${
  comms.length
    ? `-- ── Comms bearers ────────────────────────────────────────────────────────────
INSERT INTO bmi_platform_comms
  (id, platform_id, kind, standard, band, label, gateway_capable, comsec_note, pnt_dependent,
   data_confidence, sources, boundary_note, spectrum_capability_id) VALUES
${chunk(comms, commsRow)}
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind, standard = EXCLUDED.standard, band = EXCLUDED.band, label = EXCLUDED.label,
  gateway_capable = EXCLUDED.gateway_capable, comsec_note = EXCLUDED.comsec_note,
  pnt_dependent = EXCLUDED.pnt_dependent, data_confidence = EXCLUDED.data_confidence, sources = EXCLUDED.sources;
`
    : '-- (no comms)\n'
}

${
  futures.length
    ? `-- ── Future-program detail ────────────────────────────────────────────────────
INSERT INTO bmi_future_program_detail
  (platform_id, program_name, lead_contractor, partner_nations, first_flight_est, ioc_est,
   key_features, status_note, data_confidence, sources) VALUES
${chunk(futures, futureRow)}
ON CONFLICT (platform_id) DO UPDATE SET
  program_name = EXCLUDED.program_name, lead_contractor = EXCLUDED.lead_contractor,
  partner_nations = EXCLUDED.partner_nations, first_flight_est = EXCLUDED.first_flight_est,
  ioc_est = EXCLUDED.ioc_est, key_features = EXCLUDED.key_features, status_note = EXCLUDED.status_note,
  data_confidence = EXCLUDED.data_confidence, sources = EXCLUDED.sources;
`
    : '-- (no future programs)\n'
}

COMMIT;

-- Summary: ${CATALOG_NATIONS.length} nations, ${platforms.length} platforms, ${sensors.length} sensors, ${comms.length} comms, ${futures.length} future programs.
`

function nextMigrationStamp(): string {
  const dir = join(process.cwd(), 'supabase', 'migrations')
  let max = 0
  for (const f of readdirSync(dir)) {
    const m = /^(\d{14})_/.exec(f)
    if (m) max = Math.max(max, Number(m[1]))
  }
  const now = Number(new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14))
  // Always after latest local migration so `db push` applies without --include-all
  return String(Math.max(now, max + 1))
}

const ts = nextMigrationStamp()
const outPath = join(process.cwd(), 'supabase', 'migrations', `${ts}_force_catalog_seed.sql`)
writeFileSync(outPath, sql, 'utf8')
console.log(`Wrote ${outPath}`)
console.log(
  `  ${CATALOG_NATIONS.length} nations · ${platforms.length} platforms · ${sensors.length} sensors · ${comms.length} comms · ${futures.length} future`,
)
