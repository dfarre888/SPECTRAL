import type { LaydownSession } from '@/lib/map/laydown-session'
import type { TrackedAsset } from '@/lib/dashboard/types'

const SELECTED_ASSET_KEY = 'spectral-dashboard-selected-asset'

export function readDashboardSelectedAssetId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(SELECTED_ASSET_KEY)
  } catch {
    return null
  }
}

export function writeDashboardSelectedAssetId(instanceId: string): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(SELECTED_ASSET_KEY, instanceId)
  } catch {
    /* quota */
  }
}

/** Prefer Map Intel session pair UAS when building default asset selection. */
export function resolveDefaultAssetId(
  assets: TrackedAsset[],
  session: LaydownSession | null,
  urlAssetId: string | null,
): string | undefined {
  if (urlAssetId && assets.some((a) => a.id === urlAssetId)) return urlAssetId
  const stored = readDashboardSelectedAssetId()
  if (stored && assets.some((a) => a.id === stored)) return stored
  const sessionUas = session?.pairs[0]?.uasInstanceId
  if (sessionUas && assets.some((a) => a.id === sessionUas)) return sessionUas
  return assets[0]?.id
}

export function mergeLaydownSessionHint(
  assets: TrackedAsset[],
  session: LaydownSession | null,
): TrackedAsset[] {
  if (!session?.pairs.length) return assets
  return assets.map((asset) => {
    const pair = session.pairs.find((p) => p.uasInstanceId === asset.id)
    if (!pair) return asset
    return {
      ...asset,
      operator: 'Map Intel adjudication',
      jsaStatus: pair.propagationGated ? ('pending' as const) : ('approved' as const),
      payloadActive: pair.operationsPk != null || pair.staticPk != null,
    }
  })
}
