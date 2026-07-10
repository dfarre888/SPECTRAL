import { TERRAIN_MASK_CLEARANCE_M } from '@/lib/map/terrain-masking';
import { TERRAIN_SURFACE_AGL_M } from '@/lib/map/terrain';

/** Effective earth radius (4/3 model) for radio horizon. */
export const R_EFF_M = 6371000 * (4 / 3);

export function maskedByRadioHorizon(
  radarAltM: number,
  targetAltM: number,
  rangeM: number,
): boolean {
  const hR = Math.max(radarAltM, 1);
  const hT = Math.max(targetAltM, 1);
  const maxRangeM = Math.sqrt(2 * R_EFF_M * hR) + Math.sqrt(2 * R_EFF_M * hT);
  return rangeM > maxRangeM * 1.02;
}

export function maskedByEarthBulge(
  radarAltM: number,
  targetAltM: number,
  rangeM: number,
  terrainAMSL: number,
): boolean {
  if (rangeM < 80) return false;
  const steps = Math.max(4, Math.ceil(rangeM / 400));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const d = rangeM * t;
    const bulgeM = (d * (rangeM - d)) / (2 * R_EFF_M);
    const lineAltM = radarAltM + t * (targetAltM - radarAltM);
    const terrainAtSample = terrainAMSL + TERRAIN_SURFACE_AGL_M;
    if (lineAltM < bulgeM + terrainAtSample + TERRAIN_MASK_CLEARANCE_M) {
      return true;
    }
  }
  return false;
}
