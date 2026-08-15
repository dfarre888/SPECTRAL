import { allA3dmPlatforms } from '@/lib/a3dm/to-platform'
import { toMapUasAsset } from '@/lib/map/asset-mappers'
import type { MapAssetsPayload } from '@/lib/map/types'

/** Always fold the A3DM Excel catalog into Map Intel, even if the DB is stale. */
export function ensureCotsMapAssets(assets: MapAssetsPayload): MapAssetsPayload {
  const seen = new Set(assets.uas.map((u) => u.id))
  const extra = allA3dmPlatforms()
    .filter((p) => !seen.has(p.id))
    .map(toMapUasAsset)
  if (extra.length === 0) return assets
  return {
    ...assets,
    uas: [...assets.uas, ...extra].sort((a, b) => a.name.localeCompare(b.name)),
  }
}
