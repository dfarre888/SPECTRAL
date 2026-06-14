'use client'

import { useCallback } from 'react'
import { computeUasEnvelope } from '@/lib/map/format'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import type { CesiumModule, CesiumTerrainProvider, CesiumViewer } from '@/lib/map/cesium-types'
import { offsetApprox1Km } from '@/lib/propagation/geo'
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

export function clonePlacedUasAt(
  source: PlacedUas,
  lon: number,
  lat: number,
  terrainAMSL: number,
): PlacedUas {
  const env = computeUasEnvelope(source.asset, terrainAMSL)
  return {
    instanceId: newInstanceId('uas'),
    asset: source.asset,
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
}

export function clonePlacedCuasAt(
  source: PlacedCuas,
  lon: number,
  lat: number,
  terrainAMSL: number,
): PlacedCuas {
  return {
    instanceId: newInstanceId('cuas'),
    asset: source.asset,
    lon,
    lat,
    terrainAMSL,
    hasTerrainMasking: false,
  }
}

export function usePlatformPlacement(
  placementMode: PlacementMode,
  setPlacementMode: (mode: PlacementMode) => void,
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
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

  const duplicateAdjacent = useCallback(
    async (kind: 'uas' | 'cuas', instanceId: string) => {
      const ctx = getCesium()
      if (!ctx) return

      if (kind === 'uas') {
        const source = placedUas.find((u) => u.instanceId === instanceId)
        if (!source) return
        const { lat, lon } = offsetApprox1Km(source.lat, source.lon)
        const terrainAMSL = await sampleTerrainAMSL(
          ctx.Cesium,
          ctx.terrainProvider,
          lon,
          lat,
          ctx.viewer,
        )
        setPlacedUas((prev) => [...prev, clonePlacedUasAt(source, lon, lat, terrainAMSL)])
        return
      }

      const source = placedCuas.find((c) => c.instanceId === instanceId)
      if (!source) return
      const { lat, lon } = offsetApprox1Km(source.lat, source.lon)
      const terrainAMSL = await sampleTerrainAMSL(
        ctx.Cesium,
        ctx.terrainProvider,
        lon,
        lat,
        ctx.viewer,
      )
      setPlacedCuas((prev) => [...prev, clonePlacedCuasAt(source, lon, lat, terrainAMSL)])
    },
    [getCesium, placedUas, placedCuas, setPlacedUas, setPlacedCuas],
  )

  return { placeAt, startUasPlacement, startCuasPlacement, cancelPlacement, duplicateAdjacent }
}
