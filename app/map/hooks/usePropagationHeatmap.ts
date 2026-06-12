'use client'

import { useEffect, useState } from 'react'
import type { HeatmapCell } from '@/lib/propagation/types'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'
import type { PlacedCuas } from '@/lib/map/types'

export interface HeatmapLayerState {
  cells: HeatmapCell[]
  loading: boolean
  error: string | null
  confidence: string | null
  gridSteps: number
}

const EMPTY: HeatmapLayerState = {
  cells: [],
  loading: false,
  error: null,
  confidence: null,
  gridSteps: 0,
}

function jamErpDbm(cuas: PlacedCuas): number {
  if (cuas.asset.defeat_methods.includes('RF_jamming')) return 40
  return 35
}

export function usePropagationHeatmap(
  enabled: boolean,
  jammer: PlacedCuas | null,
  receiverAltM: number,
): HeatmapLayerState {
  const [state, setState] = useState<HeatmapLayerState>(EMPTY)

  useEffect(() => {
    if (!enabled || !jammer || !isOperationsEditionClient()) {
      setState(EMPTY)
      return
    }

    const spanDeg = (jammer.asset.defeat_range_km / 111) * 0.85
    const bounds = {
      south: jammer.lat - spanDeg,
      north: jammer.lat + spanDeg,
      west: jammer.lon - spanDeg,
      east: jammer.lon + spanDeg,
    }

    setState((s) => ({ ...s, loading: true, error: null }))
    const controller = new AbortController()

    fetch('/api/v1/propagation/heatmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emitter: {
          position: {
            lat: jammer.lat,
            lon: jammer.lon,
            alt_m: jammer.terrainAMSL + 2,
          },
          freq_hz: 2.4e9,
          erp_dbm: jamErpDbm(jammer),
        },
        bounds,
        grid_steps: 12,
        receiver_alt_m: receiverAltM,
        environment: {
          urban_density: jammer.hasTerrainMasking ? 'suburban' : 'open',
          terrain_obstructed: jammer.hasTerrainMasking,
        },
      }),
      signal: controller.signal,
    })
      .then(async (r) => {
        if (r.status === 403) {
          return { error: 'Operations propagation required (403)' }
        }
        if (!r.ok) {
          return { error: `Heatmap ${r.status}` }
        }
        const json = await r.json()
        return { data: json.data as { cells: HeatmapCell[]; confidence: string; grid_steps: number } }
      })
      .then((result) => {
        if ('error' in result && result.error) {
          setState({ ...EMPTY, error: result.error })
          return
        }
        if ('data' in result && result.data) {
          setState({
            cells: result.data.cells,
            loading: false,
            error: null,
            confidence: result.data.confidence,
            gridSteps: result.data.grid_steps,
          })
        }
      })
      .catch(() => {
        setState({ ...EMPTY, error: 'Heatmap request failed' })
      })

    return () => controller.abort()
  }, [enabled, jammer, receiverAltM])

  return state
}
