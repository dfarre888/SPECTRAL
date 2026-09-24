import 'server-only'

import { CONFLICT_CASE_STUDIES } from '@/data/seed-conflicts'
import { BLUE_EFFECTORS } from '@/data/seed-effectors-blue'
import { RED_EFFECTORS } from '@/data/seed-effectors-red'
import { getPlatformCount } from '@/lib/platforms/queries'
import { getGnssJammers } from '@/lib/gnss/queries'

/** Live OSINT catalog counts for dashboard module tiles. */
export async function fetchModuleCatalogStats() {
  let platformCount = 0
  try {
    platformCount = await getPlatformCount()
  } catch {
    platformCount = 0
  }

  const defeatSystemCount =
    BLUE_EFFECTORS.filter((e) => !e.id.includes('evasion')).length +
    RED_EFFECTORS.filter((e) => !e.id.includes('evasion')).length

  return {
    platformCount,
    defeatSystemCount,
    /** GNSS jammers on record in the connected database. */
    gnssJammerCount: await getGnssJammers().then((j) => j.length).catch(() => 0),
    conflictCaseCount: CONFLICT_CASE_STUDIES.length,
    plannerVignetteCount: 5,
  }
}

export type ModuleCatalogStats = Awaited<ReturnType<typeof fetchModuleCatalogStats>>
