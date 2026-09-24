import { PLATFORMS } from '@/data/seed-platforms'
import { PLATFORM_ID_ALIASES } from '@/data/osint-platform-enrichment'
import type { PlatformRole, WoprPlatform } from '@/lib/wopr/types'

/**
 * Resolve what a platform does. Order: explicit `role`, then the platform
 * catalogue (catalogue Red entries are drones, Blue entries are C-UAS or EW),
 * then force side. The force-side fallback is the engine's original rule
 * (Red drone, Blue C-UAS), so older scenarios keep adjudicating as they did.
 */
export function platformRole(p: Pick<WoprPlatform, 'role' | 'platform_type' | 'side'>): PlatformRole {
  if (p.role) return p.role
  const id = PLATFORM_ID_ALIASES[p.platform_type] ?? p.platform_type
  const seed = PLATFORMS.find((s) => s.id === id || s.id === p.platform_type)
  if (seed) return seed.side === 'red' ? 'uas' : 'cuas'
  return p.side === 'red' ? 'uas' : 'cuas'
}

/** Roles that can deny or defeat a drone in propagation adjudication. */
export function canDefeatUas(role: PlatformRole): boolean {
  return role === 'cuas' || role === 'ew'
}
