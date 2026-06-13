'use client'

import { useEffect, useState } from 'react'
import { cuasAssetToSpectrumBlue } from '@/lib/map/spectrum-bridge'
import type { HeatmapCell } from '@/lib/propagation/types'
import { resolveJamTransmit } from '@/lib/spectrum/erp-resolve'
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
    const blue = cuasAssetToSpectrumBlue(jammer.asset)
    const jam = resolveJamTransmit(blue, null)

    const payload = {
      emitter: {
        position: {
          lat: jammer.lat,
          lon: jammer.lon,
          alt_m: jammer.terrainAMSL + 2,
        },
        freq_hz: jam.freq_hz,
        erp_dbm: jam.erp_dbm,
      },
      bounds,
      grid_steps: 20,
      receiver_alt_m: receiverAltM,
      environment: {
        urban_density: jammer.hasTerrainMasking ? 'suburban' : 'open',
        terrain_obstructed: jammer.hasTerrainMasking,
      },
    }

    const useAsyncJob = payload.grid_steps > 16

    async function pollJob(jobId: string) {
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 400))
        const pr = await fetch(`/api/v1/propagation/heatmap/jobs/${jobId}`, {
          signal: controller.signal,
        })
        if (!pr.ok) continue
        const pj = await pr.json()
        if (pj.status === 'complete' && pj.data) {
          return pj.data as { cells: HeatmapCell[]; confidence: string; grid_steps: number }
        }
        if (pj.status === 'failed') throw new Error(pj.error ?? 'Job failed')
      }
      throw new Error('Heatmap job timeout')
    }

    ;(async () => {
      try {
        if (useAsyncJob) {
          const jr = await fetch('/api/v1/propagation/heatmap/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
          })
          if (jr.status === 403) {
            setState({ ...EMPTY, error: 'Operations propagation required (403)' })
            return
          }
          if (!jr.ok) {
            setState({ ...EMPTY, error: `Heatmap job ${jr.status}` })
            return
          }
          const { jobId } = await jr.json()
          const data = await pollJob(jobId)
          setState({
            cells: data.cells,
            loading: false,
            error: null,
            confidence: data.confidence,
            gridSteps: data.grid_steps,
          })
          return
        }

        const r = await fetch('/api/v1/propagation/heatmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        if (r.status === 403) {
          setState({ ...EMPTY, error: 'Operations propagation required (403)' })
          return
        }
        if (!r.ok) {
          setState({ ...EMPTY, error: `Heatmap ${r.status}` })
          return
        }
        const json = await r.json()
        const data = json.data as { cells: HeatmapCell[]; confidence: string; grid_steps: number }
        setState({
          cells: data.cells,
          loading: false,
          error: null,
          confidence: data.confidence,
          gridSteps: data.grid_steps,
        })
      } catch {
        if (!controller.signal.aborted) {
          setState({ ...EMPTY, error: 'Heatmap request failed' })
        }
      }
    })()

    return () => controller.abort()
  }, [enabled, jammer, receiverAltM])

  return state
}
