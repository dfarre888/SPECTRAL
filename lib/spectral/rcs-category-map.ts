import type { MapUasAsset } from '@/lib/map/types';
import type { RcsCategoryKey } from '@/lib/spectral/detectionPhysicsConstants';

/** Map platform category to RCS fallback bucket for getRcsFacets(). */
export function inferRcsCategoryFromAsset(asset: MapUasAsset): RcsCategoryKey {
  const cat = asset.category.toLowerCase();
  if (cat === 'fpv') return 'micro_uas';
  if (cat.includes('cruise')) return 'cruise_missile';
  if (cat === 'male' || cat === 'hale') return asset.max_altitude_agl_m > 8000 ? 'hale_uas' : 'large_uas';
  if (
    cat === 'loitering_munition' ||
    cat === 'tube_launched_lm' ||
    cat === 'tactical' ||
    cat === 'fixed_wing_tactical'
  ) {
    return asset.max_range_km > 150 ? 'medium_uas' : 'small_uas';
  }
  if (cat === 'naval' || cat === 'vtol') return 'medium_uas';
  return 'small_uas';
}
