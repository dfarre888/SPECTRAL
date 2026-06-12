/* Generates 0002_seed.sql from the TS seed data. Run: npx tsx gen-seed-sql.ts */
import { PLATFORMS } from './data/seed-platforms';
import { CAPABILITIES } from './data/seed-capabilities';
import { SHAHED_VARIANTS } from './data/seed-variants';
import * as fs from 'fs';

const q = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) {
    if (v.length === 0) return 'null';
    return `ARRAY[${v.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',')}]`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
};

let sql = `-- ============================================================================
-- Spectrum Intelligence — seed data (generated from TS source)
-- Run after 0001_spectrum_intelligence.sql. Idempotent via ON CONFLICT.
-- ============================================================================

`;

// platforms
sql += `-- platforms (${PLATFORMS.length})\n`;
for (const p of PLATFORMS) {
  sql += `insert into public.platforms (id,name,variant_label,side,"group",origin,category,role,mass_kg,range_km,speed_kmh,ceiling_m,warhead_kg,c2_uplink_mhz,c2_downlink_mhz,video_mhz,gnss_used,datalink_mhz,satcom_band,confidence,intel_note,icon) values (`;
  sql += [
    q(p.id), q(p.name), q(p.variant_label), q(p.side), q(p.group ?? null),
    q(p.origin), q(p.category), q(p.role), q(p.mass_kg ?? null), q(p.range_km ?? null),
    q(p.speed_kmh ?? null), q(p.ceiling_m ?? null), q(p.warhead_kg ?? null),
    q(p.c2_uplink_mhz ?? null), q(p.c2_downlink_mhz ?? null), q(p.video_mhz ?? null),
    q(p.gnss_used ?? null), q(p.datalink_mhz ?? null), q(p.satcom_band ?? null),
    q(p.confidence ?? 'curated'), q(p.intel_note ?? null), q(p.icon ?? null),
  ].join(',');
  sql += `) on conflict (id) do update set name=excluded.name, intel_note=excluded.intel_note;\n`;
}

// variants
sql += `\n-- platform_variants (${SHAHED_VARIANTS.length})\n`;
SHAHED_VARIANTS.forEach((v, i) => {
  sql += `insert into public.platform_variants (id,platform_id,variant,label,effective_year,summary,defeat_verdict,sort_order) values (`;
  sql += [
    q(v.id), q(v.platform_id), q(v.variant), q(v.label),
    q(v.effective_year ?? null), q(v.summary ?? null), q(v.defeat_verdict ?? null), q(i),
  ].join(',');
  sql += `) on conflict (id) do nothing;\n`;
});

// capabilities (curated + variant-attached)
const allCaps = [...CAPABILITIES, ...SHAHED_VARIANTS.flatMap((v) => v.capabilities)];
sql += `\n-- spectrum_capabilities (${allCaps.length})\n`;
for (const c of allCaps) {
  sql += `insert into public.spectrum_capabilities (id,platform_id,variant,axis,layer,fn,label,freq_low_hz,freq_high_hz,wavelength_low_um,wavelength_high_um,power_dbm,range_km,defeat_resistance,note,derived) values (`;
  sql += [
    q(c.id), q(c.platform_id), q(c.variant ?? null), q(c.axis), q(c.layer), q(c.fn), q(c.label),
    q(c.freq_low_hz ?? null), q(c.freq_high_hz ?? null),
    q(c.wavelength_low_um ?? null), q(c.wavelength_high_um ?? null),
    q(c.power_dbm ?? null), q(c.range_km ?? null),
    q(c.defeat_resistance ?? null), q(c.note ?? null), q(c.derived ?? false),
  ].join(',');
  sql += `) on conflict (id) do nothing;\n`;
}

fs.writeFileSync('supabase/migrations/0002_seed.sql', sql);
console.log(`Wrote 0002_seed.sql: ${PLATFORMS.length} platforms, ${SHAHED_VARIANTS.length} variants, ${allCaps.length} capabilities`);
