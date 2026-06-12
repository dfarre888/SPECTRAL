'use client'

import { useEffect, useRef, useState } from 'react'
import { computeTerrainMasking } from '@/lib/map/terrain-masking'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type { MaskingPolygon } from '@/lib/map/cesium-sync'
import { placementNeedsTerrainRefresh } from '@/lib/map/terrain'
import type { PlacedCuas } from '@/lib/map/types'

export function useTerrainMasking(
  placedCuas: PlacedCuas[],
  getCesium: () => CesiumContext | null,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>,
  terrainEpoch = 0,
) {
  const [maskingPolygons, setMaskingPolygons] = useState<MaskingPolygon[]>([])
  const runningRef = useRef(0)

  const cuasKey = `${placedCuas
    .map(
      (c) =>
        `${c.instanceId}:${c.lon}:${c.lat}:${c.terrainAMSL}:${c.asset.defeat_range_m}`,
    )
    .join('|')}|epoch:${terrainEpoch}`

  useEffect(() => {
    if (placedCuas.length === 0) {
      setMaskingPolygons([])
      return
    }

    const ctx = getCesium()
    if (!ctx) return

    const runId = ++runningRef.current

    ;(async () => {
      const results: MaskingPolygon[] = []
      const updates: { id: string; hasMasking: boolean }[] = []

      for (const cuas of placedCuas) {
        if (placementNeedsTerrainRefresh(cuas.terrainAMSL)) continue

        const los = await computeTerrainMasking(
          ctx.Cesium,
          ctx.terrainProvider,
          cuas.lon,
          cuas.lat,
          cuas.terrainAMSL,
          cuas.asset.defeat_range_m,
          ctx.viewer,
        )

        results.push({
          cuasInstanceId: cuas.instanceId,
          hasMasking: los.hasMasking,
          lon: cuas.lon,
          lat: cuas.lat,
          emitterAltM: los.emitterAltM,
          maxRange_m: cuas.asset.defeat_range_m,
          rays: los.rays,
          footprintCells: los.footprintCells,
        })
        updates.push({ id: cuas.instanceId, hasMasking: los.hasMasking })
      }

      if (runId !== runningRef.current) return

      setMaskingPolygons(results)
      setPlacedCuas((prev) =>
        prev.map((c) => {
          const u = updates.find((x) => x.id === c.instanceId)
          if (!u || u.hasMasking === c.hasTerrainMasking) return c
          return { ...c, hasTerrainMasking: u.hasMasking }
        }),
      )
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuasKey, getCesium, setPlacedCuas])

  return maskingPolygons
}
