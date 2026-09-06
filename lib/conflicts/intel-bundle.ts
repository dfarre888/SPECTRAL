/**
 * Air-gapped conflict intel transfer.
 *
 * The deployment machine has no egress, so the app cannot fetch intel itself.
 * Instead a connected machine produces a bundle, an operator carries it across,
 * and the instance imports it.
 *
 * The design problem is not the transfer, it is honesty about age. An incident
 * timeline labelled "live" on a box that last saw data five weeks ago is worse
 * than an empty one: the operator believes the absence of recent incidents means
 * nothing happened, when it means nobody told the machine. Every read of this
 * data therefore carries its age, and the UI is expected to show it.
 *
 * Integrity here is a checksum, which detects corruption in transit and casual
 * alteration. It is NOT a signature and must not be described as one — real
 * tamper-evidence needs a signing key and a key-management story that belongs to
 * the customer's accreditation, not to this file.
 */

import type { ConflictIncident } from '@/lib/conflicts/types'

export const BUNDLE_FORMAT_VERSION = 1

export interface IntelBundleManifest {
  formatVersion: number
  /** ISO timestamp the bundle was produced on the connected machine. */
  generatedAt: string
  /** Free-text origin, e.g. 'DSTG-OSINT-01'. Provenance, not authentication. */
  producedBy: string
  incidentCount: number
  /** Checksum over the canonical incident payload. Corruption detection only. */
  checksum: string
  /** Earliest and latest incident in the payload. */
  coverageFrom: string | null
  coverageTo: string | null
  classification: string
}

export interface IntelBundle {
  manifest: IntelBundleManifest
  incidents: ConflictIncident[]
}

/**
 * Canonical serialisation for checksumming.
 *
 * Key order and whitespace must not change the checksum, otherwise a bundle
 * that survived transit intact would be rejected because a JSON library
 * reordered keys.
 */
export function canonicalise(incidents: readonly ConflictIncident[]): string {
  const rows = [...incidents]
    .map((i) => {
      const keys = Object.keys(i).sort()
      const obj: Record<string, unknown> = {}
      for (const k of keys) obj[k] = (i as unknown as Record<string, unknown>)[k]
      return JSON.stringify(obj)
    })
    .sort()
  return rows.join('\n')
}

/**
 * FNV-1a 64-bit, rendered hex.
 *
 * Deliberately dependency-free and deterministic across node and the browser.
 * Adequate for detecting corruption on removable media; explicitly not a
 * security primitive.
 */
export function checksum(input: string): string {
  let h = BigInt('0xcbf29ce484222325')
  const prime = BigInt('0x100000001b3')
  const mask = BigInt('0xffffffffffffffff')
  for (let i = 0; i < input.length; i++) {
    h ^= BigInt(input.charCodeAt(i))
    h = (h * prime) & mask
  }
  return h.toString(16).padStart(16, '0')
}

export function buildBundle(
  incidents: readonly ConflictIncident[],
  opts: { producedBy: string; generatedAt?: string; classification?: string },
): IntelBundle {
  const sorted = [...incidents].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  return {
    manifest: {
      formatVersion: BUNDLE_FORMAT_VERSION,
      generatedAt: opts.generatedAt ?? new Date().toISOString(),
      producedBy: opts.producedBy,
      incidentCount: sorted.length,
      checksum: checksum(canonicalise(sorted)),
      coverageFrom: sorted[0]?.occurred_at ?? null,
      coverageTo: sorted[sorted.length - 1]?.occurred_at ?? null,
      classification: opts.classification ?? 'UNCLASSIFIED',
    },
    incidents: sorted,
  }
}

export type BundleRejection =
  | 'malformed'
  | 'unsupported_version'
  | 'count_mismatch'
  | 'checksum_mismatch'
  | 'future_dated'

export interface BundleValidation {
  ok: boolean
  rejection: BundleRejection | null
  /** Operator-facing explanation. Never just a code. */
  message: string
}

/**
 * Validate a bundle before it is allowed anywhere near the database.
 *
 * A future-dated bundle is rejected rather than warned about: it means either a
 * clock problem on the producing machine or deliberate alteration, and both
 * make the age figure meaningless — which is the whole point of the format.
 */
export function validateBundle(input: unknown, now: Date = new Date()): BundleValidation {
  const b = input as IntelBundle | null
  if (!b || typeof b !== 'object' || !b.manifest || !Array.isArray(b.incidents)) {
    return { ok: false, rejection: 'malformed', message: 'Not a recognisable intel bundle.' }
  }
  const m = b.manifest
  if (m.formatVersion !== BUNDLE_FORMAT_VERSION) {
    return {
      ok: false,
      rejection: 'unsupported_version',
      message: `Bundle format v${m.formatVersion}; this instance reads v${BUNDLE_FORMAT_VERSION}.`,
    }
  }
  if (m.incidentCount !== b.incidents.length) {
    return {
      ok: false,
      rejection: 'count_mismatch',
      message: `Manifest declares ${m.incidentCount} incidents, payload carries ${b.incidents.length}.`,
    }
  }
  if (checksum(canonicalise(b.incidents)) !== m.checksum) {
    return {
      ok: false,
      rejection: 'checksum_mismatch',
      message: 'Checksum does not match — the bundle was corrupted or altered in transit.',
    }
  }
  const gen = Date.parse(m.generatedAt)
  if (!Number.isFinite(gen)) {
    return { ok: false, rejection: 'malformed', message: 'Manifest has no readable generation time.' }
  }
  // A minute of tolerance for ordinary clock drift between machines.
  if (gen > now.getTime() + 60_000) {
    return {
      ok: false,
      rejection: 'future_dated',
      message: 'Bundle is dated in the future — check the clock on the producing machine.',
    }
  }
  return { ok: true, rejection: null, message: `Valid bundle, ${b.incidents.length} incidents.` }
}

export type Freshness = 'current' | 'aging' | 'stale' | 'expired'

export interface IntelAge {
  ageDays: number
  freshness: Freshness
  /** Shown beside the timeline. States the age plainly, never implies live. */
  label: string
}

/** Thresholds in days. Tuned so an operator is warned well before data misleads. */
export const FRESHNESS_DAYS = { current: 3, aging: 10, stale: 30 }

export function intelAge(generatedAt: string, now: Date = new Date()): IntelAge {
  const gen = Date.parse(generatedAt)
  if (!Number.isFinite(gen)) {
    return { ageDays: Number.POSITIVE_INFINITY, freshness: 'expired', label: 'Intel age unknown' }
  }
  const ageDays = Math.max(0, Math.floor((now.getTime() - gen) / 86_400_000))
  const freshness: Freshness =
    ageDays <= FRESHNESS_DAYS.current
      ? 'current'
      : ageDays <= FRESHNESS_DAYS.aging
        ? 'aging'
        : ageDays <= FRESHNESS_DAYS.stale
          ? 'stale'
          : 'expired'

  const label =
    ageDays === 0
      ? 'Intel imported today'
      : `Intel ${ageDays} day${ageDays === 1 ? '' : 's'} old`
  return { ageDays, freshness, label }
}

/**
 * What an import would change, computed before anything is written.
 *
 * An operator on an air-gapped box cannot undo a bad import easily, so the
 * change is shown first.
 */
export interface BundleDiff {
  added: number
  unchanged: number
  addedIds: string[]
}

export function diffBundle(
  incoming: readonly ConflictIncident[],
  existingIds: ReadonlySet<string>,
): BundleDiff {
  const addedIds = incoming.filter((i) => !existingIds.has(i.id)).map((i) => i.id).sort()
  return {
    added: addedIds.length,
    unchanged: incoming.length - addedIds.length,
    addedIds,
  }
}
