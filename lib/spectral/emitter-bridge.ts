import { BLUE_RADARS } from '@/data/seed-radars-blue';
import { RED_RADARS } from '@/data/seed-radars-red';
import { EXTRA_RADARS } from '@/data/seed-radars-extra';
import { classRangeKm, mapUasToTargetClass } from '@/lib/map/laydown-evaluation';
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain';
import type { MapUasAsset, PlacedRadar } from '@/lib/map/types';
import type { RadarSystem } from '@/lib/spectrum/radar-types';
import type { EmitterSpec } from '@/lib/spectral/detection-types';

const RADAR_BY_ID = new Map<string, RadarSystem>(
  [...RED_RADARS, ...BLUE_RADARS, ...EXTRA_RADARS].map((r) => [r.id, r]),
);

const CLASS_SIGMA_REF_M2 = {
  small_uas: 0.1,
  large_uas: 1.0,
  cruise_missile: 0.5,
  default: 1.0,
} as const;

function referenceSigmaForTarget(tc: ReturnType<typeof mapUasToTargetClass>): number {
  if (tc === 'small_uas') return CLASS_SIGMA_REF_M2.small_uas;
  if (tc === 'cruise_missile') return CLASS_SIGMA_REF_M2.cruise_missile;
  if (tc === 'large_uas' || tc === 'aircraft' || tc === 'helicopter') {
    return CLASS_SIGMA_REF_M2.large_uas;
  }
  return CLASS_SIGMA_REF_M2.default;
}

export function placedRadarToEmitter(radar: PlacedRadar, asset: MapUasAsset): EmitterSpec | null {
  const seed = RADAR_BY_ID.get(radar.asset.id);
  if (!seed) return null;
  const tc = mapUasToTargetClass(asset);
  if (seed.cannot_detect.includes(tc)) return null;
  if (!seed.can_detect.includes(tc)) return null;

  const classRange = classRangeKm(seed, tc);
  if (classRange <= 0) return null;

  return {
    id: radar.instanceId,
    lon: radar.lon,
    lat: radar.lat,
    alt_m: radar.terrainAMSL + TERRAIN_SURFACE_AGL_M,
    classRangeKm: classRange,
    referenceSigmaM2: referenceSigmaForTarget(tc),
    active: true,
  };
}

export function placedRadarsToEmitters(radars: PlacedRadar[], asset: MapUasAsset): EmitterSpec[] {
  const out: EmitterSpec[] = [];
  for (const r of radars) {
    const e = placedRadarToEmitter(r, asset);
    if (e) out.push(e);
  }
  return out;
}
