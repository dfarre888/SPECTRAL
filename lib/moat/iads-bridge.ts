// SPECTRAL — IADS ↔ SAM profile bridge
// CLASSIFICATION: UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY

import {
  IADS_THREAT_CATALOGUE,
  getIadsThreat,
  type IadsThreatEntry,
} from '@/lib/moat/sovereignData'
import type { SamSystemGroup } from '@/lib/defeat/sam-matrix-bridge'
import { getSamSystemGroup } from '@/lib/defeat/sam-matrix-bridge'

export { IADS_THREAT_CATALOGUE, getIadsThreat }

export type IadsCatalogueGroup = SamSystemGroup | 'manpads_family'

const GROUP_ORDER: IadsCatalogueGroup[] = [
  'manpads_family',
  'manpads',
  'short_range',
  'medium',
  'long_range',
  'legacy',
  'other',
]

const GROUP_LABELS: Record<IadsCatalogueGroup, string> = {
  manpads_family: 'MANPADS Family',
  manpads: 'MANPADS',
  short_range: 'Short-Range SAM',
  medium: 'Medium SAM',
  long_range: 'Long-Range SAM',
  legacy: 'Legacy / Export',
  other: 'Other',
}

function catalogueGroupForEntry(entry: IadsThreatEntry): IadsCatalogueGroup {
  if (entry.id === 'iads-manpads-family') return 'manpads_family'
  const profileId = entry.sam_profile_id ?? entry.sam_profile_ids?.[0]
  if (!profileId) return 'other'
  return getSamSystemGroup(profileId)
}

export function getIadsEntryForSamProfile(samProfileId: string): IadsThreatEntry | undefined {
  return IADS_THREAT_CATALOGUE.find(
    (entry) =>
      entry.sam_profile_id === samProfileId ||
      entry.sam_profile_ids?.includes(samProfileId),
  )
}

export function getSpectralRoleForSam(samProfileId: string): string | null {
  const entry = getIadsEntryForSamProfile(samProfileId)
  if (!entry) return null
  return entry.spectral_role.replace(/_/g, ' ')
}

export const SAM_CATALOGUE_GROUPS: {
  group: IadsCatalogueGroup
  label: string
  entries: IadsThreatEntry[]
}[] = GROUP_ORDER.map((group) => ({
  group,
  label: GROUP_LABELS[group],
  entries: IADS_THREAT_CATALOGUE.filter((e) => catalogueGroupForEntry(e) === group),
})).filter((g) => g.entries.length > 0)
