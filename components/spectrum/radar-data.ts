'use client';
/**
 * Radar data access — loads radar systems and exposes them to the radar
 * canvas, the library, and AeroCopilot. Supabase path documented for Cursor.
 */

import { useMemo } from 'react';
import type { RadarSystem, RadarBand, RadarMobility, TargetClass } from '@/lib/spectrum/radar-types';
import { radarToCapability } from '@/lib/spectrum/radar-types';
import { RED_RADARS } from '@/data/seed-radars-red';
import { BLUE_RADARS } from '@/data/seed-radars-blue';
import { EXTRA_RADARS } from '@/data/seed-radars-extra';

const ALL_RADARS: RadarSystem[] = [...RED_RADARS, ...BLUE_RADARS, ...EXTRA_RADARS].map((r) => ({
  ...r,
  capability: radarToCapability(r),
}));

export function useRadars() {
  // Supabase path (mirror usePlatforms): query a `radar_systems` table, then
  // map rows → RadarSystem and attach radarToCapability(). Falls back to seed.
  return useMemo(() => ALL_RADARS, []);
}

export function useRadar(id: string | null): RadarSystem | null {
  return useMemo(() => (id ? ALL_RADARS.find((r) => r.id === id) ?? null : null), [id]);
}

/** Group radars into canvas lanes by IEEE band for the radar EW spectrum. */
export function radarLanesByBand(radars: RadarSystem[], side?: 'red' | 'blue') {
  const filtered = side ? radars.filter((r) => r.side === side) : radars;
  // lanes ordered low→high frequency
  const bandOrder: RadarBand[] = ['HF', 'VHF', 'UHF', 'L', 'S', 'C', 'X', 'Ku', 'K', 'Ka'];
  return bandOrder
    .map((band) => ({
      band,
      radars: filtered.filter((r) => r.bands.includes(band)),
    }))
    .filter((g) => g.radars.length > 0);
}
