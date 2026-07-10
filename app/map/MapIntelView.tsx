'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { readMapStaging, clearMapStaging, resolveMapStagingIds } from '@/lib/spectrum/map-staging'
import { AssetSidebar } from '@/app/map/components/AssetSidebar'
import { SpectralAnalysisPanel } from '@/app/map/components/SpectralAnalysisPanel'
import { MapNavigationWheel } from '@/app/map/components/MapNavigationWheel'
import { EntityInfoPanel } from '@/app/map/components/EntityInfoPanel'
import { PlatformContextMenu } from '@/app/map/components/PlatformContextMenu'
import { LaydownEvaluationPanel } from '@/app/map/components/LaydownEvaluationPanel'
import type { PlatformContextTarget } from '@/app/map/hooks/usePlatformContextMenu'
import { useDefeatOverlap } from '@/app/map/hooks/useDefeatOverlap'
import { useLaydownAdjudication } from '@/app/map/hooks/useLaydownAdjudication'
import { usePropagationHeatmap } from '@/app/map/hooks/usePropagationHeatmap'
import { useLoiterPlanning } from '@/app/map/hooks/useLoiterPlanning'
import { useMissionPlanning } from '@/app/map/hooks/useMissionPlanning'
import { MissionGoalDialog } from '@/app/map/components/MissionGoalDialog'
import { WaypointContextMenu, type WaypointContextTarget } from '@/app/map/components/WaypointContextMenu'
import {
  usePlatformPlacement,
  type CesiumContext,
} from '@/app/map/hooks/usePlatformPlacement'
import { useEnvelopeWalls } from '@/app/map/hooks/useEnvelopeWalls'
import { useTerrainMasking } from '@/app/map/hooks/useTerrainMasking'
import { useMapBuildings } from '@/app/map/hooks/useMapBuildings'
import { useWindData } from '@/app/map/hooks/useWindData'
import { writeLaydownSession } from '@/lib/map/laydown-session'
import { useBattlespacePlan } from '@/app/map/hooks/useBattlespacePlan'
import { PlannerToolbar } from '@/components/planner/PlannerToolbar'
import { IadsStackPanel } from '@/app/map/components/IadsStackPanel'
import { getVignette, vignetteToLaydown } from '@/lib/planner/vignettes'
import { hydrateLaydown } from '@/lib/planner/battlespace-plan'
import { haversineM } from '@/lib/propagation/geo'
import {
  buildLaydownEvaluation,
  catalogEffectors,
  catalogRadars,
  isSameLaydownItem,
  listPlacedLaydownItems,
  type EvaluatedItem,
  type SelectedLaydownItem,
} from '@/lib/map/laydown-evaluation'
import { getSpectraMapAssets, toMapEffectorAsset, toMapRadarAsset } from '@/lib/map/spectra-assets'
import { buildThreatAssessments } from '@/lib/map/threat-assessment'
import { envelopeDiscAltitudeM } from '@/lib/map/range-declaration'
import type { TerrainHeightUpdate } from '@/lib/map/terrain'
import { cn } from '@/lib/utils'
import type { MapAssetsPayload, CursorPosition, PlacementMode, PlacedCuas, PlacedEffector, PlacedRadar, PlacedUas } from '@/lib/map/types'
import type { RcsFacets } from '@/lib/spectral/detectionPhysicsConstants'

import { CollateralRiskPanel } from '@/app/map/components/CollateralRiskPanel'
import { CuasSitingPlanner } from '@/app/map/components/CuasSitingPlanner'
import { EwFootprintAnalyser } from '@/app/map/components/EwFootprintAnalyser'
import { useRiskOverlayController } from '@/app/map/hooks/useRiskOverlayController'
import type { CesiumModule, CesiumViewer } from '@/lib/map/cesium-types'
import {
  computeCde,
  WARHEAD_DB,
  JAMMER_DB,
  type CdeResult,
  type PopulationDensityTier,
  type TimeOfDay,
  type BuildingProtection,
} from '@/lib/risk'

const CesiumMapPanel = dynamic(() => import('./CesiumMapPanel'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center store-text-muted font-mono text-sm">
      Initialising Cesium globe…
    </div>
  ),
})

const MapBottomBar = dynamic(
  () => import('./CesiumMapPanel').then((m) => ({ default: m.MapBottomBar })),
  { ssr: false }
)

function mapToolbarBtn(active: boolean, accent: 'orange' | 'cyan'): string {
  const base = 'px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border shadow-md transition-colors'
  if (active) {
    return accent === 'orange'
      ? `${base} bg-[#F97316] border-[#F97316] text-[#0A0A0F]`
      : `${base} bg-[#06B6D4] border-[#06B6D4] text-[#0A0A0F]`
  }
  return `${base} bg-[#111118] border-[#3f3f46] text-zinc-100 hover:bg-[#1c1c24] hover:border-zinc-500`
}

interface MapIntelViewProps {
  initialAssets: MapAssetsPayload
}

export default function MapIntelView({ initialAssets }: MapIntelViewProps) {
  const searchParams = useSearchParams()
  const [assets] = useState(initialAssets)
  const [placedUas, setPlacedUas] = useState<PlacedUas[]>([])
  const [rcsOverrides, setRcsOverrides] = useState<Record<string, RcsFacets>>({})
  const [placedCuas, setPlacedCuas] = useState<PlacedCuas[]>([])
  const [placedRadars, setPlacedRadars] = useState<PlacedRadar[]>([])
  const [placedEffectors, setPlacedEffectors] = useState<PlacedEffector[]>([])
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ active: false })
  const [nilWind, setNilWind] = useState(true)
  const [cursor, setCursor] = useState<CursorPosition>({ lon: 0, lat: 0, terrainAMSL: null })
  const [panelScreenPos, setPanelScreenPos] = useState<{ x: number; y: number } | null>(null)
  const [stagingBanner, setStagingBanner] = useState<{
    stagedCount: number
    matchedCount: number
  } | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])
  const [terrainEpoch, setTerrainEpoch] = useState(0)
  const [spectralOpen, setSpectralOpen] = useState(false)
  const [heatmapEnabled, setHeatmapEnabled] = useState(false)
  const [platformContextMenu, setPlatformContextMenu] = useState<PlatformContextTarget | null>(null)
  const [selectedLaydownItem, setSelectedLaydownItem] = useState<SelectedLaydownItem | null>(null)
  const prevPlacedCountsRef = useRef({ uas: 0, cuas: 0, radar: 0, effector: 0 })
  const [pendingMissionUasId, setPendingMissionUasId] = useState<string | null>(null)
  const [waypointContextMenu, setWaypointContextMenu] = useState<WaypointContextTarget | null>(null)

  type MapToolMode = 'none' | 'cuas-siting' | 'ew-deconflict'

  const [mapTool, setMapTool] = useState<MapToolMode>('none')
  const [riskPopTier, setRiskPopTier] = useState<PopulationDensityTier>('urban')
  const [riskTimeOfDay, setRiskTimeOfDay] = useState<TimeOfDay>('business_day')
  const [riskProtection, setRiskProtection] = useState<BuildingProtection>('light')
  const [cdeResult, setCdeResult] = useState<CdeResult | null>(null)
  const cesiumViewerRef = useRef<CesiumViewer | null>(null)
  const cesiumModuleRef = useRef<CesiumModule | null>(null)
  const placementModeRef = useRef<PlacementMode>({ active: false })

  const cesiumCtxRef = useRef<CesiumContext | null>(null)
  const [cesiumReady, setCesiumReady] = useState(false)
  const getCesium = useCallback(() => cesiumCtxRef.current, [])

  const onCesiumReady = useCallback((ctx: CesiumContext) => {
    cesiumCtxRef.current = ctx
    cesiumViewerRef.current = ctx.viewer
    cesiumModuleRef.current = ctx.Cesium
    setCesiumReady(true)
  }, [])


  const {
    riskMode,
    riskLon,
    riskLat,
    selectedWarhead,
    setSelectedWarhead,
    selectedJammer,
    setSelectedJammer,
    riskRingShade,
    setRiskRingShade,
    activateBlastRisk: activateBlastRiskBase,
    activateJammingRisk: activateJammingRiskBase,
    closeRiskOverlay,
    repositionRiskAt,
  } = useRiskOverlayController({
    cesiumCtxRef,
    cesiumReady,
    cesiumViewerRef,
    cesiumModuleRef,
    placementModeRef,
    cursorLon: cursor.lon,
    cursorLat: cursor.lat,
  })

  const activateBlastRisk = useCallback(() => {
    setMapTool('none')
    activateBlastRiskBase()
  }, [activateBlastRiskBase])

  const activateJammingRisk = useCallback(() => {
    setMapTool('none')
    activateJammingRiskBase()
  }, [activateJammingRiskBase])

  const {
    placeAt,
    placeCuasAt,
    startUasPlacement,
    startCuasPlacement,
    startRadarPlacement,
    startEffectorPlacement,
    cancelPlacement,
    duplicateAdjacent,
  } = usePlatformPlacement(
    placementMode,
    setPlacementMode,
    placedUas,
    placedCuas,
    placedRadars,
    placedEffectors,
    setPlacedUas,
    setPlacedCuas,
    setPlacedRadars,
    setPlacedEffectors,
    getCesium,
    (uas) => setPendingMissionUasId(uas.instanceId),
  )

  const handleAddFromEvaluation = useCallback(
    (item: EvaluatedItem) => {
      switch (item.kind) {
        case 'uas': {
          const asset = assets.uas.find((a) => a.id === item.assetId)
          if (asset) startUasPlacement(asset)
          break
        }
        case 'cuas': {
          const asset = assets.cuas.find((a) => a.id === item.assetId)
          if (asset) startCuasPlacement(asset)
          break
        }
        case 'radar': {
          let asset = assets.radars.find((a) => a.id === item.assetId)
          if (!asset) {
            const seed = catalogRadars().find((r) => r.id === item.assetId)
            if (seed) asset = toMapRadarAsset(seed)
            else asset = getSpectraMapAssets().radars.find((r) => r.id === item.assetId)
          }
          if (asset) startRadarPlacement(asset)
          break
        }
        case 'effector': {
          let asset = assets.effectors.find((a) => a.id === item.assetId)
          if (!asset) {
            const seed = catalogEffectors().find((e) => e.id === item.assetId)
            if (seed) {
              const { radars } = getSpectraMapAssets()
              const radarById = new Map(radars.map((r) => [r.id, r]))
              asset = toMapEffectorAsset(seed, radarById)
            } else {
              asset = getSpectraMapAssets().effectors.find((e) => e.id === item.assetId)
            }
          }
          if (asset) startEffectorPlacement(asset)
          break
        }
      }
    },
    [assets, startUasPlacement, startCuasPlacement, startRadarPlacement, startEffectorPlacement],
  )

  const { startLoiterMode, placeLoiterWaypoint, clearLoiter } = useLoiterPlanning(
    placementMode,
    setPlacementMode,
    setPlacedUas,
    getCesium
  )

  const maskingPolygons = useTerrainMasking(
    placedCuas,
    getCesium,
    setPlacedCuas,
    terrainEpoch,
  )
  const { overlaps, source: overlapSource } = useDefeatOverlap(placedUas, placedCuas)


  useEffect(() => {
    placementModeRef.current = placementMode
  }, [placementMode])

  useEffect(() => {
    if (!selectedWarhead || riskLon === null || riskLat === null) {
      setCdeResult(null)
      return
    }
    setCdeResult(
      computeCde({
        impact_lon: riskLon,
        impact_lat: riskLat,
        blast: selectedWarhead,
        population_tier: riskPopTier,
        time_of_day: riskTimeOfDay,
        building_protection: riskProtection,
        nearby_infrastructure: ['none'],
      }),
    )
  }, [selectedWarhead, riskLon, riskLat, riskPopTier, riskTimeOfDay, riskProtection])

  const handleRcsChange = useCallback((uasInstanceId: string, facets: RcsFacets | undefined) => {
    setRcsOverrides((prev) => {
      if (!facets) {
        const next = { ...prev }
        delete next[uasInstanceId]
        return next
      }
      return { ...prev, [uasInstanceId]: facets }
    })
  }, [])

  const { startMissionGoal, placeMissionGoal, replanMission, updateWaypoint, setEmcon, setRouteObjective, clearMission } = useMissionPlanning(
    placementMode, setPlacementMode, placedUas, placedCuas, placedRadars, placedEffectors, overlaps, setPlacedUas, getCesium, rcsOverrides,
  )

  const pendingMissionUas = useMemo(() => placedUas.find((u) => u.instanceId === pendingMissionUasId) ?? null, [placedUas, pendingMissionUasId])
  const adjudication = useLaydownAdjudication(
    placedUas,
    placedCuas,
    overlaps,
    placedUas.length > 0 && placedCuas.length > 0,
    maskingPolygons,
    getCesium,
  )
  const planner = useBattlespacePlan(
    assets,
    { placedUas, placedCuas, placedRadars, placedEffectors },
    { setPlacedUas, setPlacedCuas, setPlacedRadars, setPlacedEffectors },
  )
  const [showIadsPanel, setShowIadsPanel] = useState(false)

  const heatmapJammer =
    placedCuas.find((c) => c.asset.defeat_methods.includes('RF_jamming')) ?? placedCuas[0] ?? null
  const heatmapReceiverAlt =
    placedUas[0]?.discAltitude_m ?? heatmapJammer?.terrainAMSL ?? 100
  const heatmap = usePropagationHeatmap(heatmapEnabled, heatmapJammer, heatmapReceiverAlt)
  const buildingBounds = useMemo(() => {
    const pts = [
      ...placedUas.map((u) => ({ lat: u.lat, lon: u.lon })),
      ...placedCuas.map((c) => ({ lat: c.lat, lon: c.lon })),
    ]
    if (pts.length === 0 && cursor.lon) {
      const pad = 0.02
      return {
        south: cursor.lat - pad,
        north: cursor.lat + pad,
        west: cursor.lon - pad,
        east: cursor.lon + pad,
      }
    }
    if (pts.length === 0) return null
    const lats = pts.map((p) => p.lat)
    const lons = pts.map((p) => p.lon)
    const pad = 0.015
    return {
      south: Math.min(...lats) - pad,
      north: Math.max(...lats) + pad,
      west: Math.min(...lons) - pad,
      east: Math.max(...lons) + pad,
    }
  }, [placedUas, placedCuas, cursor.lat, cursor.lon])
  const mapBuildings = useMapBuildings(buildingBounds, placedCuas.length > 0 || placedUas.length > 0)
  const { windByUas, loading: windLoading } = useWindData(nilWind, placedUas, setPlacedUas)
  useEnvelopeWalls(nilWind, placedUas, getCesium, setPlacedUas)

  const panelUas = useMemo(
    () => placedUas.find((u) => !u.infoPanelClosed) ?? null,
    [placedUas]
  )

  const overlapLegend = useMemo(
    () => ({
      defeat: overlaps.filter((o) => o.isDefeat).length,
      survivable: overlaps.filter((o) => !o.isDefeat).length,
    }),
    [overlaps]
  )

  const threatAssessments = useMemo(
    () =>
      buildThreatAssessments(
        placedUas,
        placedCuas,
        adjudication.analysis,
        assets.cuas,
        overlaps,
      ),
    [placedUas, placedCuas, adjudication.analysis, assets.cuas, overlaps],
  )

  const laydownState = useMemo(
    () => ({
      placedUas,
      placedCuas,
      placedRadars,
      placedEffectors,
      catalogUas: assets.uas,
      catalogCuas: assets.cuas,
    }),
    [placedUas, placedCuas, placedRadars, placedEffectors, assets.uas, assets.cuas],
  )

  const laydownEvaluation = useMemo(
    () => buildLaydownEvaluation(selectedLaydownItem, laydownState),
    [selectedLaydownItem, laydownState],
  )

  const placedLaydownChips = useMemo(() => {
    const nameFor = (item: SelectedLaydownItem) => {
      switch (item.kind) {
        case 'uas':
          return placedUas.find((u) => u.instanceId === item.instanceId)?.asset.name ?? item.instanceId
        case 'cuas':
          return placedCuas.find((c) => c.instanceId === item.instanceId)?.asset.name ?? item.instanceId
        case 'radar':
          return placedRadars.find((r) => r.instanceId === item.instanceId)?.asset.name ?? item.instanceId
        case 'effector':
          return placedEffectors.find((e) => e.instanceId === item.instanceId)?.asset.name ?? item.instanceId
      }
    }
    return listPlacedLaydownItems(laydownState).map((item) => ({
      ...item,
      name: nameFor(item),
    }))
  }, [laydownState, placedUas, placedCuas, placedRadars, placedEffectors])

  useEffect(() => {
    const counts = {
      uas: placedUas.length,
      cuas: placedCuas.length,
      radar: placedRadars.length,
      effector: placedEffectors.length,
    }
    const total = counts.uas + counts.cuas + counts.radar + counts.effector
    if (total === 0) {
      setSelectedLaydownItem(null)
      prevPlacedCountsRef.current = counts
      return
    }

    const items = listPlacedLaydownItems(laydownState)
    const stillValid = selectedLaydownItem && items.some((i) => isSameLaydownItem(i, selectedLaydownItem))

    if (!stillValid) {
      if (counts.uas > prevPlacedCountsRef.current.uas) {
        const last = placedUas[placedUas.length - 1]
        setSelectedLaydownItem({ kind: 'uas', instanceId: last.instanceId })
      } else if (counts.cuas > prevPlacedCountsRef.current.cuas) {
        const last = placedCuas[placedCuas.length - 1]
        setSelectedLaydownItem({ kind: 'cuas', instanceId: last.instanceId })
      } else if (counts.radar > prevPlacedCountsRef.current.radar) {
        const last = placedRadars[placedRadars.length - 1]
        setSelectedLaydownItem({ kind: 'radar', instanceId: last.instanceId })
      } else if (counts.effector > prevPlacedCountsRef.current.effector) {
        const last = placedEffectors[placedEffectors.length - 1]
        setSelectedLaydownItem({ kind: 'effector', instanceId: last.instanceId })
      } else {
        setSelectedLaydownItem(items[items.length - 1] ?? null)
      }
    }

    prevPlacedCountsRef.current = counts
  }, [placedUas, placedCuas, placedRadars, placedEffectors, laydownState, selectedLaydownItem])

  const handleGlobeClick = useCallback(
    async (lon: number, lat: number) => {
      if (riskMode !== 'none') {
        await repositionRiskAt(lon, lat)
        return
      }
      if (placementMode.active && placementMode.kind === 'mission-goal') {
        await placeMissionGoal(lon, lat)
        return
      }
      if (placementMode.active && placementMode.kind === 'loiter') {
        await placeLoiterWaypoint(lon, lat)
        return
      }
      await placeAt(lon, lat)
    },
    [placementMode, placeAt, placeLoiterWaypoint, placeMissionGoal, riskMode, repositionRiskAt]
  )

  const handleClearAll = useCallback(() => {
    setPlacedUas([])
    setPlacedCuas([])
    setPlacedRadars([])
    setPlacedEffectors([])
    setPlacementMode({ active: false })
  }, [])

  const handleRemoveUas = useCallback((instanceId: string) => {
    setPlacedUas((prev) => prev.filter((u) => u.instanceId !== instanceId))
    setPlacementMode((mode) => {
      if (
        mode.active &&
        (mode.kind === 'loiter' || mode.kind === 'mission-goal') &&
        mode.uasInstanceId === instanceId
      ) {
        return { active: false }
      }
      return mode
    })
  }, [])

  const handleRemoveCuas = useCallback((instanceId: string) => {
    setPlacedCuas((prev) => prev.filter((c) => c.instanceId !== instanceId))
  }, [])

  const handleRemoveRadar = useCallback((instanceId: string) => {
    setPlacedRadars((prev) => prev.filter((r) => r.instanceId !== instanceId))
  }, [])

  const handleRemoveEffector = useCallback((instanceId: string) => {
    setPlacedEffectors((prev) => prev.filter((e) => e.instanceId !== instanceId))
  }, [])

  const closePanel = useCallback((instanceId: string) => {
    setPlacedUas((prev) =>
      prev.map((u) =>
        u.instanceId === instanceId ? { ...u, infoPanelClosed: true } : u
      )
    )
  }, [])

  const handleTerrainHeightsResolved = useCallback((update: TerrainHeightUpdate) => {
    if (update.uas.length || update.loiter.length) {
      setPlacedUas((prev) =>
        prev.map((u) => {
          const uasHit = update.uas.find((h) => h.instanceId === u.instanceId)
          const loiterHit = update.loiter.find((h) => h.uasInstanceId === u.instanceId)
          if (!uasHit && !loiterHit) return u
          return {
            ...u,
            ...(uasHit
              ? {
                  terrainAMSL: uasHit.terrainAMSL,
                  ceilingAMSL_m: uasHit.terrainAMSL + u.asset.max_altitude_agl_m,
                  discAltitude_m: envelopeDiscAltitudeM(
                    uasHit.terrainAMSL,
                    u.asset.max_altitude_agl_m,
                    u.asset.altitude_reference,
                  ),
                }
              : {}),
            ...(loiterHit && u.loiter
              ? { loiter: { ...u.loiter, terrainAMSL: loiterHit.terrainAMSL } }
              : {}),
          }
        })
      )
    }
    if (update.cuas.length) {
      setPlacedCuas((prev) =>
        prev.map((c) => {
          const hit = update.cuas.find((h) => h.instanceId === c.instanceId)
          if (!hit) return c
          return { ...c, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
    if (update.radars.length) {
      setPlacedRadars((prev) =>
        prev.map((r) => {
          const hit = update.radars.find((h) => h.instanceId === r.instanceId)
          if (!hit) return r
          return { ...r, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
    if (update.effectors.length) {
      setPlacedEffectors((prev) =>
        prev.map((e) => {
          const hit = update.effectors.find((h) => h.instanceId === e.instanceId)
          if (!hit) return e
          return { ...e, terrainAMSL: hit.terrainAMSL }
        })
      )
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelPlacement()
        setPlatformContextMenu(null)
        return
      }
      if (
        e.key.toLowerCase() === 's' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (placedUas.length > 0 || placedCuas.length > 0) &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setSpectralOpen(true)
      }
      if (
        e.key.toLowerCase() === 'h' &&
        !e.metaKey &&
        !e.ctrlKey &&
        placedCuas.length > 0 &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        setHeatmapEnabled((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelPlacement, placedUas.length, placedCuas.length])


  useEffect(() => {
    if (searchParams.get('from') !== 'defeat') return
    const cuasId = searchParams.get('cuas')
    const stageId = searchParams.get('stage')
    const highlight: string[] = []
    if (stageId) {
      const uas = assets.uas.find((a) => a.id === stageId)
      if (uas) {
        startUasPlacement(uas)
        highlight.push(stageId)
      }
    }
    if (cuasId) {
      const cuas = assets.cuas.find((a) => a.id === cuasId)
      if (cuas) {
        startCuasPlacement(cuas)
        highlight.push(cuasId)
      }
    }
    if (highlight.length) setHighlightedIds(highlight)
    if (stageId || cuasId) setSpectralOpen(true)
  }, [searchParams, assets.uas, assets.cuas, startUasPlacement, startCuasPlacement])

  useEffect(() => {
    const vignetteId = searchParams.get('planVignette')
    if (!vignetteId) return
    const v = getVignette(vignetteId)
    if (!v) return
    const doc = vignetteToLaydown(v)
    const hydrated = hydrateLaydown(doc, assets)
    setPlacedUas(hydrated.placedUas)
    setPlacedCuas(hydrated.placedCuas)
    setPlacedRadars(hydrated.placedRadars)
    setPlacedEffectors(hydrated.placedEffectors)
    planner.setPlanName(v.name)
  }, [searchParams, assets])

  useEffect(() => {
    const planId = searchParams.get('planId') ?? searchParams.get('plan')
    if (planId) void planner.loadPlan(planId)
  }, [searchParams])

  const stagingHandledRef = useRef(false)

  useEffect(() => {
    if (stagingHandledRef.current) return
    if (searchParams.get('from') !== 'spectra') return

    const staging = readMapStaging()
    if (!staging) return

    stagingHandledRef.current = true
    const stagedIds = staging.placeIds ?? staging.highlightIds ?? []
    const resolvedIds = resolveMapStagingIds(stagedIds)
    clearMapStaging()

    const assetIds = new Set([
      ...assets.uas.map((a) => a.id),
      ...assets.cuas.map((a) => a.id),
      ...assets.radars.map((a) => a.id),
      ...assets.effectors.map((a) => a.id),
    ])
    const matched = [...new Set(resolvedIds.filter((id) => assetIds.has(id)))]

    setStagingBanner({ stagedCount: stagedIds.length, matchedCount: matched.length })
    setHighlightedIds(matched)

    const firstId = matched[0]
    if (!firstId) return
    const cuas = assets.cuas.find((a) => a.id === firstId)
    if (cuas) {
      startCuasPlacement(cuas)
      return
    }
    const uas = assets.uas.find((a) => a.id === firstId)
    if (uas) {
      startUasPlacement(uas)
      return
    }
    const radar = assets.radars.find((a) => a.id === firstId)
    if (radar) {
      startRadarPlacement(radar)
      return
    }
    const effector = assets.effectors.find((a) => a.id === firstId)
    if (effector) startEffectorPlacement(effector)
  }, [searchParams, assets, startCuasPlacement, startUasPlacement, startRadarPlacement, startEffectorPlacement])

  const dismissStagingBanner = useCallback(() => {
    setStagingBanner(null)
    clearMapStaging()
  }, [])

  useEffect(() => {
    if (placedUas.length === 0 && placedCuas.length === 0) return
    const pairs = adjudication.analysis.pairs.map((p) => {
      const uas = placedUas.find((u) => u.instanceId === p.uasInstanceId)
      const cuas = placedCuas.find((c) => c.instanceId === p.cuasInstanceId)
      const rangeKm =
        uas && cuas
          ? haversineM(cuas.lat, cuas.lon, uas.lat, uas.lon) / 1000
          : undefined
      return {
        platformId: uas?.asset.id ?? '',
        systemId: cuas?.asset.id ?? '',
        uasInstanceId: p.uasInstanceId,
        cuasInstanceId: p.cuasInstanceId,
        staticPk: p.defeatMatrixPk,
        operationsPk: p.propagation ? p.blueSuccessPct : null,
        jamToSignal_db: p.propagation?.jam_to_signal_db ?? null,
        los_state: p.propagation?.los_state ?? '—',
        propagationGated: p.propagation?.propagationGated ?? false,
        rangeKm,
        uasAltitude_m: uas?.discAltitude_m,
      }
    })
    writeLaydownSession({ updatedAt: new Date().toISOString(), pairs })
  }, [adjudication.analysis, placedUas, placedCuas])

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AssetSidebar
        assets={assets}
        placedUas={placedUas}
        placedCuas={placedCuas}
        selectedLaydownItem={selectedLaydownItem}
        onSelectPlacedItem={setSelectedLaydownItem}
        placementMode={placementMode}
        highlightedIds={highlightedIds}
        onSelectUas={startUasPlacement}
        onSelectCuas={startCuasPlacement}
        onPlaceLoiter={startLoiterMode}
        onClearLoiter={clearLoiter}
        onReplanMission={replanMission}
        onClearMission={clearMission}
        onMissionEmcon={setEmcon}
        onMissionRouteObjective={setRouteObjective}
        rcsOverrides={rcsOverrides}
        onRcsChange={handleRcsChange}
        onRemoveUas={handleRemoveUas}
        onRemoveCuas={handleRemoveCuas}
        placedRadars={placedRadars}
        placedEffectors={placedEffectors}
        onSelectRadar={startRadarPlacement}
        onSelectEffector={startEffectorPlacement}
        onRemoveRadar={handleRemoveRadar}
        onRemoveEffector={handleRemoveEffector}
        overlapLegend={overlapLegend}
        overlapSource={overlapSource}
        heatmapEnabled={heatmapEnabled}
        heatmapLoading={heatmap.loading}
        heatmapError={heatmap.error}
        onToggleHeatmap={() => setHeatmapEnabled((v) => !v)}
        onOpenSpectralAnalysis={() => setSpectralOpen(true)}
      />

      <SpectralAnalysisPanel
        open={spectralOpen}
        onOpenChange={setSpectralOpen}
        placedUas={placedUas}
        placedCuas={placedCuas}
        placedRadars={placedRadars}
        placedEffectors={placedEffectors}
        threatAssessments={threatAssessments}
        catalogCuas={assets.cuas}
        overlaps={overlaps}
        analysis={adjudication.analysis}
        adjudicationSource={adjudication.source}
        fallbackReason={adjudication.fallbackReason}
        laydownEvaluation={laydownEvaluation}
        selectedLaydownItem={selectedLaydownItem}
      />

      <div className="relative flex-1 flex flex-col min-w-0">
        <PlannerToolbar
          planName={planner.planName}
          planId={planner.planId}
          saving={planner.saving}
          lastSaved={planner.lastSaved}
          error={planner.error}
          onSave={() => void planner.savePlan()}
          onNew={planner.newPlan}
          onLoadClick={() => {
            const id = window.prompt('Plan ID to load')
            if (id) void planner.loadPlan(id)
          }}
          onPublishWopr={() => void planner.publishWopr().then((id) => { if (id) window.location.href = `/arena?scenario=${id}` })}
          onPublishPcm={() => void planner.publishPcm().then((id) => { if (id) window.location.href = `/pcm/exercise/${id}` })}
        />
        {showIadsPanel && (
          <div className="absolute bottom-16 left-3 z-20 w-72 max-h-64 overflow-y-auto rounded-xl border border-zinc-700 bg-[#0A0A0F]/95 shadow-lg">
            <div className="flex justify-between items-center px-2 py-1 border-b border-zinc-800">
              <span className="text-[10px] font-mono text-cyan">IADS stacks</span>
              <button type="button" className="text-zinc-500 text-xs" onClick={() => setShowIadsPanel(false)}>✕</button>
            </div>
            <IadsStackPanel
              assets={assets}
              onApply={({ radars, effectors, cuas }) => {
                setPlacedRadars((p) => [...p, ...radars])
                setPlacedEffectors((p) => [...p, ...effectors])
                setPlacedCuas((p) => [...p, ...cuas])
              }}
            />
          </div>
        )}
        {stagingBanner && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 max-w-xl w-[calc(100%-2rem)] px-4 py-2.5 rounded-xl store-panel border-[var(--store-accent-border)] text-[11px] store-text-body flex items-start justify-between gap-3 shadow-lg">
            <span>
              AeroCopilot staged {stagingBanner.stagedCount} system
              {stagingBanner.stagedCount === 1 ? '' : 's'} — {stagingBanner.matchedCount} matched
              Map Intel asset{stagingBanner.matchedCount === 1 ? '' : 's'} (unmatched SPECTRA IDs
              stay in staging). Highlighted in sidebar.
            </span>
            <button
              type="button"
              onClick={dismissStagingBanner}
              className="store-text-muted hover:text-[var(--store-accent)] shrink-0"
              aria-label="Dismiss staging banner"
            >
              ✕
            </button>
          </div>
        )}
        {placementMode.active && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-xl store-panel-inner border-[var(--store-accent-border)] text-[11px] text-[var(--store-accent)] font-medium">
{placementMode.kind === 'mission-goal'
              ? 'Mission goal — click globe for target/AOI point · Esc to cancel'
              : placementMode.kind === 'loiter'
              ? 'Place Loiter — click globe for loiter point · Esc to cancel'
              : placementMode.kind === 'radar'
                ? `Placing radar ${placementMode.asset.name} · click terrain · Esc to cancel`
                : placementMode.kind === 'effector'
                  ? `Placing ${placementMode.asset.tierLabel} ${placementMode.asset.name} · click terrain · Esc to cancel`
                  : placementMode.kind === 'uas'
                    ? `Placing ${placementMode.asset.name} · click terrain · Esc to cancel`
                    : `Placing ${placementMode.asset.name} · click terrain · Esc to cancel`}
          </div>
        )}

        <div className="relative flex-1 min-h-0">

          <div className="absolute top-2 right-3 z-20 flex flex-wrap items-center gap-1.5 max-w-[calc(100%-1rem)] justify-end pointer-events-auto">
            <button type="button" onClick={activateBlastRisk} className={mapToolbarBtn(riskMode === 'blast', 'orange')}>Blast</button>
            <button type="button" onClick={activateJammingRisk} className={mapToolbarBtn(riskMode === 'jamming', 'cyan')}>EW Jam</button>
            <button type="button" onClick={() => { closeRiskOverlay(); setMapTool((t) => (t === 'cuas-siting' ? 'none' : 'cuas-siting')) }} className={mapToolbarBtn(mapTool === 'cuas-siting', 'cyan')}>C-UAS Siting</button>
            <button type="button" onClick={() => { closeRiskOverlay(); setMapTool((t) => (t === 'ew-deconflict' ? 'none' : 'ew-deconflict')) }} className={mapToolbarBtn(mapTool === 'ew-deconflict', 'cyan')}>EW Deconflict</button>
            <button type="button" onClick={() => setShowIadsPanel((v) => !v)} className={mapToolbarBtn(showIadsPanel, 'cyan')}>IADS</button>
            {riskMode === 'blast' && (
              <select className="text-[10px] rounded-lg bg-[#111118] border border-[#3f3f46] shadow-md px-2 py-1.5 font-mono text-zinc-100 max-w-[9rem]" value={selectedWarhead?.weapon_id ?? ''} onChange={(e) => setSelectedWarhead(WARHEAD_DB.find((w) => w.weapon_id === e.target.value) ?? null)}>
                {WARHEAD_DB.map((w) => (<option key={w.weapon_id} value={w.weapon_id}>{w.weapon_name}</option>))}
              </select>
            )}
            {riskMode === 'jamming' && (
              <select className="text-[10px] rounded-lg bg-[#111118] border border-[#3f3f46] shadow-md px-2 py-1.5 font-mono text-zinc-100 max-w-[9rem]" value={selectedJammer?.jammer_id ?? ''} onChange={(e) => setSelectedJammer(JAMMER_DB.find((j) => j.jammer_id === e.target.value) ?? null)}>
                {JAMMER_DB.map((j) => (<option key={j.jammer_id} value={j.jammer_id}>{j.jammer_name}</option>))}
              </select>
            )}
          </div>

          <CesiumMapPanel
            placedUas={placedUas}
            placedCuas={placedCuas}
            placedRadars={placedRadars}
            placedEffectors={placedEffectors}
            selectedLaydownItem={selectedLaydownItem}
            onSelectPlacedItem={setSelectedLaydownItem}
            overlaps={overlaps}
            maskingPolygons={maskingPolygons}
            heatmapCells={heatmap.cells}
            heatmapGridSteps={heatmap.gridSteps}
            heatmapJammer={heatmapJammer}
            buildingFootprints={mapBuildings.buildings}
            windByUas={windByUas}
            nilWind={nilWind}
            placementMode={placementMode}
            panelUasId={panelUas?.instanceId ?? null}
            onCesiumReady={onCesiumReady}
            onGlobeClick={handleGlobeClick}
            onCursorMove={setCursor}
            onPanelScreenPos={setPanelScreenPos}
            onTerrainHeightsResolved={handleTerrainHeightsResolved}
            onTerrainEpochChange={setTerrainEpoch}
            setPlacedUas={setPlacedUas}
            setPlacedCuas={setPlacedCuas}
            onPlatformContextMenu={setPlatformContextMenu}
            onWaypointContextMenu={setWaypointContextMenu}
          />

          {platformContextMenu && (
            <PlatformContextMenu
              target={platformContextMenu}
              onAdd={() =>
                duplicateAdjacent(platformContextMenu.kind, platformContextMenu.instanceId)
              }
              onClose={() => setPlatformContextMenu(null)}
            />
          )}


        {heatmapEnabled && !heatmap.loading && (
          <div
            className={cn(
              'absolute top-12 left-3 z-20 max-w-sm px-3 py-2 rounded-xl store-panel border text-[10px] font-mono shadow-lg pointer-events-none',
              heatmap.error
                ? 'border-amber/40 text-amber'
                : 'border-cyan/30 text-cyan',
            )}
          >
            {heatmap.error
              ? heatmap.error
              : !placedCuas.some((c) => c.asset.defeat_methods.includes('RF_jamming'))
                ? 'No jammer with RF band placed — place C-UAS with RF jamming'
                : heatmap.cells.length === 0
                  ? 'Jam heatmap — no coverage cells returned'
                  : `Jam coverage heatmap — ${heatmap.cells.length} cells around ${heatmapJammer?.asset.name ?? 'jammer'}`}
          </div>
        )}

          <MapNavigationWheel getCesium={getCesium} />

          <LaydownEvaluationPanel
            evaluation={laydownEvaluation}
            placedItems={placedLaydownChips}
            selectedItem={selectedLaydownItem}
            onSelectItem={setSelectedLaydownItem}
            onAddCatalogItem={handleAddFromEvaluation}
            adjudicationSource={adjudication.source}
          />

          {pendingMissionUas && (
            <MissionGoalDialog
              uas={pendingMissionUas}
              onSelect={(kind) => { startMissionGoal(pendingMissionUas, kind); setPendingMissionUasId(null) }}
              onDismiss={() => setPendingMissionUasId(null)}
            />
          )}

          {waypointContextMenu && (
            <WaypointContextMenu
              target={waypointContextMenu}
              onApply={(patch) => updateWaypoint(waypointContextMenu.uasInstanceId, waypointContextMenu.waypointId, patch)}
              onClose={() => setWaypointContextMenu(null)}
            />
          )}


          {riskMode !== 'none' && (
            <CollateralRiskPanel
              mode={riskMode}
              blastResult={cdeResult}
              jammingRadii={selectedJammer}
              weaponName={selectedWarhead?.weapon_name}
              jammerName={selectedJammer?.jammer_name}
              popTier={riskPopTier}
              timeOfDay={riskTimeOfDay}
              buildingProtection={riskProtection}
              onPopTierChange={setRiskPopTier}
              onTimeChange={setRiskTimeOfDay}
              onProtectionChange={setRiskProtection}
              ringShade={riskRingShade}
              onRingShadeChange={setRiskRingShade}
              onClose={closeRiskOverlay}
            />
          )}
          {mapTool === 'cuas-siting' && (
            <CuasSitingPlanner placedUas={placedUas} placedCuas={placedCuas} onClose={() => setMapTool('none')} />
          )}
          {mapTool === 'ew-deconflict' && (
            <EwFootprintAnalyser placedUas={placedUas} placedCuas={placedCuas} emitterLon={cursor.lon} emitterLat={cursor.lat} onClose={() => setMapTool('none')} />
          )}

          {panelUas && panelScreenPos && (
            <EntityInfoPanel
              uas={panelUas}
              screenX={panelScreenPos.x}
              screenY={panelScreenPos.y}
              onClose={() => closePanel(panelUas.instanceId)}
            />
          )}
        </div>

        <MapBottomBar
          cursor={cursor}
          nilWind={nilWind}
          windLoading={windLoading}
          onNilWindChange={setNilWind}
          onClearAll={handleClearAll}
        />
      </div>
    </div>
  )
}
