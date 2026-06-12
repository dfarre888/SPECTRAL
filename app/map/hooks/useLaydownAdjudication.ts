'use client'

import { useEffect, useState } from 'react'
import {
  analyzeLaydown,
  mergeAdjudicationIntoLaydown,
  type LaydownSpectralAnalysis,
} from '@/lib/map/laydown-analysis'
import type { AdjudicationSource } from '@/components/operations/AdjudicationSourceBanner'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import type { OverlapVolume, PlacedCuas, PlacedUas } from '@/lib/map/types'

export interface LaydownAdjudicationState {
  analysis: LaydownSpectralAnalysis
  source: AdjudicationSource
  fallbackReason?: string
}

export function useLaydownAdjudication(
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  overlaps: OverlapVolume[],
  enabled: boolean,
): LaydownAdjudicationState {
  const [state, setState] = useState<LaydownAdjudicationState>(() => ({
    analysis: analyzeLaydown(placedUas, placedCuas, overlaps),
    source: 'client',
  }))

  useEffect(() => {
    const base = analyzeLaydown(placedUas, placedCuas, overlaps)

    if (!enabled || (placedUas.length === 0 && placedCuas.length === 0)) {
      setState({ analysis: base, source: 'client' })
      return
    }

    if (!isOperationsEditionClient()) {
      setState({ analysis: base, source: 'client' })
      return
    }

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

    if (pairs.length === 0) {
      setState({ analysis: base, source: 'client' })
      return
    }

    setState({ analysis: base, source: 'loading' })
    const controller = new AbortController()

    fetch('/api/v1/adjudication/laydown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pairs }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (r.status === 403) {
          const json = await r.json().catch(() => ({}))
          return {
            fallback: true as const,
            reason:
              json.fallback === 'client_band_overlap'
                ? 'Operations API unavailable — Training band overlap'
                : 'Forbidden — using client analysis',
          }
        }
        if (!r.ok) {
          return {
            fallback: true as const,
            reason: `Adjudication ${r.status} — client fallback`,
          }
        }
        const json = await r.json()
        return { data: json.data as Parameters<typeof mergeAdjudicationIntoLaydown>[1] }
      })
      .then((result) => {
        if ('fallback' in result && result.fallback) {
          setState({
            analysis: base,
            source: 'fallback',
            fallbackReason: result.reason,
          })
          return
        }
        if ('data' in result && result.data) {
          setState({
            analysis: mergeAdjudicationIntoLaydown(base, result.data),
            source: 'server',
          })
        }
      })
      .catch(() => {
        setState({ analysis: base, source: 'fallback', fallbackReason: 'Network error — client fallback' })
      })

    return () => controller.abort()
  }, [placedUas, placedCuas, overlaps, enabled])

  return state
}
