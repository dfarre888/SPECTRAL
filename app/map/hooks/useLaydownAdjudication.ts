'use client'

import { useEffect, useState } from 'react'
import {
  analyzeLaydown,
  mergeAdjudicationIntoLaydown,
  type LaydownSpectralAnalysis,
} from '@/lib/map/laydown-analysis'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

export function useLaydownAdjudication(
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  overlaps: OverlapVolume[],
  enabled: boolean,
): LaydownSpectralAnalysis {
  const [merged, setMerged] = useState<LaydownSpectralAnalysis>(() =>
    analyzeLaydown(placedUas, placedCuas, overlaps),
  )

  useEffect(() => {
    const base = analyzeLaydown(placedUas, placedCuas, overlaps)
    setMerged(base)

    // Training edition: client-side band overlap only — never call Operations adjudication API.
    if (!isOperationsEditionClient()) return
    if (!enabled || (placedUas.length === 0 && placedCuas.length === 0)) return

    const overlapMap = new Map(
      overlaps.map((o) => [`${o.uasInstanceId}:${o.cuasInstanceId}`, o]),
    )

    const pairs = []
    for (const u of placedUas) {
      for (const c of placedCuas) {
        const key = `${u.instanceId}:${c.instanceId}`
        const vol = overlapMap.get(key)
        pairs.push({
          uas: {
            instanceId: u.instanceId,
            asset: u.asset,
            lat: u.lat,
            lon: u.lon,
            discAltitude_m: u.discAltitude_m,
            terrainAMSL: u.terrainAMSL,
          },
          cuas: {
            instanceId: c.instanceId,
            asset: c.asset,
            lat: c.lat,
            lon: c.lon,
            terrainAMSL: c.terrainAMSL,
          },
          defeatMatrixPk: vol?.effectiveness_pct ?? null,
          inDefeatRange: Boolean(vol),
          terrainMasked: c.hasTerrainMasking,
          tenantId: 'client',
        })
      }
    }

    if (pairs.length === 0) return

    const controller = new AbortController()

    fetch('/api/v1/adjudication/laydown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          // 401/403/503 — stay on client-side base analysis (training fallback)
          return null
        }
        return r.json()
      })
      .then((json) => {
        if (json?.data) {
          setMerged(mergeAdjudicationIntoLaydown(base, json.data))
        }
      })
      .catch(() => {
        // Abort or network error — base analysis already set
      })

    return () => controller.abort()
  }, [placedUas, placedCuas, overlaps, enabled])

  return merged
}
