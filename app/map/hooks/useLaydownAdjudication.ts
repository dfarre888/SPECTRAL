'use client'

import { useEffect, useState } from 'react'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import {
  analyzeLaydown,
  mergeAdjudicationIntoLaydown,
  type LaydownSpectralAnalysis,
} from '@/lib/map/laydown-analysis'
import { isPairTerrainMasked } from '@/lib/map/pair-terrain'
import { samplePairDiffractionEdges } from '@/lib/map/pair-terrain-sample'
import type { MaskingPolygon } from '@/lib/map/cesium-sync'
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
  maskingPolygons: MaskingPolygon[] = [],
  getCesium: () => CesiumContext | null = () => null,
): LaydownAdjudicationState {
  const [state, setState] = useState<LaydownAdjudicationState>(() => ({
    analysis: analyzeLaydown(placedUas, placedCuas, overlaps),
    source: 'client',
  }))

  const maskKey = maskingPolygons
    .map((m) => `${m.cuasInstanceId}:${m.rays?.length ?? 0}`)
    .join('|')

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
    const maskByCuas = new Map(
      maskingPolygons.map((m) => [m.cuasInstanceId, m.rays]),
    )

    const controller = new AbortController()
    setState({ analysis: base, source: 'loading' })

    ;(async () => {
      const ctx = getCesium()
      const pairs = []

      for (const u of placedUas) {
        for (const c of placedCuas) {
          const key = `${u.instanceId}:${c.instanceId}`
          const vol = overlapMap.get(key)
          const rays = maskByCuas.get(c.instanceId)
          const terrain = isPairTerrainMasked(c.lon, c.lat, u.lon, u.lat, rays)

          let diffraction_edges: Awaited<ReturnType<typeof samplePairDiffractionEdges>> = []
          if (ctx && vol) {
            try {
              diffraction_edges = await samplePairDiffractionEdges(
                ctx.Cesium,
                ctx.terrainProvider,
                c.lon,
                c.lat,
                c.terrainAMSL + 2,
                u.lon,
                u.lat,
                u.discAltitude_m,
                ctx.viewer,
              )
            } catch {
              diffraction_edges = []
            }
          }

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
            terrainMasked: terrain.masked,
            diffraction_edges: diffraction_edges.length > 0 ? diffraction_edges : undefined,
            tenantId: 'client',
          })
        }
      }

      if (pairs.length === 0) {
        setState({ analysis: base, source: 'client' })
        return
      }

      try {
        const r = await fetch('/api/v1/adjudication/laydown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairs }),
          signal: controller.signal,
        })

        if (r.status === 403) {
          const json = await r.json().catch(() => ({}))
          setState({
            analysis: base,
            source: 'fallback',
            fallbackReason:
              json.fallback === 'client_band_overlap'
                ? 'Operations API unavailable — Training band overlap'
                : 'Forbidden — using client analysis',
          })
          return
        }
        if (!r.ok) {
          setState({
            analysis: base,
            source: 'fallback',
            fallbackReason: `Adjudication ${r.status} — client fallback`,
          })
          return
        }
        const json = await r.json()
        setState({
          analysis: mergeAdjudicationIntoLaydown(base, json.data),
          source: 'server',
        })
      } catch {
        if (!controller.signal.aborted) {
          setState({
            analysis: base,
            source: 'fallback',
            fallbackReason: 'Network error — client fallback',
          })
        }
      }
    })()

    return () => controller.abort()
  }, [placedUas, placedCuas, overlaps, enabled, maskKey, getCesium])

  return state
}
