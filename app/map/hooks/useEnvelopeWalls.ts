'use client'

import { useEffect, useRef } from 'react'
import {
  ENVELOPE_WALL_SEGMENTS,
  envelopePerimeterPoints,
  uniformWallTerrain,
} from '@/lib/map/envelope-geometry'
import { sampleTerrainBatch } from '@/lib/map/terrain'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type { PlacedUas } from '@/lib/map/types'

function wallTerrainEqual(a: number[] | undefined, b: number[]): boolean {
  if (!a || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) >= 0.5) return false
  }
  return true
}

/** Terrain-draped perimeter walls for UAS combat discs only (not C-UAS defeat spheres). */
export function useEnvelopeWalls(
  nilWind: boolean,
  placedUas: PlacedUas[],
  getCesium: () => CesiumContext | null,
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
) {
  const uasRunRef = useRef(0)

  const uasWallKey = placedUas
    .map((u) => {
      const radius_m = nilWind ? u.lateralRadius_m : u.effectiveRange_km * 1000
      return `${u.instanceId}:${u.lon}:${u.lat}:${u.terrainAMSL}:${u.discAltitude_m}:${radius_m}`
    })
    .join('|')

  useEffect(() => {
    if (placedUas.length === 0) return

    const ctx = getCesium()
    if (!ctx) return

    const runId = ++uasRunRef.current

    ;(async () => {
      const updates: { instanceId: string; wallTerrain_m: number[] }[] = []

      for (const uas of placedUas) {
        const radius_m = Math.max(
          100,
          nilWind ? uas.lateralRadius_m : uas.effectiveRange_km * 1000,
        )
        const points = envelopePerimeterPoints(uas.lon, uas.lat, radius_m)
        let heights: number[]
        try {
          heights = await sampleTerrainBatch(
            ctx.Cesium,
            ctx.terrainProvider,
            points,
            ctx.viewer,
          )
        } catch {
          heights = uniformWallTerrain(ENVELOPE_WALL_SEGMENTS, uas.terrainAMSL)
        }
        updates.push({ instanceId: uas.instanceId, wallTerrain_m: heights })
      }

      if (runId !== uasRunRef.current) return

      setPlacedUas((prev) => {
        let changed = false
        const next = prev.map((u) => {
          const hit = updates.find((x) => x.instanceId === u.instanceId)
          if (!hit || wallTerrainEqual(u.wallTerrain_m, hit.wallTerrain_m)) return u
          changed = true
          return { ...u, wallTerrain_m: hit.wallTerrain_m }
        })
        return changed ? next : prev
      })
    })()
  }, [uasWallKey, nilWind, getCesium, setPlacedUas])
}
