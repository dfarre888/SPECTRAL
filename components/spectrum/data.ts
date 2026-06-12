'use client';
/**
 * Spectrum Intelligence — data access
 * Queries Supabase for platforms, capabilities and variants. Falls back to the
 * bundled seed data when Supabase is unavailable (offline / pre-seed dev).
 *
 * Wire `createClient` to your existing Supabase SSR helper.
 */

import { useEffect, useState, useMemo } from 'react';
import type {
  Platform,
  SpectrumCapability,
  PlatformVariant,
  SpectrumAxis,
  Side,
} from '@/lib/spectrum/types';
import { resolveCapabilities } from '@/lib/spectrum/fallback';
import { PLATFORMS } from '@/data/seed-platforms';
import { CAPABILITIES } from '@/data/seed-capabilities';
import { CATALOGUE_VARIANTS, SHAHED_VARIANTS } from '@/data/seed-variants';
import type { CanvasLane } from '@/components/spectrum/SpectrumCanvas';

/* ---- Supabase client (swap for your app's helper) ---- */
// import { createClient } from '@/lib/supabase/client';

/** Hydrate the seed into platforms-with-capabilities (offline source of truth). */
function hydrateSeed(): Platform[] {
  const capsByPlatform = new Map<string, SpectrumCapability[]>();
  for (const c of CAPABILITIES) {
    const arr = capsByPlatform.get(c.platform_id) ?? [];
    arr.push(c);
    capsByPlatform.set(c.platform_id, arr);
  }
  return PLATFORMS.map((p) => ({
    ...p,
    capabilities: capsByPlatform.get(p.id) ?? [],
  }));
}

const SEED = hydrateSeed();

/**
 * usePlatforms — returns all platforms with resolved capabilities.
 * Tries Supabase first; falls back to seed.
 */
export function usePlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>(SEED);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'supabase' | 'seed'>('seed');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // --- Supabase path (uncomment & wire to your client) ---
        // const sb = createClient();
        // const { data: plats, error: e1 } = await sb.from('platforms').select('*');
        // const { data: caps, error: e2 } = await sb.from('spectrum_capabilities').select('*');
        // if (e1 || e2 || !plats) throw e1 || e2;
        // const byId = new Map<string, SpectrumCapability[]>();
        // for (const c of caps ?? []) {
        //   const a = byId.get(c.platform_id) ?? []; a.push(c as SpectrumCapability); byId.set(c.platform_id, a);
        // }
        // const merged: Platform[] = (plats as Platform[]).map(p => ({ ...p, capabilities: byId.get(p.id) ?? [] }));
        // if (!cancelled) { setPlatforms(merged); setSource('supabase'); }

        // For now, resolve from seed (and apply fallback where curated rows are absent):
        const resolved = SEED.map((p) => ({
          ...p,
          capabilities: resolveCapabilities(p),
        }));
        if (!cancelled) {
          setPlatforms(resolved);
          setSource('seed');
        }
      } catch {
        if (!cancelled) {
          setPlatforms(SEED);
          setSource('seed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { platforms, loading, source };
}

export function usePlatform(id: string | null) {
  const { platforms } = usePlatforms();
  return useMemo(
    () => (id ? platforms.find((p) => p.id === id) ?? null : null),
    [platforms, id]
  );
}

export function useVariants(platformId: string | null): PlatformVariant[] {
  return useMemo(() => {
    if (!platformId) return [];
    if (platformId === 'shahed-136') return SHAHED_VARIANTS;
    return CATALOGUE_VARIANTS.filter((v) => v.platform_id === platformId);
  }, [platformId]);
}

/* ---- lane builders ---- */

/** Functions grouped into display lanes per axis. */
const RF_LANES: { key: string; label: string; fns: string[] }[] = [
  { key: 'control', label: 'CONTROL', fns: ['control'] },
  { key: 'video', label: 'VIDEO', fns: ['video'] },
  { key: 'datalink', label: 'DATALINK', fns: ['datalink', 'telemetry'] },
  { key: 'nav', label: 'NAV (GNSS)', fns: ['navigation'] },
  { key: 'radar', label: 'RADAR', fns: ['radar_emit'] },
  { key: 'jam', label: 'JAM / EW', fns: ['jam_control', 'jam_video', 'jam_gnss', 'jam_datalink', 'spoof_gnss', 'takeover', 'hpm'] },
  { key: 'detect', label: 'DETECT', fns: ['detect_rf', 'detect_radar'] },
];

const EOIR_LANES: { key: string; label: string; fns: string[] }[] = [
  { key: 'sensor', label: 'SENSOR', fns: ['sensor', 'detect_eo_ir'] },
  { key: 'laser', label: 'LASER', fns: ['laser', 'laser_defeat'] },
];

/**
 * Build canvas lanes for a set of platforms on a given axis.
 * In platform mode lanes are by function; the band colour comes from layer.
 */
export function buildLanes(
  platforms: Platform[],
  axis: SpectrumAxis,
  mode: 'reference' | 'platform' | 'engagement'
): CanvasLane[] {
  const onAxis = (c: SpectrumCapability) => {
    if (axis === 'rf') return c.axis === 'rf';
    if (axis === 'gnss') return c.axis === 'gnss';
    if (axis === 'eo_ir') return c.axis === 'eo_ir';
    return c.axis === 'cbrn';
  };

  if (mode === 'engagement') {
    // one lane per platform, coloured by side
    return platforms.map((p) => ({
      key: p.id,
      label: `${p.side.toUpperCase()} · ${p.name}`,
      side: p.side as Side,
      caps: (p.capabilities ?? []).filter(onAxis),
    }));
  }

  // platform / reference mode: group by function lanes
  const laneDefs = axis === 'eo_ir' ? EOIR_LANES : RF_LANES;
  const allCaps = platforms.flatMap((p) =>
    (p.capabilities ?? []).filter(onAxis).map((c) => ({ c, side: p.side as Side }))
  );

  return laneDefs
    .map((ld) => ({
      key: ld.key,
      label: ld.label,
      side: 'neutral' as Side,
      caps: allCaps.filter((x) => ld.fns.includes(x.c.fn)).map((x) => x.c),
    }))
    .filter((lane) => lane.caps.length > 0);
}

/** Reference background bands per axis (the faint "wall chart" guides). */
export function referenceBandsFor(axis: SpectrumAxis) {
  const MHz = (m: number) => m * 1e6;
  const GHz = (g: number) => g * 1e9;
  if (axis === 'rf') {
    return [
      { lo: MHz(433), hi: MHz(435), label: '433M', tint: 'rgba(255,255,255,0.03)' },
      { lo: MHz(902), hi: MHz(928), label: '915M', tint: 'rgba(255,255,255,0.03)' },
      { lo: MHz(1160), hi: MHz(1610), label: 'GNSS', tint: 'rgba(74,222,128,0.05)' },
      { lo: MHz(2400), hi: MHz(2483.5), label: '2.4G', tint: 'rgba(248,113,113,0.06)' },
      { lo: MHz(5725), hi: MHz(5875), label: '5.8G', tint: 'rgba(255,255,255,0.03)' },
      { lo: GHz(8), hi: GHz(12), label: 'X', tint: 'rgba(251,191,36,0.04)' },
      { lo: GHz(12), hi: GHz(18), label: 'Ku', tint: 'rgba(251,191,36,0.04)' },
    ];
  }
  if (axis === 'gnss') {
    return [
      { lo: MHz(1164), hi: MHz(1215), label: 'ARNS (L5/E5)', tint: 'rgba(74,222,128,0.05)' },
      { lo: MHz(1215), hi: MHz(1350), label: 'RADAR-SHARED', tint: 'rgba(251,191,36,0.05)' },
      { lo: MHz(1559), hi: MHz(1610), label: 'ARNS (L1/E1)', tint: 'rgba(74,222,128,0.05)' },
    ];
  }
  if (axis === 'eo_ir') {
    return [
      { lo: 0.2, hi: 0.4, label: 'UV', tint: 'rgba(167,139,250,0.08)' },
      { lo: 0.4, hi: 0.7, label: 'VISIBLE', tint: 'rgba(255,255,255,0.04)' },
      { lo: 0.7, hi: 1.0, label: 'NIR', tint: 'rgba(239,68,68,0.05)' },
      { lo: 1.0, hi: 3.0, label: 'SWIR', tint: 'rgba(127,29,29,0.18)' },
      { lo: 3.0, hi: 5.0, label: 'MWIR', tint: 'rgba(127,29,29,0.18)' },
      { lo: 8.0, hi: 14.0, label: 'LWIR', tint: 'rgba(127,29,29,0.18)' },
    ];
  }
  return [];
}
