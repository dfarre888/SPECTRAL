/**
 * Days of fire: Pk evidence from the Defeat Matrix, server side.
 * UNCLASSIFIED // FOR OFFICIAL TRAINING USE ONLY
 */

import 'server-only'

import { getPlatformCountermeasures } from '@/lib/platforms/queries'
import {
  DOF_PLATFORM_ANALOGUES,
  evidenceFromDefeatRows,
  swarmTableEvidence,
  type PkEvidence,
} from '@/lib/planner/days-of-fire-pk'

export interface DaysOfFireEvidence {
  evidence: PkEvidence[]
  /** Defeat Matrix records used; 0 means the database was unreachable and only the swarm table applies. */
  defeatMatrixRecords: number
}

/**
 * Reads the Defeat Matrix rows for every analogue platform through the same
 * query the platform pages use, keeps the rows for analogue systems, and adds
 * the swarm table. Never throws: with no database the swarm table still gives
 * a Shahed-136 ladder.
 */
export async function loadDaysOfFireEvidence(): Promise<DaysOfFireEvidence> {
  const platformIds = [...new Set(Object.values(DOF_PLATFORM_ANALOGUES).flat())]
  const batches = await Promise.all(
    platformIds.map((id) => getPlatformCountermeasures(id).catch(() => [])),
  )
  const fromMatrix = evidenceFromDefeatRows(batches.flat())
  return {
    evidence: [...fromMatrix, ...swarmTableEvidence()],
    defeatMatrixRecords: fromMatrix.length,
  }
}
