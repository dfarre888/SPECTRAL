import { describe, expect, it } from 'vitest'
import {
  BUNDLE_FORMAT_VERSION,
  buildBundle,
  canonicalise,
  checksum,
  diffBundle,
  intelAge,
  validateBundle,
} from '@/lib/conflicts/intel-bundle'
import type { ConflictIncident } from '@/lib/conflicts/types'

const inc = (id: string, occurred = '2026-08-01T00:00:00.000Z'): ConflictIncident => ({
  id,
  conflict_name: 'Test',
  incident_title: `Incident ${id}`,
  incident_type: 'uas_strike' as ConflictIncident['incident_type'],
  occurred_at: occurred,
  lat: 0,
  lon: 0,
  summary: 'summary',
  source_ref: 'OSINT',
  platforms_involved: ['shahed-136'],
  confidence: 'assessed',
  classification: 'UNCLASSIFIED',
  created_at: occurred,
})

const NOW = new Date('2026-09-06T00:00:00.000Z')

describe('canonicalisation', () => {
  it('is stable under key reordering', () => {
    const a = inc('1')
    const reordered = Object.fromEntries(Object.entries(a).reverse()) as ConflictIncident
    expect(canonicalise([a])).toBe(canonicalise([reordered]))
  })

  it('is stable under incident ordering', () => {
    expect(canonicalise([inc('1'), inc('2')])).toBe(canonicalise([inc('2'), inc('1')]))
  })

  it('changes when content changes', () => {
    expect(canonicalise([inc('1')])).not.toBe(canonicalise([{ ...inc('1'), summary: 'other' }]))
  })
})

describe('checksum', () => {
  it('is deterministic', () => {
    expect(checksum('abc')).toBe(checksum('abc'))
  })
  it('differs for different input', () => {
    expect(checksum('abc')).not.toBe(checksum('abd'))
  })
  it('is fixed width hex', () => {
    expect(checksum('x')).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('bundle build', () => {
  it('records provenance, coverage and count', () => {
    const b = buildBundle([inc('2', '2026-08-05T00:00:00.000Z'), inc('1', '2026-08-01T00:00:00.000Z')], {
      producedBy: 'OSINT-01',
      generatedAt: NOW.toISOString(),
    })
    expect(b.manifest.formatVersion).toBe(BUNDLE_FORMAT_VERSION)
    expect(b.manifest.producedBy).toBe('OSINT-01')
    expect(b.manifest.incidentCount).toBe(2)
    expect(b.manifest.coverageFrom).toBe('2026-08-01T00:00:00.000Z')
    expect(b.manifest.coverageTo).toBe('2026-08-05T00:00:00.000Z')
  })

  it('handles an empty bundle', () => {
    const b = buildBundle([], { producedBy: 'x', generatedAt: NOW.toISOString() })
    expect(b.manifest.incidentCount).toBe(0)
    expect(b.manifest.coverageFrom).toBeNull()
  })
})

describe('validation', () => {
  const good = buildBundle([inc('1'), inc('2')], { producedBy: 'x', generatedAt: '2026-09-01T00:00:00.000Z' })

  it('accepts an intact bundle', () => {
    const v = validateBundle(good, NOW)
    expect(v.ok).toBe(true)
    expect(v.message).toContain('2 incidents')
  })

  it('rejects something that is not a bundle', () => {
    expect(validateBundle(null, NOW).rejection).toBe('malformed')
    expect(validateBundle({ nope: 1 }, NOW).rejection).toBe('malformed')
  })

  it('rejects an unsupported format version and says which', () => {
    const v = validateBundle({ ...good, manifest: { ...good.manifest, formatVersion: 99 } }, NOW)
    expect(v.rejection).toBe('unsupported_version')
    expect(v.message).toContain('v99')
  })

  it('rejects a payload that does not match its declared count', () => {
    const v = validateBundle({ ...good, incidents: [inc('1')] }, NOW)
    expect(v.rejection).toBe('count_mismatch')
  })

  it('rejects a bundle altered in transit', () => {
    const tampered = {
      ...good,
      incidents: [{ ...good.incidents[0], summary: 'changed' }, good.incidents[1]],
    }
    const v = validateBundle(tampered, NOW)
    expect(v.rejection).toBe('checksum_mismatch')
    expect(v.message).toContain('corrupted or altered')
  })

  it('rejects a future-dated bundle rather than warning', () => {
    const future = buildBundle([inc('1')], { producedBy: 'x', generatedAt: '2026-12-01T00:00:00.000Z' })
    const v = validateBundle(future, NOW)
    expect(v.rejection).toBe('future_dated')
    expect(v.message).toContain('clock')
  })

  it('tolerates a minute of clock drift', () => {
    const drifted = buildBundle([inc('1')], {
      producedBy: 'x',
      generatedAt: new Date(NOW.getTime() + 30_000).toISOString(),
    })
    expect(validateBundle(drifted, NOW).ok).toBe(true)
  })
})

describe('intel age', () => {
  it('reports fresh intel as current', () => {
    const a = intelAge('2026-09-05T00:00:00.000Z', NOW)
    expect(a.ageDays).toBe(1)
    expect(a.freshness).toBe('current')
    expect(a.label).toBe('Intel 1 day old')
  })

  it('says today rather than 0 days', () => {
    expect(intelAge(NOW.toISOString(), NOW).label).toBe('Intel imported today')
  })

  it('escalates through aging, stale and expired', () => {
    expect(intelAge('2026-08-30T00:00:00.000Z', NOW).freshness).toBe('aging')
    expect(intelAge('2026-08-20T00:00:00.000Z', NOW).freshness).toBe('stale')
    expect(intelAge('2026-06-01T00:00:00.000Z', NOW).freshness).toBe('expired')
  })

  it('never implies the feed is live', () => {
    for (const d of ['2026-09-06', '2026-08-01', '2026-01-01']) {
      expect(intelAge(`${d}T00:00:00.000Z`, NOW).label.toLowerCase()).not.toContain('live')
    }
  })

  it('treats an unreadable date as expired rather than fresh', () => {
    const a = intelAge('not-a-date', NOW)
    expect(a.freshness).toBe('expired')
    expect(a.label).toContain('unknown')
  })
})

describe('import preview', () => {
  it('reports what would be added before anything is written', () => {
    const d = diffBundle([inc('1'), inc('2'), inc('3')], new Set(['1']))
    expect(d.added).toBe(2)
    expect(d.unchanged).toBe(1)
    expect(d.addedIds).toEqual(['2', '3'])
  })

  it('reports a no-op import', () => {
    const d = diffBundle([inc('1')], new Set(['1']))
    expect(d.added).toBe(0)
    expect(d.addedIds).toEqual([])
  })
})
