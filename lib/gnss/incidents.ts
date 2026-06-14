import { SEED_GNSS_INCIDENTS } from '@/data/seed-gnss-incidents'
import { gnssAnalyticsEngine } from '@/lib/gnss/analytics-engine'
import type { AnalyticsSummary, GnssIncident } from '@/lib/gnss/types'

export { SEED_GNSS_INCIDENTS } from '@/data/seed-gnss-incidents'
export { gnssAnalyticsEngine } from '@/lib/gnss/analytics-engine'
export type { GnssIncident, AnalyticsSummary, EvidenceGrade, FailureFamily } from '@/lib/gnss/types'
export {
  BAND_REFERENCE,
  FAILURE_FAMILY_REFERENCE,
  FAILURE_MODE_REFERENCE,
} from '@/lib/gnss/types'

export function getGnssIncidents(): GnssIncident[] {
  return SEED_GNSS_INCIDENTS
}

export function getGnssAnalytics(): AnalyticsSummary {
  return gnssAnalyticsEngine.analyse(SEED_GNSS_INCIDENTS)
}
