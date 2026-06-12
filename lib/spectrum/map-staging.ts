export const MAP_STAGING_KEY = 'spectra:map-staging'

export interface MapStagingPayload {
  placeIds: string[]
  highlightIds?: string[]
  stagedAt: string
}

export function writeMapStaging(payload: {
  placeIds: string[]
  highlightIds?: string[]
}): void {
  if (typeof window === 'undefined') return
  const data: MapStagingPayload = {
    placeIds: payload.placeIds,
    highlightIds: payload.highlightIds,
    stagedAt: new Date().toISOString(),
  }
  sessionStorage.setItem(MAP_STAGING_KEY, JSON.stringify(data))
}

export function readMapStaging(): MapStagingPayload | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(MAP_STAGING_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as MapStagingPayload
  } catch {
    return null
  }
}

export function clearMapStaging(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(MAP_STAGING_KEY)
}
