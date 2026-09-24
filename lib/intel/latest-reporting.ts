/**
 * Server-side read of the newest Watchfloor reporting window shipped with the
 * instance (data/intel/reporting/<date>.json). Nothing here fetches.
 *
 * Verified like incident bundles (lib/trust/reporting-scan.ts): a file whose
 * ML-DSA-87 signature fails is skipped for the next older valid one. The
 * result carries `signature` (verified, unsigned or unverifiable).
 */
import 'server-only'
import { join } from 'node:path'
import { scanReporting, type LoadedReporting } from '@/lib/trust/reporting-scan'

export function loadLatestReporting(dir = join(process.cwd(), 'data', 'intel', 'reporting')): LoadedReporting | null {
  return scanReporting(dir).latest
}
