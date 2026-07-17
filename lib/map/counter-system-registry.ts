import type {
  MapAssetsPayload,
  MapCuasAsset,
  MapEffectorAsset,
  MapRadarAsset,
  MapUasAsset,
} from '@/lib/map/types'

export type CounterPlacementKind = 'cuas' | 'effector' | 'radar' | 'uas'

/** Platform catalogue IDs that also exist as counter-systems — never place as threat UAS. */
export const DUAL_ROLE_PLATFORM_IDS = new Set([
  'iron-beam',
  'lite-beam',
  'dragonfire',
  'coyote-block-3',
  'fpv-interceptor',
  'anduril-anvil',
  'anvil-interceptor',
  'net-gun-system',
  'dronesentry-sentrycs',
  'phalanx-ciws',
  'searam',
  'goalkeeper-ciws',
  'drone-dome',
])

/** When the effector catalogue uses a different id than the platform / C-UAS row. */
export const PLATFORM_TO_EFFECTOR_ID: Record<string, string> = {
  'iron-beam': 'eff-iron-beam',
  'lite-beam': 'eff-lite-beam',
  dragonfire: 'eff-dragonfire',
}

export interface ResolvedAssetPlacement {
  kind: CounterPlacementKind
  asset: MapUasAsset | MapCuasAsset | MapRadarAsset | MapEffectorAsset
}

/**
 * Preferred laydown bucket for a catalogue id.
 * Effector wins over C-UAS when both exist (engagement dome + Pk routing).
 */
export function resolveCounterPlacementKind(
  assetId: string,
  assets: Pick<MapAssetsPayload, 'uas' | 'cuas' | 'radars' | 'effectors'>,
): CounterPlacementKind | null {
  const effectorId = PLATFORM_TO_EFFECTOR_ID[assetId] ?? assetId
  if (assets.effectors.some((e) => e.id === effectorId)) return 'effector'
  if (assets.cuas.some((c) => c.id === assetId)) return 'cuas'
  if (assets.radars.some((r) => r.id === assetId)) return 'radar'
  if (assets.uas.some((u) => u.id === assetId)) return 'uas'
  return null
}

/** Resolve catalogue row + laydown kind, honouring dual-listed counter platforms. */
export function resolveAssetPlacement(
  assetId: string,
  assets: MapAssetsPayload,
  preferredKind?: CounterPlacementKind,
): ResolvedAssetPlacement | null {
  if (preferredKind === 'uas' && !DUAL_ROLE_PLATFORM_IDS.has(assetId)) {
    const asset = assets.uas.find((u) => u.id === assetId)
    return asset ? { kind: 'uas', asset } : null
  }

  const kind = resolveCounterPlacementKind(assetId, assets)
  if (!kind) return null

  if (kind === 'effector') {
    const effectorId = PLATFORM_TO_EFFECTOR_ID[assetId] ?? assetId
    const asset = assets.effectors.find((e) => e.id === effectorId)
    return asset ? { kind: 'effector', asset } : null
  }
  if (kind === 'cuas') {
    const asset = assets.cuas.find((c) => c.id === assetId)
    return asset ? { kind: 'cuas', asset } : null
  }
  if (kind === 'radar') {
    const asset = assets.radars.find((r) => r.id === assetId)
    return asset ? { kind: 'radar', asset } : null
  }
  const asset = assets.uas.find((u) => u.id === assetId)
  return asset ? { kind: 'uas', asset } : null
}

/** True when this id must not be placed as a threat UAS regardless of search list. */
export function isCounterCapablePlatform(assetId: string, assets: MapAssetsPayload): boolean {
  if (DUAL_ROLE_PLATFORM_IDS.has(assetId)) return true
  const kind = resolveCounterPlacementKind(assetId, assets)
  return kind === 'cuas' || kind === 'effector' || kind === 'radar'
}
