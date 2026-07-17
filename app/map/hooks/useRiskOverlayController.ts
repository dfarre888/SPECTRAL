'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import { useRiskOverlayDrag } from '@/app/map/hooks/useRiskOverlayDrag'
import {
  addBlastOverlay,
  addJammingOverlay,
  moveRiskOverlay,
  removeRiskOverlay,
  updateRiskOverlayOpacity,
  type RiskOverlayEntities,
} from '@/lib/map/risk-overlay'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import type { PlacementMode } from '@/lib/map/types'
import { JAMMER_DB, WARHEAD_DB, type BlastRadii, type JammingRadii } from '@/lib/risk'

export type RiskMode = 'blast' | 'jamming' | 'none'

export interface RiskOverlaySyncContext {
  cesiumCtxRef: React.RefObject<CesiumContext | null>
  riskOverlayRef: React.MutableRefObject<RiskOverlayEntities | null>
  riskOverlayGenRef: React.MutableRefObject<number>
  riskLonRef: React.MutableRefObject<number | null>
  riskLatRef: React.MutableRefObject<number | null>
  riskRingShadeRef: React.MutableRefObject<number>
}

export interface UseRiskOverlayControllerOptions {
  cesiumCtxRef: React.RefObject<CesiumContext | null>
  cesiumReady: boolean
  cesiumViewerRef: React.RefObject<CesiumViewer | null>
  cesiumModuleRef: React.RefObject<CesiumModule | null>
  placementModeRef: React.MutableRefObject<PlacementMode>
  cursorLon: number
  cursorLat: number
}

/** Shared sync implementation — exported for unit tests. */
export async function syncRiskOverlayImpl(
  ctx: RiskOverlaySyncContext,
  riskMode: RiskMode,
  selectedWarhead: BlastRadii | null,
  selectedJammer: JammingRadii | null,
): Promise<void> {
  const cesium = ctx.cesiumCtxRef.current
  const lon = ctx.riskLonRef.current
  const lat = ctx.riskLatRef.current
  if (!cesium || riskMode === 'none' || lon === null || lat === null) return
  const { viewer } = cesium

  const gen = ++ctx.riskOverlayGenRef.current

  if (ctx.riskOverlayRef.current) {
    removeRiskOverlay(viewer, ctx.riskOverlayRef.current)
    ctx.riskOverlayRef.current = null
  }

  if (riskMode === 'blast' && selectedWarhead) {
    const overlay = await addBlastOverlay(
      viewer,
      lon,
      lat,
      {
        lethal_m: selectedWarhead.lethal_m,
        injury_m: selectedWarhead.injury_m,
        structural_m: selectedWarhead.structural_m,
        hazard_m: selectedWarhead.hazard_m,
      },
      selectedWarhead.weapon_name,
    )
    if (ctx.riskOverlayGenRef.current !== gen) {
      removeRiskOverlay(viewer, overlay)
      return
    }
    ctx.riskOverlayRef.current = overlay
  } else if (riskMode === 'jamming' && selectedJammer) {
    const overlay = await addJammingOverlay(
      viewer,
      lon,
      lat,
      selectedJammer.gps_l1_radius_m,
      selectedJammer.rc_link_radius_m,
      selectedJammer.max_radius_m,
      selectedJammer.jammer_name,
    )
    if (ctx.riskOverlayGenRef.current !== gen) {
      removeRiskOverlay(viewer, overlay)
      return
    }
    ctx.riskOverlayRef.current = overlay
  }

  if (ctx.riskOverlayRef.current) {
    await updateRiskOverlayOpacity(viewer, ctx.riskOverlayRef.current, ctx.riskRingShadeRef.current)
  }
}

export function useRiskOverlayController({
  cesiumCtxRef,
  cesiumReady,
  cesiumViewerRef,
  cesiumModuleRef,
  placementModeRef,
  cursorLon,
  cursorLat,
}: UseRiskOverlayControllerOptions) {
  const [riskMode, setRiskMode] = useState<RiskMode>('none')
  const [riskLon, setRiskLon] = useState<number | null>(null)
  const [riskLat, setRiskLat] = useState<number | null>(null)
  const [selectedWarhead, setSelectedWarhead] = useState<BlastRadii | null>(WARHEAD_DB[0] ?? null)
  const [selectedJammer, setSelectedJammer] = useState<JammingRadii | null>(JAMMER_DB[0] ?? null)
  const [riskRingShade, setRiskRingShade] = useState(55)

  const riskRingShadeRef = useRef(55)
  const riskOverlayRef = useRef<RiskOverlayEntities | null>(null)
  const riskOverlayGenRef = useRef(0)
  const riskLonRef = useRef<number | null>(null)
  const riskLatRef = useRef<number | null>(null)
  const syncLockRef = useRef(Promise.resolve())

  useEffect(() => {
    riskRingShadeRef.current = riskRingShade
  }, [riskRingShade])

  useEffect(() => {
    riskLonRef.current = riskLon
  }, [riskLon])

  useEffect(() => {
    riskLatRef.current = riskLat
  }, [riskLat])

  const updateRiskPosition = useCallback((lon: number, lat: number) => {
    setRiskLon(lon)
    setRiskLat(lat)
    riskLonRef.current = lon
    riskLatRef.current = lat
    const ctx = cesiumCtxRef.current
    if (ctx && riskOverlayRef.current) {
      void moveRiskOverlay(ctx.viewer, riskOverlayRef.current, lon, lat)
    }
  }, [cesiumCtxRef])

  const syncRiskOverlay = useCallback(async () => {
    const task = syncLockRef.current.then(() =>
      syncRiskOverlayImpl(
        {
          cesiumCtxRef,
          riskOverlayRef,
          riskOverlayGenRef,
          riskLonRef,
          riskLatRef,
          riskRingShadeRef,
        },
        riskMode,
        selectedWarhead,
        selectedJammer,
      ),
    )
    syncLockRef.current = task.catch(() => {})
    await task
  }, [cesiumCtxRef, riskMode, selectedWarhead, selectedJammer])

  useEffect(() => {
    if (!cesiumReady) return
    void syncRiskOverlay()
  }, [cesiumReady, syncRiskOverlay])

  useEffect(() => {
    const ctx = cesiumCtxRef.current
    if (!ctx || !riskOverlayRef.current) return
    void updateRiskOverlayOpacity(ctx.viewer, riskOverlayRef.current, riskRingShade)
  }, [riskRingShade, cesiumReady, cesiumCtxRef])

  const handleRiskOverlayMove = useCallback(
    (lon: number, lat: number) => {
      updateRiskPosition(lon, lat)
    },
    [updateRiskPosition],
  )

  useRiskOverlayDrag(
    riskMode !== 'none',
    cesiumReady,
    cesiumViewerRef,
    cesiumModuleRef,
    placementModeRef,
    handleRiskOverlayMove,
  )

  const flushRiskPositionFromCursor = useCallback(() => {
    const lon = riskLonRef.current ?? cursorLon
    const lat = riskLatRef.current ?? cursorLat
    riskLonRef.current = lon
    riskLatRef.current = lat
    setRiskLon(lon)
    setRiskLat(lat)
  }, [cursorLon, cursorLat])

  const activateBlastRisk = useCallback(() => {
    setRiskMode('blast')
    flushRiskPositionFromCursor()
  }, [flushRiskPositionFromCursor])

  const activateJammingRisk = useCallback(() => {
    setRiskMode('jamming')
    flushRiskPositionFromCursor()
  }, [flushRiskPositionFromCursor])

  const closeRiskOverlay = useCallback(() => {
    setRiskMode('none')
    const ctx = cesiumCtxRef.current
    if (ctx && riskOverlayRef.current) {
      removeRiskOverlay(ctx.viewer, riskOverlayRef.current)
      riskOverlayRef.current = null
    }
  }, [cesiumCtxRef])

  const repositionRiskAt = useCallback(
    async (lon: number, lat: number) => {
      updateRiskPosition(lon, lat)
    },
    [updateRiskPosition],
  )

  const syncCtx: RiskOverlaySyncContext = {
    cesiumCtxRef,
    riskOverlayRef,
    riskOverlayGenRef,
    riskLonRef,
    riskLatRef,
    riskRingShadeRef,
  }

  return {
    riskMode,
    riskLon,
    riskLat,
    selectedWarhead,
    setSelectedWarhead,
    selectedJammer,
    setSelectedJammer,
    riskRingShade,
    setRiskRingShade,
    activateBlastRisk,
    activateJammingRisk,
    closeRiskOverlay,
    repositionRiskAt,
    syncRiskOverlay,
    syncCtx,
  }
}
