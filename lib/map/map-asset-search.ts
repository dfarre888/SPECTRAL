import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapEffectorAsset,
  MapRadarAsset,
  MapUasAsset,
} from '@/lib/map/types'

export type MapAssetSearchKind = 'uas' | 'cuas' | 'radar' | 'effector'

export interface MapAssetSearchHit {
  kind: MapAssetSearchKind
  asset: MapUasAsset | MapCuasAsset | MapRadarAsset | MapEffectorAsset
}

export interface FilteredMapAssets {
  uas: MapUasAsset[]
  cuas: MapCuasAsset[]
  radars: MapRadarAsset[]
  effectors: MapEffectorAsset[]
  hits: MapAssetSearchHit[]
  total: number
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesMapAssetSearch(haystack: string, query: string): boolean {
  const q = normalizeSearchText(query)
  if (!q) return true
  const normalized = normalizeSearchText(haystack)
  const tokens = q.split(' ').filter(Boolean)
  return tokens.every((token) => normalized.includes(token))
}

function uasHaystack(asset: MapUasAsset): string {
  return [asset.id, asset.slug, asset.name, asset.manufacturer, asset.category, asset.categoryLabel].join(' ')
}

function cuasHaystack(asset: MapCuasAsset): string {
  return [asset.id, asset.name, asset.categoryLabel, ...asset.defeat_methods].join(' ')
}

function radarHaystack(asset: MapRadarAsset): string {
  return [
    asset.id,
    asset.name,
    asset.roleLabel,
    asset.bandsLabel,
    asset.side,
    asset.nato_name ?? '',
    asset.associated_system ?? '',
  ].join(' ')
}

function effectorHaystack(asset: MapEffectorAsset): string {
  return [
    asset.id,
    asset.name,
    asset.tierLabel,
    asset.effect,
    asset.side,
    asset.associated_system ?? '',
    ...asset.linkedRadars.map((r) => r.name),
  ].join(' ')
}

export function filterMapAssets(assets: MapAssetsPayload, query: string): FilteredMapAssets {
  const uas = assets.uas.filter((a) => matchesMapAssetSearch(uasHaystack(a), query))
  const cuas = assets.cuas.filter((a) => matchesMapAssetSearch(cuasHaystack(a), query))
  const radars = assets.radars.filter((a) => matchesMapAssetSearch(radarHaystack(a), query))
  const effectors = assets.effectors.filter((a) =>
    matchesMapAssetSearch(effectorHaystack(a), query),
  )

  const hits: MapAssetSearchHit[] = [
    ...uas.map((asset) => ({ kind: 'uas' as const, asset })),
    ...cuas.map((asset) => ({ kind: 'cuas' as const, asset })),
    ...radars.map((asset) => ({ kind: 'radar' as const, asset })),
    ...effectors.map((asset) => ({ kind: 'effector' as const, asset })),
  ]

  return {
    uas,
    cuas,
    radars,
    effectors,
    hits,
    total: hits.length,
  }
}
