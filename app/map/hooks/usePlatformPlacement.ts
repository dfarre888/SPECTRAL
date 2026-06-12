'use client'

import { useCallback } from 'react'
import { computeUasEnvelope } from '@/lib/map/format'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import type {
  MapCuasAsset,
  MapUasAsset,
  PlacedCuas,
  PlacedUas,
  PlacementMode,
} from '@/lib/map/types'

export interface CesiumContext {
  Cesium: CesiumModule
  terrainProvider: CesiumTerrainProvider
  viewer: CesiumViewer
}

function newInstanceId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function usePlatformPlacement(
  placementMode: PlacementMode,
  setPlacementMode: (mode: PlacementMode) => void,
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
  setPlacedCuas: React.Dispatch<React.SetStateAction<PlacedCuas[]>>,
  getCesium: () => CesiumContext | null
) {
  const placeAt = useCallback(
    async (lon: number, lat: number) => {
      if (!placementMode.active) return
      const ctx = getCesium()
      if (!ctx) return

      const terrainAMSL = await sampleTerrainAMSL(
        ctx.Cesium,
        ctx.terrainProvider,
        lon,
        lat,
        ctx.viewer,
      )

      if (placementMode.kind === 'uas') {
        const asset = placementMode.asset as MapUasAsset
        const env = computeUasEnvelope(asset, terrainAMSL)
        const placed: PlacedUas = {
          instanceId: newInstanceId('uas'),
          asset,
          lon,
          lat,
          terrainAMSL,
          discAltitude_m: env.discAltitude_m,
          lateralRadius_m: env.lateralRadius_m,
          ceilingAMSL_m: env.ceilingAMSL_m,
          annotationTime_min: env.annotationTime_min,
          effectiveRange_km: env.operationalRange_km,
          infoPanelClosed: true,
        }
        setPlacedUas((prev) => [...prev, placed])
        setPlacementMode({ active: false })
        return
      }

      if (placementMode.kind === 'cuas') {
        const asset = placementMode.asset as MapCuasAsset
        const placed: PlacedCuas = {
          instanceId: newInstanceId('cuas'),
          asset,
          lon,
          lat,
          terrainAMSL,
          hasTerrainMasking: false,
        }
        setPlacedCuas((prev) => [...prev, placed])
        setPlacementMode({ active: false })
      }
    },
    [placementMode, getCesium, setPlacedUas, setPlacedCuas, setPlacementMode]
  )

  const startUasPlacement = useCallback(
    (asset: MapUasAsset) => {
      setPlacementMode({ active: true, kind: 'uas', asset })
    },
    [setPlacementMode]
  )

  const startCuasPlacement = useCallback(
    (asset: MapCuasAsset) => {
      setPlacementMode({ active: true, kind: 'cuas', asset })
    },
    [setPlacementMode]
  )

  const cancelPlacement = useCallback(() => {
    setPlacementMode({ active: false })
  }, [setPlacementMode])

  return { placeAt, startUasPlacement, startCuasPlacement, cancelPlacement }
}
