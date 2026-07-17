'use client'

import { useCallback, useEffect, useRef } from 'react'
import { analyzeLaydown } from '@/lib/map/laydown-analysis'
import {
  defaultRouteObjective,
  inferDefaultMissionGoal,
  planMissionPath,
  rescoreMissionPlan,
} from '@/lib/map/mission-path-planner'
import { collectCombinedThreats, missionPathIntersectsThreats } from '@/lib/map/mission-path-scoring'
import { sampleTerrainAMSL } from '@/lib/map/terrain'
import type { CesiumContext } from '@/app/map/hooks/usePlatformPlacement'
import type {
  MissionRouteObjective,
  OverlapVolume,
  PlacedCuas,
  PlacedEffector,
  PlacedRadar,
  PlacedUas,
  PlacementMode,
} from '@/lib/map/types'


function missionFingerprint(m: import('@/lib/map/types').MissionPlan): string {
  const wp = m.waypoints
    .map((w) => `${w.lon.toFixed(6)}:${w.lat.toFixed(6)}:${w.alt_m.toFixed(1)}:${w.kind}`)
    .join('|')
  const scores = (m.segmentScores ?? [])
    .map((s) => `${s.maxPk_pct}:${s.maxPd_pct}`)
    .join('|')
  return `${wp}::${scores}::${m.routeObjective ?? 'pk'}::${m.emcon}`
}

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
  rcsOverrides?: Record<string, import('@/lib/spectral/detectionPhysicsConstants').RcsFacets>,
  pendingMissionUasId: string | null = null,
  flightPathEditActive = false,
) {
  const replanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoPlanSuppressedRef = useRef(new Set<string>())

  const buildMissionForUas = useCallback(
    async (
      uas: PlacedUas,
      goalKind: 'target' | 'aoi',
      goalLon: number,
      goalLat: number,
      emcon: boolean,
      routeObjective: MissionRouteObjective,
    ) => {
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
        routeObjective,
        overlapVolumes: overlapForPlanner,
        rcsOverride: rcsOverrides?.[uas.instanceId],
      })
    },
    [getCesium, overlaps, placedCuas, placedRadars, placedEffectors, rcsOverrides],
  )

  const autoPlanDefaultMission = useCallback(
    async (
      uasInstanceId: string,
      options?: { force?: boolean; manualOverride?: boolean },
    ): Promise<boolean> => {
      if (autoPlanSuppressedRef.current.has(uasInstanceId)) return false
      const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
      if (!uas || uas.mission) return Boolean(uas?.mission)
      const hasThreats =
        placedCuas.length > 0 || placedRadars.length > 0 || placedEffectors.length > 0
      if (!hasThreats && !options?.force) return false

      const threats = [
        ...placedCuas.map((c) => ({ lon: c.lon, lat: c.lat })),
        ...placedRadars.map((r) => ({ lon: r.lon, lat: r.lat })),
        ...placedEffectors.map((e) => ({ lon: e.lon, lat: e.lat })),
      ]
      const { goalLon, goalLat } = inferDefaultMissionGoal(
        uas.lon,
        uas.lat,
        uas.asset.max_range_km,
        threats,
      )
      const routeObjective = defaultRouteObjective(placedCuas, placedRadars, placedEffectors)
      const mission = await buildMissionForUas(uas, 'target', goalLon, goalLat, false, routeObjective)
      if (!mission) return false
      const manualOverride = options?.manualOverride ?? false
      setPlacedUas((prev) =>
        prev.map((row) =>
          row.instanceId === uasInstanceId ? { ...row, mission: { ...mission, manualOverride } } : row,
        ),
      )
      return true
    },
    [placedUas, placedCuas, placedRadars, placedEffectors, buildMissionForUas, setPlacedUas],
  )

  /** Ensure every placed UAS has a mission path and pause auto-replan for manual editing. */
  const enableFlightPathEdit = useCallback(async (): Promise<{ ok: true } | { ok: false; reason: string }> => {
    if (placedUas.length === 0) {
      return { ok: false, reason: 'Place at least one UAS on the map before editing flight paths.' }
    }
    const ctx = getCesium()
    if (!ctx) {
      return { ok: false, reason: 'Map not ready — wait for terrain to load, then try again.' }
    }

    for (const uas of placedUas) {
      if (!uas.mission) {
        const created = await autoPlanDefaultMission(uas.instanceId, { force: true, manualOverride: true })
        if (!created) {
          return { ok: false, reason: `Could not create a mission path for ${uas.asset.name}.` }
        }
      }
    }

    setPlacedUas((prev) =>
      prev.map((row) =>
        row.mission ? { ...row, mission: { ...row.mission, manualOverride: true } } : row,
      ),
    )
    return { ok: true }
  }, [placedUas, getCesium, autoPlanDefaultMission, setPlacedUas])

  const startMissionGoal = useCallback((uas: PlacedUas, kind: 'target' | 'aoi') => {
    setPlacementMode({ active: true, kind: 'mission-goal', uasInstanceId: uas.instanceId, goalKind: kind, asset: uas.asset })
  }, [setPlacementMode])

  const placeMissionGoal = useCallback(async (lon: number, lat: number) => {
    if (!placementMode.active || placementMode.kind !== 'mission-goal') return
    const uas = placedUas.find((u) => u.instanceId === placementMode.uasInstanceId)
    if (!uas) return
    const routeObjective = defaultRouteObjective(placedCuas, placedRadars, placedEffectors)
    const mission = await buildMissionForUas(uas, placementMode.goalKind, lon, lat, false, routeObjective)
    if (!mission) return
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uas.instanceId ? { ...u, mission, infoPanelClosed: true } : u)))
    setPlacementMode({ active: false })
  }, [placementMode, placedUas, placedCuas, placedRadars, placedEffectors, buildMissionForUas, setPlacedUas, setPlacementMode])

  const replanMission = useCallback(async (
    uasInstanceId: string,
    options?: { clearManualOverride?: boolean },
  ) => {
    const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
    if (!uas?.mission) return
    if (uas.mission.manualOverride && !options?.clearManualOverride) return
    const mission = await buildMissionForUas(
      uas,
      uas.mission.goalKind,
      uas.mission.goalLon,
      uas.mission.goalLat,
      uas.mission.emcon,
      uas.mission.routeObjective ?? defaultRouteObjective(placedCuas, placedRadars, placedEffectors),
    )
    if (!mission) return
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId ? { ...u, mission: { ...mission, manualOverride: false } } : u)))
  }, [placedUas, placedCuas, placedRadars, placedEffectors, buildMissionForUas, setPlacedUas])

  const replanAllMissions = useCallback(async (options?: { clearManualOverride?: boolean }) => {
    for (const u of placedUas) {
      if (!u.mission) continue
      if (u.mission.manualOverride && !options?.clearManualOverride) continue
      await replanMission(u.instanceId, options)
    }
  }, [placedUas, replanMission])

  const suppressAutoPlan = useCallback((uasInstanceId: string) => {
    autoPlanSuppressedRef.current.add(uasInstanceId)
  }, [])

  const addWaypointOnPath = useCallback(
    async (
      uasInstanceId: string,
      lon: number,
      lat: number,
      segmentIndex?: number,
    ): Promise<{ ok: true } | { ok: false; reason: string }> => {
      const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
      if (!uas?.mission) {
        return { ok: false, reason: 'No mission path on this UAS — place a threat asset to auto-plan or set a mission goal.' }
      }
      if (uas.mission.waypoints.length < 2) {
        return { ok: false, reason: 'Mission path needs at least two waypoints before inserting.' }
      }
      const ctx = getCesium()
      if (!ctx) {
        return { ok: false, reason: 'Map not ready — wait for terrain to load, then try again.' }
      }
      const terrainAMSL = await sampleTerrainAMSL(ctx.Cesium, ctx.terrainProvider, lon, lat, ctx.viewer)
      const insertAfter =
        segmentIndex == null
          ? Math.max(0, uas.mission.waypoints.length - 2)
          : Math.max(0, Math.min(segmentIndex, uas.mission.waypoints.length - 2))
      const prev = uas.mission.waypoints[insertAfter]
      const next = uas.mission.waypoints[insertAfter + 1]
      const alt_m = (prev.alt_m + next.alt_m) / 2
      const speed_kmh = (prev.speed_kmh + next.speed_kmh) / 2
      const newWp = {
        id: `wp-manual-${Date.now()}`,
        lon,
        lat,
        terrainAMSL,
        alt_m,
        speed_kmh,
        kind: 'detour' as const,
      }
      setPlacedUas((prevRows) =>
        prevRows.map((row) => {
          if (row.instanceId !== uasInstanceId || !row.mission) return row
          const waypoints = [...row.mission.waypoints]
          waypoints.splice(insertAfter + 1, 0, newWp)
          const overlapVolumes = overlaps.filter((o) => o.uasInstanceId === uasInstanceId)
          const mission = rescoreMissionPlan(
            { ...row.mission, waypoints, manualOverride: true },
            row.asset,
            placedCuas,
            placedRadars,
            placedEffectors,
            overlapVolumes,
            row.mission.emcon,
            rcsOverrides?.[uasInstanceId],
          )
          return { ...row, mission }
        }),
      )
      return { ok: true }
    },
    [placedUas, placedCuas, placedRadars, placedEffectors, overlaps, rcsOverrides, getCesium, setPlacedUas],
  )

  const updateWaypoint = useCallback(async (
    uasInstanceId: string,
    waypointId: string,
    patch: { alt_m?: number; speed_kmh?: number; lon?: number; lat?: number; terrainAMSL?: number },
  ): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
    if (!uas?.mission) {
      return { ok: false, reason: 'No mission path on this UAS.' }
    }
    let resolvedPatch = { ...patch }
    if (patch.lon != null && patch.lat != null) {
      const ctx = getCesium()
      if (!ctx) {
        return { ok: false, reason: 'Map not ready — cannot resample terrain for moved waypoint.' }
      }
      resolvedPatch.terrainAMSL = await sampleTerrainAMSL(
        ctx.Cesium,
        ctx.terrainProvider,
        patch.lon,
        patch.lat,
        ctx.viewer,
      )
      if (patch.alt_m == null) {
        const existing = uas.mission.waypoints.find((wp) => wp.id === waypointId)
        if (existing && resolvedPatch.terrainAMSL != null) {
          resolvedPatch.alt_m = resolvedPatch.terrainAMSL + (existing.alt_m - existing.terrainAMSL)
        }
      }
    }
    setPlacedUas((prev) => prev.map((u) => {
      if (u.instanceId !== uasInstanceId || !u.mission) return u
      const waypoints = u.mission.waypoints.map((wp) => wp.id === waypointId ? { ...wp, ...resolvedPatch } : wp)
      const overlapVolumes = overlaps.filter((o) => o.uasInstanceId === uasInstanceId)
      const mission = rescoreMissionPlan(
        { ...u.mission, waypoints, manualOverride: true },
        u.asset,
        placedCuas,
        placedRadars,
        placedEffectors,
        overlapVolumes,
        u.mission.emcon,
        rcsOverrides?.[uasInstanceId],
      )
      return { ...u, mission }
    }))
    return { ok: true }
  }, [placedUas, setPlacedUas, placedCuas, placedRadars, placedEffectors, overlaps, rcsOverrides, getCesium])

  const setEmcon = useCallback(async (uasInstanceId: string, emcon: boolean) => {
    const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
    if (!uas?.mission) return
    if (uas.mission.manualOverride) {
      setPlacedUas((prev) =>
        prev.map((u) => (u.instanceId === uasInstanceId && u.mission ? { ...u, mission: { ...u.mission, emcon } } : u)),
      )
      return
    }
    const mission = await buildMissionForUas(
      uas,
      uas.mission.goalKind,
      uas.mission.goalLon,
      uas.mission.goalLat,
      emcon,
      uas.mission.routeObjective ?? defaultRouteObjective(placedCuas, placedRadars, placedEffectors),
    )
    if (!mission) return
    setPlacedUas((prev) =>
      prev.map((u) => (u.instanceId === uasInstanceId ? { ...u, mission: { ...mission, manualOverride: false } } : u)),
    )
  }, [placedUas, placedCuas, placedRadars, placedEffectors, buildMissionForUas, setPlacedUas])

  const setRouteObjective = useCallback(async (uasInstanceId: string, routeObjective: MissionRouteObjective) => {
    const uas = placedUas.find((u) => u.instanceId === uasInstanceId)
    if (!uas?.mission) return
    if (uas.mission.manualOverride) {
      setPlacedUas((prev) =>
        prev.map((u) =>
          u.instanceId === uasInstanceId && u.mission ? { ...u, mission: { ...u.mission, routeObjective } } : u,
        ),
      )
      return
    }
    const mission = await buildMissionForUas(
      uas,
      uas.mission.goalKind,
      uas.mission.goalLon,
      uas.mission.goalLat,
      uas.mission.emcon,
      routeObjective,
    )
    if (!mission) return
    setPlacedUas((prev) =>
      prev.map((u) => (u.instanceId === uasInstanceId ? { ...u, mission: { ...mission, manualOverride: false } } : u)),
    )
  }, [placedUas, buildMissionForUas, setPlacedUas])

  const setManualOverride = useCallback((uasInstanceId: string, manualOverride: boolean) => {
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId && u.mission ? { ...u, mission: { ...u.mission, manualOverride } } : u)))
  }, [setPlacedUas])

  const clearMission = useCallback((uasInstanceId: string) => {
    autoPlanSuppressedRef.current.add(uasInstanceId)
    setPlacedUas((prev) => prev.map((u) => (u.instanceId === uasInstanceId ? { ...u, mission: undefined } : u)))
  }, [setPlacedUas])

  const placedUasRef = useRef(placedUas)
  placedUasRef.current = placedUas
  const placementModeRef = useRef(placementMode)
  placementModeRef.current = placementMode
  const buildMissionRef = useRef(buildMissionForUas)
  buildMissionRef.current = buildMissionForUas
  const flightPathEditRef = useRef(flightPathEditActive)
  flightPathEditRef.current = flightPathEditActive

  const laydownKey = [
    ...placedUas.map(
      (u) => `${u.instanceId}:${u.lon.toFixed(6)}:${u.lat.toFixed(6)}:${u.terrainAMSL}:${u.discAltitude_m}`,
    ),
    ...placedCuas.map((c) => `${c.instanceId}:${c.lon.toFixed(6)}:${c.lat.toFixed(6)}:${c.terrainAMSL}`),
    ...placedRadars.map((r) => `${r.instanceId}:${r.lon.toFixed(6)}:${r.lat.toFixed(6)}`),
    ...placedEffectors.map((e) => `${e.instanceId}:${e.lon.toFixed(6)}:${e.lat.toFixed(6)}`),
  ].join('|')

  useEffect(() => {
    if (replanTimerRef.current) clearTimeout(replanTimerRef.current)
    replanTimerRef.current = setTimeout(() => {
      void (async () => {
        const mode = placementModeRef.current
        if (mode.active && mode.kind === 'mission-goal') return

        for (const u of placedUasRef.current) {
          if (!u.mission) {
            if (
              placedCuas.length > 0 ||
              placedRadars.length > 0 ||
              placedEffectors.length > 0
            ) {
              await autoPlanDefaultMission(u.instanceId)
            }
            continue
          }
          const allThreats = collectCombinedThreats(
            placedCuas,
            placedRadars,
            placedEffectors,
            u.asset,
          )
          const threatOnPath = missionPathIntersectsThreats(u.mission.waypoints, allThreats)
          if (flightPathEditRef.current && u.mission.manualOverride && !threatOnPath) continue
          if (u.mission.manualOverride && !threatOnPath) continue
          let routeObjective =
            u.mission.routeObjective ??
            defaultRouteObjective(placedCuas, placedRadars, placedEffectors)
          if (
            !u.mission.manualOverride &&
            routeObjective === 'pd' &&
            (placedCuas.length > 0 || placedEffectors.length > 0)
          ) {
            routeObjective = 'combined'
          }
          const mission = await buildMissionRef.current(
            u,
            u.mission.goalKind,
            u.mission.goalLon,
            u.mission.goalLat,
            u.mission.emcon,
            routeObjective,
          )
          if (!mission) continue
          const nextMission = { ...mission, manualOverride: false as const }
          if (u.mission && missionFingerprint(u.mission) === missionFingerprint(nextMission)) continue
          setPlacedUas((prev) =>
            prev.map((row) =>
              row.instanceId === u.instanceId ? { ...row, mission: nextMission } : row,
            ),
          )
        }
      })()
    }, 400)
    return () => {
      if (replanTimerRef.current) clearTimeout(replanTimerRef.current)
    }
  }, [laydownKey, setPlacedUas, placedCuas.length, placedRadars.length, placedEffectors.length, autoPlanDefaultMission, placementMode])

  return {
    startMissionGoal,
    placeMissionGoal,
    replanMission,
    replanAllMissions,
    autoPlanDefaultMission,
    addWaypointOnPath,
    updateWaypoint,
    setEmcon,
    setRouteObjective,
    setManualOverride,
    clearMission,
    releaseAutoPlanSuppression: (uasInstanceId: string) => {
      autoPlanSuppressedRef.current.delete(uasInstanceId)
    },
    suppressAutoPlan,
    enableFlightPathEdit,
  }
}
