const STORAGE_KEY = 'spectral-map-laydown-session'

export interface LaydownSessionPair {
  platformId: string
  systemId: string
  uasInstanceId: string
  cuasInstanceId: string
  staticPk: number | null
  operationsPk: number | null
  jamToSignal_db: number | null
  los_state: string
  propagationGated: boolean
}

export interface LaydownSession {
  updatedAt: string
  pairs: LaydownSessionPair[]
}

export function writeLaydownSession(session: LaydownSession): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* quota */
  }
}

export function readLaydownSession(): LaydownSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LaydownSession
  } catch {
    return null
  }
}

export function mapIntelDeepLink(platformId: string, systemId: string): string {
  const params = new URLSearchParams({
    stage: platformId,
    cuas: systemId,
    from: 'defeat',
  })
  return `/map?${params.toString()}`
}

export function findSessionPair(
  session: LaydownSession | null,
  platformId: string,
  systemId: string,
): LaydownSessionPair | null {
  if (!session) return null
  return (
    session.pairs.find((p) => p.platformId === platformId && p.systemId === systemId) ?? null
  )
}
