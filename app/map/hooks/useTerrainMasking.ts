'use client'

import { useEffect, useRef, useState } from 'react'
import { computeTerrainMasking } from '@/lib/map/terrain-masking'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type { MaskingPolygon } from '@/lib/map/cesium-sync'
import type { PlacedCuas } from '@/lib/map/types'

export function useTerrainMasking(
  placedCuas: PlacedCuas[],
  getCesium: () => CesiumContext | null,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>
) {
  const [maskingPolygons, setMaskingPolygons] = useState<MaskingPolygon[]>([])
  const runningRef = useRef(0)

  const cuasKey = placedCuas
    .map(
      (c) =>
        `${c.instanceId}:${c.lon}:${c.lat}:${c.terrainAMSL}:${c.asset.defeat_range_m}`,
    )
    .join('|')

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
        const { polygon, hasMasking } = await computeTerrainMasking(
          ctx.Cesium,
          ctx.terrainProvider,
          cuas.lon,
          cuas.lat,
          cuas.terrainAMSL,
          cuas.asset.defeat_range_m
        )
        results.push({
          cuasInstanceId: cuas.instanceId,
          positions: polygon,
          hasMasking,
        })
        updates.push({ id: cuas.instanceId, hasMasking })
      }

      if (runId !== runningRef.current) return

      setMaskingPolygons(results)
      setPlacedCuas((prev) =>
        prev.map((c) => {
          const u = updates.find((x) => x.id === c.instanceId)
          if (!u || u.hasMasking === c.hasTerrainMasking) return c
          return { ...c, hasTerrainMasking: u.hasMasking }
        })
      )
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuasKey, getCesium, setPlacedCuas])

  return maskingPolygons
}
