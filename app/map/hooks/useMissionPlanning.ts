'use client'

import { useCallback, useEffect, useRef } from 'react'
import { analyzeLaydown } from '@/lib/map/laydown-analysis'
import { planMissionPath } from '@/lib/map/mission-path-planner'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type { OverlapVolume, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas, PlacementMode } from '@/lib/map/types'

export function useMissionPlanning(
  placementMode: PlacementMode,
  setPlacementMode: (mode: PlacementMode) => void,
  placedUas: PlacedUas[],
  placedCuas: PlacedCuas[],
  placedRadars: PlacedRadar[],
  placedEffectors: PlacedEffector[],
  overlaps: OverlapVolume[],
  setPlacedUas: React.Dispatch<React.SetStateAction<PlacedUas[]>>,
  getCesium: () => CesiumContext | null,
) {
  const replanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildMissionForUas = useCallback(
    async (uas: PlacedUas, goalKind: 'target' | 'aoi', goalLon: number, goalLat: number, emcon: boolean, manualOverride: boolean) => {
      const ctx = getCesium()
      if (!ctx) return null
      const goalTerrainAMSL = await sampleTerrainAMSL(ctx.Cesium, ctx.terrainProvider, goalLon, goalLat, ctx.viewer)
      const overlapVolumes = overlaps.filter((o) => o.uasInstanceId === uas.instanceId)
      let overlapForPlanner = overlapVolumes
      if (overlapVolumes.length === 0 && placedCuas.length > 0) {
        const analysis = analyzeLaydown([uas], placedCuas, overlaps)
        overlapForPlanner = analysis.pairs
          .filter((p) => p.inDefeatRange)
          .map((p) => ({
            id: `overlap-${p.uasInstanceId}-${p.cuasInstanceId}`,
            uasInstanceId: p.uasInstanceId,
            cuasInstanceId: p.cuasInstanceId,
            lon: goalLon,
            lat: goalLat,
            alt_m: uas.discAltitude_m,
            radius_m: placedCuas.find((c) => c.instanceId === p.cuasInstanceId)?.asset.defeat_range_m ?? 0,
            effectiveness_pct: p.blueSuccessPct,
            isDefeat: p.blueSuccessPct >= 50,
            label: `${p.blueSuccessPct}% Pk`,
          }))
      }
      return planMissionPath({
        startLon: uas.lon,
        startLat: uas.lat,
        startTerrainAMSL: uas.terrainAMSL,
        goalLon,
        goalLat,
        goalTerrainAMSL,
        goalKind,
        asset: uas.asset,
        placedCuas,
        placedRadars,
        placedEffectors,
        emcon,
        overlapVolumes: overlapForPlanner,
      })
    },
    [getCesium, overlaps, placedCuas, placedRadars, placedEffectors],
  )

  const startMissionGoal = useCallback((uas: PlacedUas, kind: 'target' | 'aoi') => {
    setPlacementMode({ active: true, kind: 'mission-goal', uasInstanceId: uas.instanceId, goalKind: kind, asset: uas.asset })
  }, [setPlacementMode])

  const placeMissionGoal = useCallback(async (lon: number, lat: number) => {
    if (!placementMode.active || placementMode.kind !== 'mission-goal') return
    const uas = placedUas.find((u) => u.instanceId === placementMode.uasInstanceId)
    if (!uas) return
    const mission = await buildMissionForUas(uas, placementMode.goalKind, lon, lat, false, false)
    if (!mission) return
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uas.instanceId ? { ...u, mission, infoPanelClosed: true } : u)))
    setPlacementMode({ active: false })
  }, [placementMode, placedUas, buildMissionForUas, setPlacedUas, setPlacementMode])

  const replanMission = useCallback(async (uasInstanceId: string) => {
    const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
    if (!uas?.mission || uas.mission.manualOverride) return
    const mission = await buildMissionForUas(uas, uas.mission.goalKind, uas.mission.goalLon, uas.mission.goalLat, uas.mission.emcon, false)
    if (!mission) return
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId ? { ...u, mission: { ...mission, manualOverride: false } } : u)))
  }, [placedUas, buildMissionForUas, setPlacedUas])

  const updateWaypoint = useCallback((uasInstanceId: string, waypointId: string, patch: { alt_m?: number; speed_kmh?: number; lon?: number; lat?: number; terrainAMSL?: number }) => {
    setPlacedUas((prev) => prev.map((u) => {
      if (u.instanceId !== uasInstanceId || !u.mission) return u
      const waypoints = u.mission.waypoints.map((wp) => wp.id === waypointId ? { ...wp, ...patch } : wp)
      return { ...u, mission: { ...u.mission, waypoints, manualOverride: true, updatedAt: new Date().toISOString() } }
    }))
  }, [setPlacedUas])

  const setEmcon = useCallback((uasInstanceId: string, emcon: boolean) => {
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId && u.mission ? { ...u, mission: { ...u.mission, emcon } } : u)))
  }, [setPlacedUas])

  const setManualOverride = useCallback((uasInstanceId: string, manualOverride: boolean) => {
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId && u.mission ? { ...u, mission: { ...u.mission, manualOverride } } : u)))
  }, [setPlacedUas])

  const clearMission = useCallback((uasInstanceId: string) => {
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId ? { ...u, mission: undefined } : u)))
  }, [setPlacedUas])

  const placedUasRef = useRef(placedUas)
  placedUasRef.current = placedUas
  const buildMissionRef = useRef(buildMissionForUas)
  buildMissionRef.current = buildMissionForUas

  const laydownKey = [
    ...placedCuas.map((c) => `${c.instanceId}:${c.lon.toFixed(6)}:${c.lat.toFixed(6)}:${c.terrainAMSL}`),
    ...placedRadars.map((r) => `${r.instanceId}:${r.lon.toFixed(6)}:${r.lat.toFixed(6)}`),
    ...placedEffectors.map((e) => `${e.instanceId}:${e.lon.toFixed(6)}:${e.lat.toFixed(6)}`),
  ].join('|')

  useEffect(() => {
    if (replanTimerRef.current) clearTimeout(replanTimerRef.current)
    replanTimerRef.current = setTimeout(() => {
      void (async () => {
        for (const u of placedUasRef.current) {
          if (!u.mission || u.mission.manualOverride) continue
          const mission = await buildMissionRef.current(
            u,
            u.mission.goalKind,
            u.mission.goalLon,
            u.mission.goalLat,
            u.mission.emcon,
            false,
          )
          if (!mission) continue
          setPlacedUas((prev) =>
            prev.map((row) =>
              row.instanceId === u.instanceId ? { ...row, mission: { ...mission, manualOverride: false } } : row,
            ),
          )
        }
      })()
    }, 400)
    return () => {
      if (replanTimerRef.current) clearTimeout(replanTimerRef.current)
    }
  }, [laydownKey, setPlacedUas])

  return { startMissionGoal, placeMissionGoal, replanMission, updateWaypoint, setEmcon, setManualOverride, clearMission }
}
