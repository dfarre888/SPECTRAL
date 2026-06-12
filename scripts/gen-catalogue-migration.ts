/**
 * Generate Supabase migration SQL for catalogue expansion.
 * Run: npx tsx scripts/gen-catalogue-migration.ts > supabase/migrations/20260612120000_catalogue_expansion.sql
 */
import {
  TIER1_CONFLICT,
  TIER2_ENCYCLOPEDIC,
  TIER5_MARITIME,
  TIER_BLUE_EXPANSION,
} from '../data/catalogue-expansion';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const catMap: Record<string, string> = {
  'tactical ISR': 'tactical',
  'Loitering munition': 'loitering_munition',
  FPV: 'FPV',
  'MALE UCAV': 'MALE',
  'HALE ISR': 'HALE',
  'VTOL ISR': 'VTOL',
  'Naval USV': 'naval',
  'Interceptor UAS': 'interceptor_uas',
  'Combat hexacopter': 'combat_hexacopter',
  'Tube-launched LM': 'tube_launched_lm',
  'Carrier UAS': 'carrier_uas',
  'Autonomous LM': 'loitering_munition',
};

function parseOrigin(origin: string) {
  const m = origin.match(/^([^(]+)(?:\(([^)]+)\))?/);
  const country = (m?.[1] ?? origin).split('/')[0].trim();
  const mfr = m?.[2]?.trim() ?? country;
  return { country, mfr };
}

function guidanceFor(category: string): string {
  if (category.includes('FPV') || category.includes('hexacopter')) return 'RF_command';
  if (category.includes('Loitering') || category.includes('OWA')) return 'preprogrammed';
  if (category.includes('Autonomous')) return 'autonomous';
  if (category.includes('MALE') || category.includes('HALE') || category.includes('UCAV')) return 'RF_command';
  if (category.includes('Naval')) return 'INS+GPS';
  return 'INS+GPS';
}

function platformRow(p: (typeof TIER1_CONFLICT)[0]) {
  const cat = catMap[p.category ?? 'tactical'] ?? 'tactical';
  const endurance = Math.round(Math.min((p.range_km && p.speed_kmh ? p.range_km / p.speed_kmh : 1), 48) * 100) / 100;
  const { country, mfr } = parseOrigin(p.origin ?? 'Unknown');
  return `  (${q(p.id)}, ${q(p.name)}, ${q(mfr)}, ${q(country)}, ${q(cat)},
   ${p.speed_kmh ?? 100}, ${p.ceiling_m ?? 3000}, ${p.range_km ?? 10}, ${endurance}, ${p.mass_kg ?? 10}, ${p.warhead_kg ?? 'NULL'},
   ${q(guidanceFor(p.category ?? 'tactical'))}, false, false, false,
   ARRAY['GPS']::TEXT[], ARRAY['INS']::TEXT[], ARRAY[]::TEXT[], ARRAY['EO']::TEXT[],
   ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12'])`;
}

const redPlatforms = [...TIER1_CONFLICT, ...TIER2_ENCYCLOPEDIC, ...TIER5_MARITIME];

let sql = `-- SPECTRAL Catalogue Expansion — Tiers 1, 2, 5 platforms + Tier 4 effectors
-- CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
-- Generated: ${new Date().toISOString().slice(0, 10)}

`;

sql += `INSERT INTO platforms (
  id, name, manufacturer, country_of_origin, category,
  max_speed_kmh, service_ceiling_m, range_km, endurance_hrs, mtow_kg, warhead_kg,
  guidance_type, gnss_independent, ai_autonomous, swarm_capable,
  gnss_used, nav_backup, weapon_types, sensor_suite, known_operators, conflict_deployments,
  data_confidence, sources
) VALUES\n`;
sql += redPlatforms.map(platformRow).join(',\n');
sql += `\nON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, category = EXCLUDED.category,
  max_speed_kmh = EXCLUDED.max_speed_kmh, range_km = EXCLUDED.range_km,
  data_confidence = EXCLUDED.data_confidence, sources = EXCLUDED.sources;\n\n`;

const navalEffectors = TIER_BLUE_EXPANSION.filter((p) =>
  ['goalkeeper-ciws', 'searam', 'millennium-35mm', 'dardo-fast-forty', 'starstreak-hvm',
   'hq-17', 'eos-slinger', 'smash-hopper', 'phalanx-ciws'].includes(p.id)
);

sql += `INSERT INTO anti_drone_systems (
  id, name, manufacturer, country, defeat_method, effective_range_m,
  portability, conflict_validated, data_confidence, sources
) VALUES\n`;
sql += navalEffectors.map((e) => {
  const rangeM = Math.round((e.range_km ?? 1) * 1000);
  const naval = (e.category ?? '').includes('Naval');
  return `  (${q(e.id)}, ${q(e.name)}, ${q('OSINT assessed')}, ${q('Multi')},
   ARRAY['kinetic']::TEXT[], ${rangeM}, ${q(naval ? 'naval' : 'vehicle')}, true, 'medium',
   ARRAY['OSINT: SPECTRAL catalogue expansion 2026-06-12'])`;
}).join(',\n');
sql += `\nON CONFLICT (id) DO UPDATE SET
  effective_range_m = EXCLUDED.effective_range_m,
  data_confidence = EXCLUDED.data_confidence;\n\n`;

// Defeat effectiveness for key threats vs new effectors
const threats = ['shahed-136', 'samad-2', 'mohajer-6', 'gerbera-parody', 'houthi-owa-maritime'];
const systems = ['goalkeeper-ciws', 'searam', 'phalanx-ciws', 'iron-beam', 'drone-dome'];
sql += `-- Defeat matrix rows for OWA/maritime vs naval CIWS\n`;
for (const t of threats) {
  for (const s of systems) {
    const kinetic = s.includes('ciws') || s === 'searam' ? 75 : null;
    const dew = s === 'iron-beam' ? 85 : null;
    const rf = s === 'drone-dome' ? 40 : null;
    sql += `INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, kinetic_pct, dew_pct, rf_jamming_pct, data_confidence)
SELECT ${q(t)}, ${q(s)}, ${kinetic ?? 'NULL'}, ${dew ?? 'NULL'}, ${rf ?? 'NULL'}, 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = ${q(t)} AND defeat_system_id = ${q(s)});\n`;
  }
}

sql += `\n-- Gerbera decoy special case\n`;
sql += `INSERT INTO defeat_effectiveness (platform_id, defeat_system_id, rf_jamming_pct, kinetic_pct, special_notes, data_confidence)
SELECT 'gerbera-parody', 'drone-dome', 90, 20, 'Decoy — RF jam effective but exchange ratio poor; kinetic wasteful', 'medium'
WHERE NOT EXISTS (SELECT 1 FROM defeat_effectiveness WHERE platform_id = 'gerbera-parody' AND defeat_system_id = 'drone-dome');\n`;

process.stdout.write(sql);
