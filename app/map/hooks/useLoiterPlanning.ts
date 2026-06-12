'use client'

import { useCallback } from 'react'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type { PlacedUas, PlacementMode } from '@/lib/map/types'

function distanceKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useLoiterPlanning(
  placementMode: PlacementMode,
  setPlacementMode: (mode: PlacementMode) => void,
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
  getCesium: () => CesiumContext | null
) {
  const startLoiterMode = useCallback(
    (uas: PlacedUas) => {
      setPlacementMode({
        active: true,
        kind: 'loiter',
        uasInstanceId: uas.instanceId,
        asset: uas.asset,
      })
    },
    [setPlacementMode]
  )

  const placeLoiterWaypoint = useCallback(
    async (lon: number, lat: number) => {
      if (!placementMode.active || placementMode.kind !== 'loiter') return
      const ctx = getCesium()
      if (!ctx) return

      const terrainAMSL = await sampleTerrainAMSL(
        ctx.Cesium,
        ctx.terrainProvider,
        lon,
        lat,
        ctx.viewer,
      )

      const uasInstanceId = placementMode.uasInstanceId
      const asset = placementMode.asset

      setPlacedUas((prev) =>
        prev.map((u) => {
          if (u.instanceId !== uasInstanceId) return u
          const distKm = distanceKm(u.lon, u.lat, lon, lat)
          const speed = Math.max(asset.max_speed_kmh, 1)
          const transitTime_min = (distKm / speed) * 60
          const returnTime_min = transitTime_min
          const totalTransit = transitTime_min + returnTime_min
          const timeOnStation_min = Math.max(
            0,
            asset.endurance_min - totalTransit
          )
          const exceedsEndurance = timeOnStation_min <= 0

          return {
            ...u,
            loiter: {
              lon,
              lat,
              terrainAMSL,
              transitTime_min,
              returnTime_min,
              timeOnStation_min: exceedsEndurance ? 0 : timeOnStation_min,
              exceedsEndurance,
            },
            infoPanelClosed: true,
          }
        })
      )
      setPlacementMode({ active: false })
    },
    [placementMode, getCesium, setPlacedUas, setPlacementMode]
  )

  const clearLoiter = useCallback(
    (uasInstanceId: string) => {
      setPlacedUas((prev) =>
        prev.map((u) =>
          u.instanceId === uasInstanceId ? { ...u, loiter: undefined } : u
        )
      )
    },
    [setPlacedUas]
  )

  return { startLoiterMode, placeLoiterWaypoint, clearLoiter }
}
