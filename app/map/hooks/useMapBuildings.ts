'use client'

import { useEffect, useState } from 'react'
import type { BuildingFootprint } from '@/lib/buildings/types'
import { isOperationsEditionClient } from '@/lib/operations/edition-client'

export interface MapBuildingsState {
  buildings: BuildingFootprint[]
  loading: boolean
}

const EMPTY: MapBuildingsState = { buildings: [], loading: false }

export function useMapBuildings(
  bounds: { south: number; west: number; north: number; east: number } | null,
  enabled = true,
): MapBuildingsState {
  const [state, setState] = useState<MapBuildingsState>(EMPTY)

  const key = bounds
    ? `${bounds.south.toFixed(4)}:${bounds.west.toFixed(4)}:${bounds.north.toFixed(4)}:${bounds.east.toFixed(4)}`
    : ''

  useEffect(() => {
    if (!enabled || !bounds || !isOperationsEditionClient()) {
      setState(EMPTY)
      return
    }

    setState((s) => ({ ...s, loading: true }))
    const controller = new AbortController()
    const q = new URLSearchParams({
      south: String(bounds.south),
      west: String(bounds.west),
      north: String(bounds.north),
      east: String(bounds.east),
    })

    fetch(`/api/v1/buildings/query?${q}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) return { buildings: [] as BuildingFootprint[] }
        const json = await r.json()
        return { buildings: (json.data ?? []) as BuildingFootprint[] }
      })
      .then(({ buildings }) => {
        setState({ buildings, loading: false })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState(EMPTY)
      })

    return () => controller.abort()
  }, [key, enabled])

  return state
}
