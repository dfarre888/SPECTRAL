import type { Side } from '@/lib/spectrum/types'
import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapEffectorAsset,
  MapRadarAsset,
  MapUasAsset,
} from '@/lib/map/types'
import type { MapAssetSearchHit } from '@/lib/map/map-asset-search'

export type MapForceFilter = 'red' | 'blue' | 'both'

/** Effective force sides for a UAS catalogue entry (platform.side). */
export function uasForceSides(asset: MapUasAsset): Side[] {
  const side = asset.side
  if (side === 'red') return ['red']
  if (side === 'blue') return ['blue']
  // Neutral / unknown — usable by either force in training laydowns.
  return ['red', 'blue']
}

/** C-UAS defeat systems are always Blue Force assets. */
export function cuasForceSides(_asset?: MapCuasAsset): Side[] {
  return ['blue']
}

/** Radars and SAM/BMD effectors expose a single catalogue side (or dual-use neutral). */
export function assetSideForceSides(asset: { side: Side }): Side[] {
  if (asset.side === 'neutral') return ['red', 'blue']
  return [asset.side]
}

export function matchesForceFilter(filter: MapForceFilter, sides: Side[]): boolean {
  if (filter === 'both') return true
  return sides.includes(filter)
}

export function applyForceFilter<T>(
  items: T[],
  filter: MapForceFilter,
  resolveSides: (item: T) => Side[],
): T[] {
  if (filter === 'both') return items
  return items.filter((item) => matchesForceFilter(filter, resolveSides(item)))
}

export function filterMapAssetHits(
  hits: MapAssetSearchHit[],
  filter: MapForceFilter,
): MapAssetSearchHit[] {
  return applyForceFilter(hits, filter, (hit) => {
    switch (hit.kind) {
      case 'uas':
        return uasForceSides(hit.asset as MapUasAsset)
      case 'cuas':
        return cuasForceSides(hit.asset as MapCuasAsset)
      case 'radar':
        return assetSideForceSides(hit.asset as MapRadarAsset)
      case 'effector':
        return assetSideForceSides(hit.asset as MapEffectorAsset)
    }
  })
}

export function applyForceFilterToAssets(
  assets: MapAssetsPayload,
  filter: MapForceFilter,
): Pick<MapAssetsPayload, 'uas' | 'cuas' | 'radars' | 'effectors'> {
  return {
    uas: applyForceFilter(assets.uas, filter, uasForceSides),
    cuas: applyForceFilter(assets.cuas, filter, cuasForceSides),
    radars: applyForceFilter(assets.radars, filter, assetSideForceSides),
    effectors: applyForceFilter(assets.effectors, filter, assetSideForceSides),
  }
}